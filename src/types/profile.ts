export interface ProfileData {
  channelName: string;
  avatarBlobName?: string;
  /** X (Twitter) username without @ (e.g. "elonmusk") */
  xHandle?: string;
}

const SHELBY_BLOB_BASE =
  "https://api.testnet.shelby.xyz/shelby/v1/blobs";
const PROFILE_BLOB_NAME_LEGACY = "profile.json";
const PROFILE_BLOB_KEY_PREFIX = "shelby_profile_blob_";
const PROFILE_DATA_KEY_PREFIX = "shelby_profile_data_";

export function getProfileBlobUrl(
  storageAccount: string,
  blobName: string = PROFILE_BLOB_NAME_LEGACY
): string {
  return `${SHELBY_BLOB_BASE}/${encodeURIComponent(storageAccount)}/${encodeURIComponent(blobName)}`;
}

export function getLatestProfileBlobName(storageAccount: string): string {
  if (typeof window === "undefined") return PROFILE_BLOB_NAME_LEGACY;
  return (
    window.localStorage.getItem(PROFILE_BLOB_KEY_PREFIX + storageAccount) ||
    PROFILE_BLOB_NAME_LEGACY
  );
}

export function setLatestProfileBlobName(
  storageAccount: string,
  blobName: string
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_BLOB_KEY_PREFIX + storageAccount, blobName);
}

export function getLocalProfileData(storageAccount: string): ProfileData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_DATA_KEY_PREFIX + storageAccount);
    if (!raw) return null;
    const data = JSON.parse(raw) as ProfileData;
    if (!data || typeof data.channelName !== "string") return null;
    return { channelName: data.channelName };
  } catch {
    return null;
  }
}

export function setLocalProfileData(
  storageAccount: string,
  profile: ProfileData
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PROFILE_DATA_KEY_PREFIX + storageAccount,
      JSON.stringify({ channelName: profile.channelName })
    );
  } catch {
    // ignore
  }
}

export function getAvatarUrl(
  storageAccount: string,
  avatarBlobName: string
): string {
  return `${SHELBY_BLOB_BASE}/${encodeURIComponent(storageAccount)}/${encodeURIComponent(avatarBlobName)}`;
}

export async function fetchProfile(storageAccount: string): Promise<ProfileData | null> {
  // 1) First check the local cache in the browser (channelName only)
  const local = getLocalProfileData(storageAccount);
  if (local) return local;

  // 2) Lokal cache yoksa Shelby'den son profil blob'unu dene
  const blobName = getLatestProfileBlobName(storageAccount);
  const url = `${getProfileBlobUrl(storageAccount, blobName)}?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as ProfileData;
    if (!data || typeof data.channelName !== "string") return null;
    return { channelName: data.channelName };
  } catch {
    return null;
  }
}
