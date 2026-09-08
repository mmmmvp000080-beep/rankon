import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { failure } from "@/lib/api-response";
import { customerSignSchema } from "@/lib/validation/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildContractSnapshot, stableStringify, hashContent } from "@/lib/contract-snapshot";
import { getTemplateVersion } from "@/lib/contract-template";
import { loadActiveContractShareToken, loadContractClauses } from "@/lib/contract-load";
import {
  SignatureStorageError,
  storeSignatureDataUrl,
} from "@/lib/signature-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ token: string }> };

function logSignFailure(
  stage: string,
  context: Record<string, unknown>,
  error: unknown
) {
  console.error("[Customer Signature Save Failed]", {
    stage,
    ...context,
    error,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`sign:${ip}`, 10, 60_000)) {
    return failure("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  let token: string | undefined;
  let contractId: string | undefined;

  try {
    ({ token } = await context.params);
    if (!token) {
      return failure("서명 정보를 확인해 주세요.", 400);
    }

    const shareTokenResult = await loadActiveContractShareToken(token);

    if (!shareTokenResult) {
      logSignFailure("share_token_lookup", { token }, "inactive_or_missing");
      return failure("비활성화된 계약 링크입니다", 403);
    }

    const contract = shareTokenResult.contract;
    if (!contract) {
      logSignFailure("contract_lookup", { token }, "contract_missing");
      return failure("계약을 찾을 수 없습니다", 404);
    }
    contractId = contract.id;

    if (!contract.providerSignedAt) {
      return failure("공급자 서명이 완료되지 않았습니다", 400);
    }
    if (contract.status === "COMPLETED" || contract.customerSignedAt) {
      return failure("이미 서명이 완료된 계약입니다", 409);
    }

    const body = await request.json();
    const parsed = customerSignSchema.safeParse(body);
    if (!parsed.success) {
      logSignFailure("request_validation", { token, contractId }, parsed.error.flatten());
      return failure("서명 정보를 확인해 주세요.", 400);
    }

    let signaturePath: string;
    try {
      signaturePath = storeSignatureDataUrl(parsed.data.signatureDataUrl);
    } catch (err) {
      logSignFailure("signature_parse", { token, contractId }, err);
      if (err instanceof SignatureStorageError) {
        return failure("서명 정보를 확인해 주세요.", 400);
      }
      return failure("서명 정보를 확인해 주세요.", 400);
    }

    const clauses = await loadContractClauses(contract.id);
    const companySettings = await prisma.companySettings.findFirst();
    const templateVersion = await getTemplateVersion(contract.contractType);
    let snapshotStr: string;
    let contentHash: string;
    try {
      const snapshot = buildContractSnapshot(
        contract,
        contract.items,
        clauses,
        companySettings,
        templateVersion
      );
      snapshotStr = stableStringify(snapshot);
      contentHash = hashContent(snapshotStr);
    } catch (err) {
      logSignFailure("snapshot_build", { token, contractId }, err);
      return failure("서명 저장 중 오류가 발생했습니다", 500);
    }

    const signedAt = new Date();
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const result = await tx.contract.update({
          where: { id: contract.id },
          data: {
            customerSignerName: parsed.data.signerName,
            customerSignerTitle: parsed.data.signerTitle || null,
            customerSignaturePath: signaturePath,
            customerSignedAt: signedAt,
            signedSnapshot: snapshotStr,
            signedContentHash: contentHash,
            lockedAt: signedAt,
            status: "COMPLETED",
          },
        });

        await tx.contractHistory.createMany({
          data: [
            {
              contractId: contract.id,
              action: "CUSTOMER_SIGNED",
              description: "고객 서명 완료",
              actorType: "CUSTOMER",
            },
            {
              contractId: contract.id,
              action: "STATUS_CHANGED",
              description: "상태 변경: 계약 완료",
              actorType: "SYSTEM",
            },
          ],
        });

        return result;
      });
    } catch (err) {
      logSignFailure("prisma_transaction", { token, contractId }, err);
      return failure("서명 저장 중 오류가 발생했습니다", 500);
    }

    return NextResponse.json({
      success: true,
      message: "전자서명이 완료되었습니다.",
      status: "COMPLETED",
      data: {
        contract: updated,
        signedAt: updated.customerSignedAt,
      },
    });
  } catch (err) {
    logSignFailure("unexpected", { token, contractId }, err);
    return failure("서명 저장 중 오류가 발생했습니다", 500);
  }
}
