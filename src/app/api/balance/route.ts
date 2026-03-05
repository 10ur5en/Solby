import { NextResponse } from "next/server";

const APT_COIN_TYPE = "0x1::aptos_coin::AptosCoin";

const SHELBYNET_BASES = [
  "https://api.shelbynet.shelby.xyz/v1",
  "https://api.shelbynet.aptoslabs.com/v1",
] as const;

/** Shelbynet Indexer GraphQL (Explorer bakiyeyi buradan alıyor). */
const SHELBYNET_GRAPHQL = "https://api.shelbynet.shelby.xyz/v1/graphql";

const GET_FUNGIBLE_BALANCES = `
  query getCurrentFungibleAssetBalances($where_condition: current_fungible_asset_balances_bool_exp, $offset: Int, $limit: Int) {
    current_fungible_asset_balances(where: $where_condition, offset: $offset, limit: $limit) {
      amount
      asset_type
    }
  }
`;

/** Aptos adresi: trim, küçük harf, 0x öneki (uzunluk değiştirilmez). */
function normalizeAptosAddress(addr: string): string {
  const s = addr.trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

type CoinStoreResource = {
  type: string;
  data?: {
    coin?: { value?: string };
    balance?: string;
    value?: string;
    available?: string;
    [key: string]: unknown;
  };
};

function parseBalanceFromResponse(text: string, contentType: string): string {
  let balance = "0";
  if (contentType.includes("application/json") && text) {
    try {
      const json = JSON.parse(text) as
        | { balance?: string; amount?: string; value?: string }
        | string;
      if (typeof json === "string") balance = json;
      else if (json && typeof json === "object")
        balance = String(
          json.balance ?? json.amount ?? (json as { value?: string }).value ?? "0"
        );
    } catch {
      balance = text.trim() || "0";
    }
  } else {
    balance = text.trim() || "0";
  }
  return balance;
}

function extractBalanceFromResource(r: CoinStoreResource): string | null {
  if (!r.data) return null;
  const d = r.data;
  const raw =
    d.coin?.value ?? d.balance ?? d.value ?? d.available;
  if (raw == null) return null;
  try {
    const n = BigInt(raw);
    return n.toString();
  } catch {
    return null;
  }
}

async function getResourcesBalance(
  base: string,
  addr: string
): Promise<string> {
  const resourcesUrl = `${base}/accounts/${encodeURIComponent(addr)}/resources`;
  const resRes = await fetch(resourcesUrl);
  if (!resRes.ok) return "0";
  const body = await resRes.json();
  const resources = Array.isArray(body) ? body : (body.resources ?? body.data ?? []);
  if (!Array.isArray(resources)) return "0";
  let total = 0n;
  for (const r of resources as CoinStoreResource[]) {
    const type = r.type ?? "";
    const isBalanceResource =
      type.includes("CoinStore") ||
      type.includes("FungibleAsset") ||
      type.includes("::coin::") ||
      type.includes("fungible_asset");
    if (isBalanceResource) {
      const val = extractBalanceFromResource(r);
      if (val != null) total += BigInt(val);
    }
  }
  return total.toString();
}

const APT_ASSET_TYPE = "0x1::aptos_coin::AptosCoin";
const DECIMALS = 8;

type IndexerBalanceRow = { amount: string | number; asset_type?: string };

function parseAmount(v: string | number): bigint {
  try {
    return BigInt(v);
  } catch {
    const f = parseFloat(String(v));
    return Number.isNaN(f) || f <= 0 ? 0n : BigInt(Math.floor(f * 10 ** DECIMALS));
  }
}

/** Shelbynet Indexer GraphQL ile APT ve ShelbyUSD ayrı ayrı döner. */
async function getBalanceFromIndexer(addr: string): Promise<{
  balance: string;
  apt: string;
  shelbyUsd: string;
} | null> {
  try {
    const res = await fetch(SHELBYNET_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: GET_FUNGIBLE_BALANCES,
        variables: {
          where_condition: { owner_address: { _eq: addr } },
          offset: 0,
          limit: 100,
        },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { current_fungible_asset_balances?: IndexerBalanceRow[] };
      errors?: unknown[];
    };
    if (json.errors?.length || !json.data?.current_fungible_asset_balances) return null;
    const rows = json.data.current_fungible_asset_balances;
    let apt = 0n;
    let shelbyUsd = 0n;
    for (const row of rows) {
      if (row.amount == null) continue;
      const amount = parseAmount(row.amount);
      const type = (row.asset_type ?? "").toLowerCase();
      if (type.includes("aptos_coin::aptoscoin")) apt += amount;
      else shelbyUsd += amount;
    }
    const total = apt + shelbyUsd;
    return total > 0n
      ? { balance: total.toString(), apt: apt.toString(), shelbyUsd: shelbyUsd.toString() }
      : null;
  } catch {
    return null;
  }
}

async function tryBalanceFromBase(
  base: string,
  addr: string
): Promise<{ balance: string; source: string } | { error: string; status: number }> {
  const balanceUrl = `${base}/accounts/${encodeURIComponent(addr)}/balance/${encodeURIComponent(APT_COIN_TYPE)}`;
  const res = await fetch(balanceUrl);
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (res.ok) {
    const aptBalance = parseBalanceFromResponse(text, contentType);
    const aptVal = BigInt(aptBalance);
    if (aptVal > 0n) return { balance: aptBalance, source: "balance" };
    const resourcesBalance = await getResourcesBalance(base, addr);
    if (BigInt(resourcesBalance) > 0n)
      return { balance: resourcesBalance, source: "resources" };
    return { balance: aptBalance, source: "balance" };
  }

  if (res.status === 404 || res.status >= 500) {
    const resourcesBalance = await getResourcesBalance(base, addr);
    if (BigInt(resourcesBalance) > 0n)
      return { balance: resourcesBalance, source: "resources" };
  }

  return { error: text?.slice(0, 200) || res.statusText, status: res.status };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address?.trim()) {
    return NextResponse.json(
      { error: "address required" },
      { status: 400 }
    );
  }

  const addr = normalizeAptosAddress(address.trim());

  try {
    // Önce Indexer'dan al (APT + ShelbyUSD ayrı)
    const indexerResult = await getBalanceFromIndexer(addr);
    if (indexerResult && BigInt(indexerResult.balance) > 0n) {
      return NextResponse.json({
        balance: indexerResult.balance,
        apt: indexerResult.apt,
        shelbyUsd: indexerResult.shelbyUsd,
      });
    }

    for (const base of SHELBYNET_BASES) {
      const result = await tryBalanceFromBase(base, addr);
      if ("balance" in result && BigInt(result.balance) > 0n) {
        return NextResponse.json({
          balance: result.balance,
          apt: result.balance,
          shelbyUsd: "0",
        });
      }
    }

    return NextResponse.json({
      balance: "0",
      apt: "0",
      shelbyUsd: "0",
      error: "Failed to load balance",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { balance: "0", apt: "0", shelbyUsd: "0", error: message },
      { status: 500 }
    );
  }
}
