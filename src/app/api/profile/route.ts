import { NextResponse } from "next/server";

const SHELBY_BLOB_BASE = "https://api.testnet.shelby.xyz/shelby/v1/blobs";
const TESTNET_INDEXER = "https://api.testnet.shelby.xyz/v1/graphql";
const SHELBYNET_INDEXER = "https://api.shelbynet.shelby.xyz/v1/graphql";

const BROWSE_QUERY = `
  query BrowseBlobs($where: blobs_bool_exp!, $limit: Int!) {
    blobs(
      where: $where
      order_by: { created_at: desc }
      limit: $limit
    ) {
      owner
      blob_name
      created_at
    }
  }
`;

type BlobRow = { owner: string; blob_name: string; created_at: string };

async function fetchFromIndexer(
  indexerUrl: string,
  apiKey: string,
  where: Record<string, unknown>,
  limit: number
): Promise<BlobRow[]> {
  const res = await fetch(indexerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: BROWSE_QUERY,
      variables: { where, limit },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Indexer returned ${res.status}: ${text.slice(0, 200)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Indexer response is not JSON");
  }

  const obj = json as { errors?: Array<{ message?: string }>; data?: { blobs?: BlobRow[] } };
  if (obj.errors?.length) {
    throw new Error(obj.errors[0].message || "GraphQL error");
  }

  const blobs = obj.data?.blobs;
  return Array.isArray(blobs) ? blobs : [];
}

function getIndexerOrder(): string[] {
  const custom = process.env.NEXT_PUBLIC_SHELBY_INDEXER_URL;
  if (custom) return [custom];
  return [SHELBYNET_INDEXER, TESTNET_INDEXER];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner")?.trim();
  if (!owner) {
    return NextResponse.json({ error: "Missing owner" }, { status: 400 });
  }

  const apiKey =
    process.env.NEXT_PUBLIC_SHELBYNET_API_KEY?.trim() ||
    process.env.SHELBYNET_API_KEY?.trim();

  let latestBlob: BlobRow | null = null;

  if (apiKey) {
    const whereBase: Record<string, unknown> = {
      owner: { _eq: owner },
      blob_name: { _like: "profile-%" },
    };
    const whereWithDeleted = { ...whereBase, is_deleted: { _eq: "0" } };
    const indexers = getIndexerOrder();

    for (const indexerUrl of indexers) {
      try {
        const blobs = await fetchFromIndexer(indexerUrl, apiKey, whereWithDeleted, 5);
        if (blobs.length > 0) {
          latestBlob = blobs[0];
          break;
        }
      } catch {
        try {
          const blobs = await fetchFromIndexer(indexerUrl, apiKey, whereBase, 5);
          if (blobs.length > 0) {
            latestBlob = blobs[0];
            break;
          }
        } catch {
          // try next indexer
        }
      }
    }
  }

  // If indexer cannot find any profile-* blob, fall back to legacy profile.json
  const blobName =
    latestBlob?.blob_name ?? "profile.json";

  const url = `${SHELBY_BLOB_BASE}/${encodeURIComponent(owner)}/${encodeURIComponent(
    blobName
  )}?t=${Date.now()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }
    const raw = await res.json();
    if (!raw || typeof raw.channelName !== "string") {
      return NextResponse.json({ profile: null }, { status: 200 });
    }
    const profile = {
      channelName: String(raw.channelName),
    };
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: null }, { status: 200 });
  }
}

