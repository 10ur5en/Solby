const VIDEO_KEY_PREFIX = "shelby_video_key_";

function toBase64(bytes: Uint8Array): string {
  if (typeof window === "undefined") return "";
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptVideoBytes(plain: ArrayBuffer): Promise<{
  cipher: Uint8Array;
  keyB64: string;
  ivB64: string;
}> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("WebCrypto not available for encryption");
  }
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const rawKey = new Uint8Array(await window.crypto.subtle.exportKey("raw", key));
  return {
    cipher: new Uint8Array(cipherBuf),
    keyB64: toBase64(rawKey),
    ivB64: toBase64(iv),
  };
}

export async function decryptVideoBytes(
  cipher: ArrayBuffer,
  keyB64: string,
  ivB64: string
): Promise<Uint8Array> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("WebCrypto not available for decryption");
  }
  const rawKey = fromBase64(keyB64);
  const ivBuf = fromBase64(ivB64);
  const iv = new Uint8Array(ivBuf);
  const key = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const plainBuf = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new Uint8Array(plainBuf);
}

export function saveVideoKey(
  storageAccount: string,
  name: string,
  keyB64: string,
  ivB64: string
): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ keyB64, ivB64 });
    window.localStorage.setItem(
      `${VIDEO_KEY_PREFIX}${storageAccount}\n${name}`,
      payload
    );
  } catch {
    // ignore
  }
}

export function loadVideoKey(
  storageAccount: string,
  name: string
): { keyB64: string; ivB64: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      `${VIDEO_KEY_PREFIX}${storageAccount}\n${name}`
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { keyB64?: string; ivB64?: string };
    if (!parsed.keyB64 || !parsed.ivB64) return null;
    return { keyB64: parsed.keyB64, ivB64: parsed.ivB64 };
  } catch {
    return null;
  }
}

