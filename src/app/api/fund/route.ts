import { NextResponse } from "next/server";

const SHELBY_USD_FAUCET =
  "https://faucet.shelbynet.shelby.xyz/fund?asset=shelbyusd";

function normalizeAptosAddress(addr: string): string {
  const s = addr.trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, amount } = body as { address?: string; amount?: number };

    if (!address || typeof amount !== "number") {
      return NextResponse.json(
        { error: "address and amount required" },
        { status: 400 }
      );
    }

    const normalizedAddress = normalizeAptosAddress(address);

    const apiKey =
      process.env.NEXT_PUBLIC_SHELBYNET_API_KEY?.trim() ||
      process.env.SHELBYNET_API_KEY?.trim();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(SHELBY_USD_FAUCET, {
      method: "POST",
      body: JSON.stringify({ address: normalizedAddress, amount }),
      headers,
    });

    const text = await response.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      if (!response.ok) {
        return NextResponse.json(
          { error: text || response.statusText },
          { status: response.status }
        );
      }
      return NextResponse.json(
        { error: "Invalid faucet response" },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const err = json as { message?: string; error?: string };
      return NextResponse.json(
        { error: err.message ?? err.error ?? text ?? response.statusText },
        { status: response.status }
      );
    }

    return NextResponse.json(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
