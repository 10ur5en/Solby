export const VIDEO_CATEGORIES = [
  "trending",
  "music",
  "education",
  "gaming",
  "tech",
  "blockchain",
  "entertainment",
  "other",
] as const;

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export interface VideoEntry {
  name: string;
  url: string;
  storageAccount: string;
  uploadedAt: string; // ISO
  category?: VideoCategory;
  hidden?: boolean;
}

const STORAGE_KEY = "shelby-player-videos";
const VIEW_COUNT_KEY = "shelby-player-view-counts";

const SHELBY_BLOB_BASE =
  "https://api.testnet.shelby.xyz/shelby/v1/blobs";

function videoKey(storageAccount: string, name: string): string {
  return `${storageAccount}\n${name}`;
}

export function getViewCount(storageAccount: string, name: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(VIEW_COUNT_KEY);
    if (!raw) return 0;
    const map: Record<string, number> = JSON.parse(raw);
    return map[videoKey(storageAccount, name)] ?? 0;
  } catch {
    return 0;
  }
}

export function incrementViewCount(storageAccount: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(VIEW_COUNT_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const key = videoKey(storageAccount, name);
    map[key] = (map[key] ?? 0) + 1;
    localStorage.setItem(VIEW_COUNT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getAllViewCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIEW_COUNT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getStoredVideos(storageAccount: string | null): VideoEntry[] {
  if (typeof window === "undefined" || !storageAccount) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: Record<string, VideoEntry[]> = JSON.parse(raw);
    return all[storageAccount] ?? [];
  } catch {
    return [];
  }
}

export function addStoredVideo(
  storageAccount: string,
  entry: Omit<VideoEntry, "uploadedAt"> & { uploadedAt?: Date }
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, VideoEntry[]> = raw ? JSON.parse(raw) : {};
    const list = all[storageAccount] ?? [];
    const newEntry: VideoEntry = {
      ...entry,
      uploadedAt:
        entry.uploadedAt?.toISOString() ?? new Date().toISOString(),
    };
    all[storageAccount] = [newEntry, ...list];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function hasStoredVideo(
  storageAccount: string,
  name: string
): boolean {
  const list = getStoredVideos(storageAccount);
  return list.some((v) => v.name === name);
}

export function getAllStoredVideos(): VideoEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: Record<string, VideoEntry[]> = JSON.parse(raw);
    return Object.values(all).flat().sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } catch {
    return [];
  }
}

export function setVideoHidden(
  storageAccount: string,
  name: string,
  hidden: boolean
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, VideoEntry[]> = raw ? JSON.parse(raw) : {};
    const list = all[storageAccount] ?? [];
    const idx = list.findIndex((v) => v.name === name);
    if (idx < 0) return;
    list[idx] = { ...list[idx], hidden };
    all[storageAccount] = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function getVideosByCategory(category: VideoCategory | null): VideoEntry[] {
  const all = getAllStoredVideos().filter((v) => !v.hidden);
  return filterAndSortForCategory(all, category ?? "trending", getAllViewCounts());
}

/** Merge indexer + localStorage lists (indexer has priority on conflicts). */
export function mergeVideoLists(
  indexerList: VideoEntry[],
  localList: VideoEntry[]
): VideoEntry[] {
  const byKey = new Map<string, VideoEntry>();
  for (const v of indexerList) {
    byKey.set(videoKey(v.storageAccount, v.name), v);
  }
  for (const v of localList) {
    const key = videoKey(v.storageAccount, v.name);
    if (!byKey.has(key)) byKey.set(key, v);
  }
  return Array.from(byKey.values());
}

/** Filter and sort list by category (trending: views + date, others: category + date). */
export function filterAndSortForCategory(
  list: VideoEntry[],
  category: VideoCategory,
  viewCounts: Record<string, number>
): VideoEntry[] {
  const filtered =
    !category || category === "trending"
      ? list
      : list.filter((v) => (v.category || "other") === category);
  if (!category || category === "trending") {
    return [...filtered].sort((a, b) => {
      const keyA = videoKey(a.storageAccount, a.name);
      const keyB = videoKey(b.storageAccount, b.name);
      const viewsA = viewCounts[keyA] ?? 0;
      const viewsB = viewCounts[keyB] ?? 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }
  return [...filtered].sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

/** From the browser, use our own API route instead of calling the indexer directly (CORS + testnet/shelbynet fallback). */
async function fetchVideosFromApi(options: {
  search?: string;
  owner?: string | null;
  limit?: number;
}): Promise<VideoEntry[]> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.owner) params.set("owner", options.owner);
  params.set("limit", String(options.limit ?? 48));
  const res = await fetch(`/api/videos?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to fetch videos");
  }
  return res.json() as Promise<VideoEntry[]>;
}

export async function fetchVideosFromShelby(options: {
  category?: VideoCategory | null;
  search?: string;
  owner?: string | null;
  limit?: number;
}): Promise<VideoEntry[]> {
  const { category, search, owner, limit = 48 } = options;

  if (typeof window === "undefined") return [];

  try {
    const videos = await fetchVideosFromApi({ search, owner, limit });
    if (!category || category === "trending") return videos;
    return videos;
  } catch {
    return [];
  }
}
