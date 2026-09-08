import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { failure } from "@/lib/api-response";
import {
  isLocalStoragePath,
  readPrivateBlobStream,
  readUploadedFile,
} from "@/lib/uploaded-file-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

function inlineDisposition(fileName: string): string {
  const encoded = encodeURIComponent(fileName);
  return `inline; filename="${encoded}"; filename*=UTF-8''${encoded}`;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) return failure("파일을 찾을 수 없습니다", 404);

    if (isLocalStoragePath(file.storagePath)) {
      const buffer = await readUploadedFile(file.storagePath);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": inlineDisposition(file.originalName),
          "Cache-Control": "private, no-store",
        },
      });
    }

    const result = await readPrivateBlobStream(file.storagePath);
    if (!result?.stream) {
      return Response.json(
        { success: false, message: "파일을 불러올 수 없습니다." },
        { status: 404 }
      );
    }

    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.headers.get("content-type") || file.mimeType,
        "Content-Disposition": inlineDisposition(file.originalName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[File Preview Failed]", err);
    return failure("파일 미리보기 중 오류가 발생했습니다", 500);
  }
}
