export interface ProfileData {
  channelName: string;
  avatarBlobName?: string;
  /** X (Twitter) kullanıcı adı, @ olmadan (örn: "elonmusk") */
  xHandle?: string;
}

const SHELBY_BLOB_BASE =
  "https://api.shelbynet.shelby.xyz/shelby/v1/blobs";
const PROFILE_BLOB_NAME = "profile.json";

export function getProfileBlobUrl(storageAccount: string): string {
  return `${SHELBY_BLOB_BASE}/${encodeURIComponent(storageAccount)}/${PROFILE_BLOB_NAME}`;
}

export function getAvatarUrl(
  storageAccount: string,
  avatarBlobName: string
): string {
  return `${SHELBY_BLOB_BASE}/${encodeURIComponent(storageAccount)}/${encodeURIComponent(avatarBlobName)}`;
}

export async function fetchProfile(
  storageAccount: string
): Promise<ProfileData | null> {
  const url = getProfileBlobUrl(storageAccount);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as ProfileData;
    if (!data || typeof data.channelName !== "string") return null;
    const xHandle =
      typeof data.xHandle === "string" && data.xHandle.trim()
        ? data.xHandle.trim().replace(/^@/, "")
        : undefined;
    return { ...data, xHandle: xHandle || undefined };
  } catch {
    return null;
  }
}
