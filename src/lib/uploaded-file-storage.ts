import path from "path";
import { del, get, put } from "@vercel/blob";
import { storage } from "@/lib/storage";
import { logApiError, logStep } from "@/lib/api-error-log";

export function normalizeBlobIdentifier(storagePath: string): string | null {
  if (!storagePath) return null;

  if (storagePath.startsWith("contracts/")) {
    return storagePath;
  }

  if (storagePath.startsWith("https://") && storagePath.includes("blob.vercel-storage.com")) {
    try {
      const url = new URL(storagePath);
      const pathname = decodeURIComponent(url.pathname.replace(/^\//, ""));
      return pathname || null;
    } catch {
      return null;
    }
  }

  return null;
}

export function isBlobStoragePath(storagePath: string): boolean {
  return normalizeBlobIdentifier(storagePath) !== null;
}

export function isLocalStoragePath(storagePath: string): boolean {
  return !isBlobStoragePath(storagePath);
}

export function sanitizeUploadFileName(fileName: string): string {
  const base = path
    .basename(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "");
  return (base || "file").slice(0, 180);
}

export function buildBlobObjectPath(contractId: string, originalName: string): string {
  const safe = sanitizeUploadFileName(originalName);
  return `contracts/${contractId}/${Date.now()}-${safe}`;
}

export class UploadedFileStorageError extends Error {
  constructor(
    message: string,
    readonly code: "MISSING_BLOB_TOKEN" | "UPLOAD_FAILED"
  ) {
    super(message);
    this.name = "UploadedFileStorageError";
  }
}

function blobAccessMode(): "public" | "private" {
  return process.env.BLOB_ACCESS === "private" ? "private" : "public";
}

export async function saveUploadedFile(
  contractId: string,
  file: File,
  buffer: Buffer
): Promise<{ storedName: string; storagePath: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const ext = path.extname(file.name).toLowerCase();
  const context = {
    contractId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    access: blobAccessMode(),
    hasToken: !!token,
    vercel: process.env.VERCEL === "1",
  };

  if (token) {
    const objectPath = buildBlobObjectPath(contractId, file.name);
    const access = blobAccessMode();
    logStep("Customer File Upload", "Blob put", "START", { ...context, objectPath, access });
    try {
      await put(objectPath, buffer, {
        access,
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      logStep("Customer File Upload", "Blob put", "SUCCESS", {
        ...context,
        storagePath: objectPath,
      });
      return {
        storedName: path.basename(objectPath),
        storagePath: objectPath,
      };
    } catch (err) {
      logStep("Customer File Upload", "Blob put", "FAIL", context);
      logApiError("Customer File Upload Blob put", err, context);
      throw new UploadedFileStorageError(
        "파일 업로드 중 오류가 발생했습니다",
        "UPLOAD_FAILED"
      );
    }
  }

  if (process.env.VERCEL === "1") {
    logStep("Customer File Upload", "Blob put", "FAIL", {
      ...context,
      reason: "BLOB_READ_WRITE_TOKEN is not configured",
    });
    throw new UploadedFileStorageError(
      "파일 업로드 중 오류가 발생했습니다",
      "MISSING_BLOB_TOKEN"
    );
  }

  logStep("Customer File Upload", "Local storage save", "START", context);
  const saved = await storage.save("uploads", buffer, ext);
  logStep("Customer File Upload", "Local storage save", "SUCCESS", saved);
  return saved;
}

export async function readPrivateBlobStream(storagePath: string) {
  const identifier = normalizeBlobIdentifier(storagePath);
  if (!identifier) return null;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const result = await get(identifier, {
    access: blobAccessMode(),
    token,
  });

  if (!result?.stream) return null;
  return result;
}

export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  const blobResult = await readPrivateBlobStream(storagePath);
  if (blobResult?.stream) {
    return Buffer.from(await new Response(blobResult.stream).arrayBuffer());
  }
  return storage.read(storagePath);
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  const identifier = normalizeBlobIdentifier(storagePath);
  if (identifier) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("[Blob Delete Failed] BLOB_READ_WRITE_TOKEN is not configured", {
        storagePath,
      });
      return;
    }
    try {
      await del(identifier, { token });
    } catch (err) {
      logApiError("Blob Delete", err, { storagePath, identifier });
    }
    return;
  }
  await storage.delete(storagePath);
}
