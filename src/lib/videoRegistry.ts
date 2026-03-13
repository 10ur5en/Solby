/**
 * Optional: when ENABLE_VIDEO_REGISTRY=true, keep a simple JSON registry of uploads on disk.
 * This is mainly a fallback for cases where the Shelby testnet indexer does not return data,
 * so uploads can still be listed from the server across devices (including incognito).
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export type RegistryEntry = {
  storageAccount: string;
  name: string;
  url: string;
  uploadedAt: string;
};

const REGISTRY_DIR = "data";
const REGISTRY_FILE = "video-registry.json";

function getRegistryPath(): string {
  return join(process.cwd(), REGISTRY_DIR, REGISTRY_FILE);
}

export function isRegistryEnabled(): boolean {
  return process.env.ENABLE_VIDEO_REGISTRY === "true";
}

export async function readVideoRegistry(): Promise<RegistryEntry[]> {
  if (!isRegistryEnabled()) return [];
  try {
    const path = getRegistryPath();
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function appendVideoToRegistry(entry: RegistryEntry): Promise<void> {
  if (!isRegistryEnabled()) return;
  try {
    const path = getRegistryPath();
    const dir = join(process.cwd(), REGISTRY_DIR);
    await mkdir(dir, { recursive: true });
    const list = await readVideoRegistry();
    const key = `${entry.storageAccount}\n${entry.name}`;
    if (list.some((e) => `${e.storageAccount}\n${e.name}` === key)) return;
    list.push(entry);
    await writeFile(path, JSON.stringify(list, null, 0), "utf-8");
  } catch {
    // ignore
  }
}
