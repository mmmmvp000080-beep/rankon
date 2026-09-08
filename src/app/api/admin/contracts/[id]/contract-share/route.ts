import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { shareTokenUpdateSchema } from "@/lib/validation/schemas";
import { generateToken } from "@/lib/contract-snapshot";
import { NO_STORE_HEADERS } from "@/lib/http-cache";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

function shareUrl(token: string, request: NextRequest): string {
  const baseUrl = getAppUrl(request);
  return `${baseUrl}/contract/${token}`;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id: contractId } = await context.params;
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);
    if (!contract.providerSignedAt) {
      return failure("공급자 서명 후 고객 계약 링크를 생성할 수 있습니다");
    }

    const shareToken = await prisma.$transaction(async (tx) => {
      await tx.shareToken.updateMany({
        where: { contractId, type: "CONTRACT_SIGN", isActive: true },
        data: { isActive: false },
      });

      const token = generateToken();
      const created = await tx.shareToken.create({
        data: {
          contractId,
          token,
          type: "CONTRACT_SIGN",
          isActive: true,
        },
      });

      if (contract.status === "PROVIDER_SIGNED") {
        await tx.contract.update({
          where: { id: contractId },
          data: { status: "CUSTOMER_PENDING" },
        });
        await tx.contractHistory.create({
          data: {
            contractId,
            action: "STATUS_CHANGED",
            description: "상태 변경: 고객 서명 대기",
            actorType: "SYSTEM",
          },
        });
      }

      await tx.contractHistory.create({
        data: {
          contractId,
          action: "CONTRACT_LINK_CREATED",
          description: "고객 계약 링크 생성",
          actorType: "ADMIN",
        },
      });

      return created;
    });

    const url = shareUrl(shareToken.token, request);
    return NextResponse.json(
      {
        success: true,
        token: shareToken.token,
        url,
        data: { shareToken, url },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error("[Contract Share Create Failed]", { error: err });
    return failure("링크 생성 중 오류가 발생했습니다", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id: contractId } = await context.params;
    const body = await request.json();
    const parsed = shareTokenUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    const activeToken = await prisma.shareToken.findFirst({
      where: { contractId, type: "CONTRACT_SIGN", isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!activeToken && parsed.data.isActive !== false) {
      return failure("활성 링크가 없습니다");
    }

    if (parsed.data.isActive === false) {
      await prisma.shareToken.updateMany({
        where: { contractId, type: "CONTRACT_SIGN", isActive: true },
        data: { isActive: false },
      });
      await prisma.contractHistory.create({
        data: {
          contractId,
          action: "CONTRACT_LINK_DEACTIVATED",
          description: "고객 계약 링크 비활성화",
          actorType: "ADMIN",
        },
      });
      return success({ deactivated: true });
    }

    if (body.regenerate) {
      const shareToken = await prisma.$transaction(async (tx) => {
        await tx.shareToken.updateMany({
          where: { contractId, type: "CONTRACT_SIGN", isActive: true },
          data: { isActive: false },
        });

        const token = generateToken();
        const created = await tx.shareToken.create({
          data: {
            contractId,
            token,
            type: "CONTRACT_SIGN",
            isActive: true,
            expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
          },
        });

        await tx.contractHistory.create({
          data: {
            contractId,
            action: "CONTRACT_LINK_REGENERATED",
            description: "고객 계약 링크 재발급",
            actorType: "ADMIN",
          },
        });

        return created;
      });

      const url = shareUrl(shareToken.token, request);
      return NextResponse.json(
        {
          success: true,
          token: shareToken.token,
          url,
          data: { shareToken, url },
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (activeToken && parsed.data.expiresAt !== undefined) {
      const updated = await prisma.shareToken.update({
        where: { id: activeToken.id },
        data: { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null },
      });
      return success({ shareToken: updated });
    }

    return success({ shareToken: activeToken });
  } catch (err) {
    console.error("[Contract Share Update Failed]", { error: err });
    return failure("링크 수정 중 오류가 발생했습니다", 500);
  }
}
