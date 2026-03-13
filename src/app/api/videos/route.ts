import {
  readVideoRegistry,
  isRegistryEnabled,
} from "@/lib/videoRegistry";
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

/** Try shelbynet indexer first (if available), then testnet. */
function getIndexerOrder(): string[] {
  const custom = process.env.NEXT_PUBLIC_SHELBY_INDEXER_URL;
  if (custom) return [custom];
  return [SHELBYNET_INDEXER, TESTNET_INDEXER];
}

/** Shelby indexer + optional registry. Testnet indexer may not return data; ENABLE_VIDEO_REGISTRY=true enables file-based registry as a fallback. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const owner = searchParams.get("owner")?.trim() || undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 48, 100);

  const apiKey =
    process.env.NEXT_PUBLIC_SHELBYNET_API_KEY?.trim() ||
    process.env.SHELBYNET_API_KEY?.trim();

  const where: Record<string, unknown> = {
    blob_name: { _like: "%.mp4" },
  };
  if (owner) where.owner = { _eq: owner };
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    where._and = [{ blob_name: { _ilike: q } }];
  }
  const whereWithDeleted = { ...where, is_deleted: { _eq: "0" } };

  let blobs: BlobRow[] = [];
  const indexers = getIndexerOrder();

  if (apiKey) {
    for (const indexerUrl of indexers) {
      try {
        blobs = await fetchFromIndexer(
          indexerUrl,
          apiKey,
          whereWithDeleted,
          limit
        );
        if (blobs.length > 0) break;
      } catch {
        try {
          blobs = await fetchFromIndexer(indexerUrl, apiKey, where, limit);
          if (blobs.length > 0) break;
        } catch {
          // Sonraki indexer'ı dene
        }
      }
    }
  }

  let fromIndexer = blobs.map((b) => ({
    name: b.blob_name,
    url: `${SHELBY_BLOB_BASE}/${encodeURIComponent(b.owner)}/${encodeURIComponent(b.blob_name)}`,
    storageAccount: b.owner,
    uploadedAt: b.created_at,
  }));

  if (isRegistryEnabled()) {
    const fromRegistry = await readVideoRegistry();
    const byKey = new Map<string, (typeof fromIndexer)[0]>();
    for (const v of fromIndexer) byKey.set(`${v.storageAccount}\n${v.name}`, v);
    for (const v of fromRegistry) {
      const key = `${v.storageAccount}\n${v.name}`;
      if (!byKey.has(key)) byKey.set(key, v as (typeof fromIndexer)[0]);
    }
    fromIndexer = Array.from(byKey.values());
  }

  let videos = fromIndexer.sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  if (search) {
    const q = search.toLowerCase();
    videos = videos.filter((v) => v.name.toLowerCase().includes(q));
  }

  return NextResponse.json(videos);
}

/** Sadece ENABLE_VIDEO_REGISTRY=true ise videoyu kayda ekler (gizli sekme için). */
export async function POST(request: Request) {
  if (!isRegistryEnabled()) {
    return NextResponse.json({ ok: false, reason: "registry_disabled" }, { status: 200 });
  }
  try {
    const body = await request.json();
    const { storageAccount, name, url, uploadedAt } = body as {
      storageAccount?: string;
      name?: string;
      url?: string;
      uploadedAt?: string;
    };
    if (
      !storageAccount ||
      !name ||
      !url ||
      typeof storageAccount !== "string" ||
      typeof name !== "string" ||
      typeof url !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing storageAccount, name, or url" },
        { status: 400 }
      );
    }
    const { appendVideoToRegistry } = await import("@/lib/videoRegistry");
    await appendVideoToRegistry({
      storageAccount,
      name,
      url,
      uploadedAt:
        typeof uploadedAt === "string" ? uploadedAt : new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/videos", e);
    return NextResponse.json(
      { error: "Failed to register video" },
      { status: 500 }
    );
  }
}
