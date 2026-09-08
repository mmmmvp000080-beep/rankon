import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const STORAGE_ROOT = process.env.STORAGE_ROOT || "./storage";

export type StorageCategory = "uploads" | "signatures" | "pdfs" | "settings";

function resolveStorageRoot(): string {
  return path.isAbsolute(STORAGE_ROOT)
    ? STORAGE_ROOT
    : path.join(process.cwd(), STORAGE_ROOT);
}

export function getStorageDir(category: StorageCategory): string {
  return path.join(resolveStorageRoot(), category);
}

export async function ensureStorageDirs(): Promise<void> {
  const categories: StorageCategory[] = ["uploads", "signatures", "pdfs", "settings"];
  for (const cat of categories) {
    await fs.mkdir(getStorageDir(cat), { recursive: true });
  }
}

export function sanitizeRelativePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid path");
  }
  return normalized;
}

export function resolveStoragePath(relativePath: string): string {
  const safe = sanitizeRelativePath(relativePath);
  const full = path.join(resolveStorageRoot(), safe);
  const root = resolveStorageRoot();
  if (!full.startsWith(root)) {
    throw new Error("Path traversal detected");
  }
  return full;
}

export async function saveFile(
  category: StorageCategory,
  buffer: Buffer,
  extension: string
): Promise<{ storedName: string; storagePath: string }> {
  await ensureStorageDirs();
  const storedName = `${uuidv4()}${extension.startsWith(".") ? extension : `.${extension}`}`;
  const relativePath = path.join(category, storedName);
  const fullPath = resolveStoragePath(relativePath);
  await fs.writeFile(fullPath, buffer);
  return { storedName, storagePath: relativePath.replace(/\\/g, "/") };
}

export async function saveSignatureFromDataUrl(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) throw new Error("Invalid signature image");
  const buffer = Buffer.from(match[1], "base64");
  const { storagePath } = await saveFile("signatures", buffer, ".png");
  return storagePath;
}

export async function readFile(relativePath: string): Promise<Buffer> {
  const fullPath = resolveStoragePath(relativePath);
  return fs.readFile(fullPath);
}

export async function deleteFile(relativePath: string): Promise<void> {
  try {
    const fullPath = resolveStoragePath(relativePath);
    await fs.unlink(fullPath);
  } catch {
    // ignore missing files
  }
}

export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const fullPath = resolveStoragePath(relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export interface StorageAdapter {
  save(category: StorageCategory, buffer: Buffer, extension: string): Promise<{ storedName: string; storagePath: string }>;
  read(relativePath: string): Promise<Buffer>;
  delete(relativePath: string): Promise<void>;
  exists(relativePath: string): Promise<boolean>;
}

export const localStorageAdapter: StorageAdapter = {
  save: saveFile,
  read: readFile,
  delete: deleteFile,
  exists: fileExists,
};

export const storage = localStorageAdapter;
