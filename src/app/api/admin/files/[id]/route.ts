import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { fileCategorySchema } from "@/lib/validation/schemas";
import { deleteUploadedFile } from "@/lib/uploaded-file-storage";
import { addContractHistory } from "@/lib/contract-history";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = fileCategorySchema.safeParse(body.category);
    if (!parsed.success) return failure("올바른 파일 종류를 선택하세요");

    const file = await prisma.uploadedFile.update({
      where: { id },
      data: { category: parsed.data },
    });
    return success({ file });
  } catch {
    return failure("파일 수정 중 오류가 발생했습니다", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) return failure("파일을 찾을 수 없습니다", 404);

    await prisma.uploadedFile.delete({ where: { id } });
    await deleteUploadedFile(file.storagePath);
    await addContractHistory(file.contractId, "FILE_DELETED", `파일 삭제: ${file.originalName}`);

    return success({ deleted: true });
  } catch (err) {
    console.error("[File Delete Failed]", { error: err });
    return failure("파일 삭제 중 오류가 발생했습니다", 500);
  }
}
