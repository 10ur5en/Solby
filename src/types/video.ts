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
  if (!category || category === "trending") {
    const viewCounts = getAllViewCounts();
    return [...all].sort((a, b) => {
      const keyA = videoKey(a.storageAccount, a.name);
      const keyB = videoKey(b.storageAccount, b.name);
      const viewsA = viewCounts[keyA] ?? 0;
      const viewsB = viewCounts[keyB] ?? 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }
  return all.filter((v) => (v.category || "other") === category);
}
