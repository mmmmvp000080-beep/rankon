import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { success, failure } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
} from "@/lib/constants";
import { FileCategory } from "@/generated/prisma/client";
import {
  UploadedFileStorageError,
  saveUploadedFile,
} from "@/lib/uploaded-file-storage";
import { logApiError, logStep } from "@/lib/api-error-log";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ token: string }> };

const CATEGORY_MAP: Record<string, FileCategory> = {
  BUSINESS_LICENSE: "BUSINESS_LICENSE",
  BANKBOOK: "BANKBOOK",
  OTHER: "OTHER",
};

function isAllowedFile(file: File): boolean {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return false;
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return false;
  return true;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`submit:${ip}`, 30, 60_000)) {
    return failure("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  try {
    const { token } = await context.params;
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
      include: {
        contract: {
          include: { uploadedFiles: { orderBy: { createdAt: "desc" } } },
        },
      },
    });

    if (!shareToken || shareToken.type !== "FILE_UPLOAD") {
      return failure("유효하지 않은 제출 링크입니다", 404);
    }
    if (!shareToken.isActive) {
      return failure("비활성화된 제출 링크입니다", 409);
    }
    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      return failure("만료된 제출 링크입니다", 403);
    }

    void prisma.shareToken
      .update({
        where: { id: shareToken.id },
        data: { lastAccessedAt: new Date() },
      })
      .catch(() => undefined);

    return success({
      contract: shareToken.contract,
      files: shareToken.contract.uploadedFiles,
    });
  } catch (err) {
    logApiError("Customer File Upload GET", err);
    return failure("제출 정보를 불러올 수 없습니다", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`upload:${ip}`, 10, 60_000)) {
    return failure("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  let token: string | undefined;
  let contractId: string | undefined;

  try {
    ({ token } = await context.params);
    if (!token) {
      return failure("파일 정보를 확인해 주세요.", 400);
    }

    logStep("Customer File Upload", "Share token lookup", "START", { token });
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
      include: { contract: true },
    });

    if (!shareToken || shareToken.type !== "FILE_UPLOAD") {
      logStep("Customer File Upload", "Share token lookup", "FAIL", { token, reason: "not_found" });
      return failure("유효하지 않은 제출 링크입니다", 404);
    }
    if (!shareToken.isActive) {
      logStep("Customer File Upload", "Share token lookup", "FAIL", { token, reason: "inactive" });
      return failure("비활성화된 제출 링크입니다", 409);
    }
    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      logStep("Customer File Upload", "Share token lookup", "FAIL", { token, reason: "expired" });
      return failure("만료된 제출 링크입니다", 403);
    }

    contractId = shareToken.contractId;
    logStep("Customer File Upload", "Share token lookup", "SUCCESS", { token, contractId });

    const formData = await request.formData();
    const categoryRaw = formData.get("category") as string;
    const category = CATEGORY_MAP[categoryRaw];
    if (!category) {
      return failure("파일 종류를 선택하세요", 400);
    }

    const files = formData.getAll("files") as File[];
    if (files.length === 0) {
      return failure("파일을 선택하세요", 400);
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return failure(`한 번에 최대 ${MAX_FILES_PER_UPLOAD}개까지 업로드할 수 있습니다`, 400);
    }

    for (const file of files) {
      if (!isAllowedFile(file)) {
        logStep("Customer File Upload", "File validation", "FAIL", {
          token,
          contractId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });
        return failure(`허용되지 않는 파일입니다: ${file.name}`, 400);
      }
    }
    logStep("Customer File Upload", "File validation", "SUCCESS", {
      token,
      contractId,
      fileCount: files.length,
    });

    const uploaded = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        let stored: { storedName: string; storagePath: string };
        try {
          stored = await saveUploadedFile(shareToken.contractId, file, buffer);
        } catch (err) {
          logStep("Customer File Upload", "Blob put", "FAIL", {
            token,
            contractId,
            fileName: file.name,
          });
          logApiError("Customer File Upload Blob put", err, {
            token,
            contractId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
          if (err instanceof UploadedFileStorageError) {
            throw err;
          }
          throw new UploadedFileStorageError(
            "파일 업로드 중 오류가 발생했습니다",
            "UPLOAD_FAILED"
          );
        }

        logStep("Customer File Upload", "Prisma uploadedFile.create", "START", {
          contractId,
          fileName: file.name,
        });
        const record = await tx.uploadedFile.create({
          data: {
            contractId: shareToken.contractId,
            category,
            originalName: file.name,
            storedName: stored.storedName,
            storagePath: stored.storagePath,
            mimeType: file.type,
            fileSize: file.size,
            uploadedBy: "CUSTOMER",
          },
        });
        logStep("Customer File Upload", "Prisma uploadedFile.create", "SUCCESS", {
          contractId,
          fileId: record.id,
        });
        records.push(record);
      }

      await tx.contractHistory.create({
        data: {
          contractId: shareToken.contractId,
          action: "FILE_UPLOADED",
          description: `파일 ${records.length}개 제출`,
          actorType: "CUSTOMER",
        },
      });

      return records;
    });

    const primary = uploaded[0];
    return NextResponse.json({
      success: true,
      message: "파일이 정상적으로 제출되었습니다.",
      file: primary
        ? {
            id: primary.id,
            name: primary.originalName,
            category: primary.category,
          }
        : undefined,
      data: { files: uploaded },
    });
  } catch (err) {
    logStep("Customer File Upload", "Request handler", "FAIL", { token, contractId });
    logApiError("Customer File Upload", err, { token, contractId });
    if (err instanceof UploadedFileStorageError) {
      return failure("파일 업로드 중 오류가 발생했습니다", 500);
    }
    return failure("파일 업로드 중 오류가 발생했습니다", 500);
  }
}
