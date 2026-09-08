import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { shareTokenUpdateSchema } from "@/lib/validation/schemas";
import { addContractHistory } from "@/lib/contract-history";
import { generateToken } from "@/lib/contract-snapshot";
import { getAppUrl } from "@/lib/app-url";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);

    const token = generateToken();
    const shareToken = await prisma.shareToken.create({
      data: {
        contractId: id,
        token,
        type: "FILE_UPLOAD",
        isActive: true,
      },
    });

    await addContractHistory(id, "UPLOAD_LINK_CREATED", "파일 제출 링크 생성");

    const baseUrl = getAppUrl(request);
    return success({ shareToken, url: `${baseUrl}/submit/${token}` });
  } catch {
    return failure("링크 생성 중 오류가 발생했습니다", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = shareTokenUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    const activeToken = await prisma.shareToken.findFirst({
      where: { contractId: id, type: "FILE_UPLOAD", isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (parsed.data.isActive === false) {
      await prisma.shareToken.updateMany({
        where: { contractId: id, type: "FILE_UPLOAD", isActive: true },
        data: { isActive: false },
      });
      return success({ deactivated: true });
    }

    if (body.regenerate) {
      await prisma.shareToken.updateMany({
        where: { contractId: id, type: "FILE_UPLOAD", isActive: true },
        data: { isActive: false },
      });

      const token = generateToken();
      const shareToken = await prisma.shareToken.create({
        data: {
          contractId: id,
          token,
          type: "FILE_UPLOAD",
          isActive: true,
          expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        },
      });

      await addContractHistory(id, "UPLOAD_LINK_REGENERATED", "파일 제출 링크 재발급");
      const baseUrl = getAppUrl(request);
      return success({ shareToken, url: `${baseUrl}/submit/${token}` });
    }

    if (activeToken && parsed.data.expiresAt !== undefined) {
      const updated = await prisma.shareToken.update({
        where: { id: activeToken.id },
        data: { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null },
      });
      return success({ shareToken: updated });
    }

    return success({ shareToken: activeToken });
  } catch {
    return failure("링크 수정 중 오류가 발생했습니다", 500);
  }
}
