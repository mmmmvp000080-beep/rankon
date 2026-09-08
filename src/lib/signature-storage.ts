import { storage } from "@/lib/storage";

export const SIGNATURE_DATA_URL_PREFIX = "data:image/png;base64,";
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
/** Minimum decoded PNG size — rejects blank/invalid tiny payloads */
export const MIN_SIGNATURE_BYTES = 200;

export class SignatureStorageError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_FORMAT"
      | "EMPTY"
      | "TOO_LARGE"
      | "PARSE_FAILED"
  ) {
    super(message);
    this.name = "SignatureStorageError";
  }
}

export function isSignatureDataUrl(value: string): boolean {
  return value.startsWith(SIGNATURE_DATA_URL_PREFIX);
}

export function parseSignatureDataUrl(dataUrl: string): { base64: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match?.[1]) {
    throw new SignatureStorageError("올바른 PNG 서명 이미지가 아닙니다.", "INVALID_FORMAT");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[1], "base64");
  } catch {
    throw new SignatureStorageError("서명 이미지를 해석할 수 없습니다.", "PARSE_FAILED");
  }

  if (buffer.length < MIN_SIGNATURE_BYTES) {
    throw new SignatureStorageError("서명 정보를 확인해 주세요.", "EMPTY");
  }
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    throw new SignatureStorageError("서명 이미지가 너무 큽니다.", "TOO_LARGE");
  }

  return { base64: match[1], buffer };
}

/** Store signature as data URL string in DB (Vercel-safe, no local filesystem). */
export function storeSignatureDataUrl(dataUrl: string): string {
  const { base64 } = parseSignatureDataUrl(dataUrl);
  return `${SIGNATURE_DATA_URL_PREFIX}${base64}`;
}

export async function resolveSignatureDataUrl(
  stored: string | null | undefined
): Promise<string | null> {
  if (!stored) return null;
  if (isSignatureDataUrl(stored)) return stored;
  try {
    const buf = await storage.read(stored);
    return `${SIGNATURE_DATA_URL_PREFIX}${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function resolveSignatureBuffer(
  stored: string | null | undefined
): Promise<Buffer | null> {
  if (!stored) return null;
  if (isSignatureDataUrl(stored)) {
    try {
      return parseSignatureDataUrl(stored).buffer;
    } catch {
      return null;
    }
  }
  try {
    return await storage.read(stored);
  } catch {
    return null;
  }
}

export async function deleteStoredSignature(stored: string | null | undefined): Promise<void> {
  if (!stored || isSignatureDataUrl(stored)) return;
  await storage.delete(stored);
}
