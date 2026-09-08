import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { failure } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loadActiveContractShareToken } from "@/lib/contract-load";
import { serializeContract } from "@/lib/contract-fields";
import { jsonNoStore } from "@/lib/http-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`contract:${ip}`, 30, 60_000)) {
    return failure("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  let token: string | undefined;
  try {
    const params = await context.params;
    token = params.token;

    if (!token) {
      console.error("[Shared Contract Load Failed]", { token, reason: "missing_token" });
      return failure("계약 링크가 올바르지 않습니다", 400);
    }

    const [result, company] = await Promise.all([
      loadActiveContractShareToken(token),
      prisma.companySettings.findFirst(),
    ]);

    if (!result) {
      console.error("[Shared Contract Load Failed]", { token, reason: "inactive_or_missing_token" });
      return failure("비활성화된 계약 링크입니다", 403);
    }

    if (!result.contract) {
      console.error("[Shared Contract Load Failed]", { token, reason: "contract_missing" });
      return failure("계약을 찾을 수 없습니다", 404);
    }

    void prisma.shareToken
      .update({
        where: { id: result.id },
        data: { lastAccessedAt: new Date() },
      })
      .catch(() => undefined);

    return jsonNoStore({
      success: true,
      data: {
        contract: serializeContract(result.contract),
        company,
        completed: result.contract.status === "COMPLETED",
        shareToken: result.token,
      },
    });
  } catch (err) {
    console.error("[Shared Contract Load Failed]", { token, error: err });
    const message = err instanceof Error ? err.message : "계약 정보를 불러올 수 없습니다";
    return failure(message, 500);
  }
}
