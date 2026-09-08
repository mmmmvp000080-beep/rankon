import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const files = await prisma.uploadedFile.findMany({
      where: { contractId: id },
      orderBy: { createdAt: "desc" },
    });
    return success({ files });
  } catch {
    return failure("파일 목록을 불러올 수 없습니다", 500);
  }
}
