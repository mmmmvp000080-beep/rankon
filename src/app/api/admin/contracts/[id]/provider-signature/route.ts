import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { providerSignatureSchema } from "@/lib/validation/schemas";
import {
  SignatureStorageError,
  deleteStoredSignature,
  storeSignatureDataUrl,
} from "@/lib/signature-storage";
import { logApiError, logStep } from "@/lib/api-error-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  let contractId: string | undefined;

  try {
    const { id } = await context.params;
    contractId = id;
    logStep("Provider Signature", "Load contract", "START", { contractId });

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      logStep("Provider Signature", "Load contract", "FAIL", { contractId, reason: "not_found" });
      return failure("계약을 찾을 수 없습니다", 404);
    }
    if (contract.status === "COMPLETED") {
      logStep("Provider Signature", "Load contract", "FAIL", { contractId, reason: "completed" });
      return failure("완료된 계약에는 서명할 수 없습니다", 409);
    }
    logStep("Provider Signature", "Load contract", "SUCCESS", { contractId, status: contract.status });

    const body = await request.json();
    const parsed = providerSignatureSchema.safeParse(body);
    if (!parsed.success) {
      logStep("Provider Signature", "Validate request", "FAIL", {
        contractId,
        issues: parsed.error.flatten(),
      });
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다", 400);
    }
    logStep("Provider Signature", "Validate request", "SUCCESS", {
      contractId,
      signatureLength: parsed.data.signatureDataUrl.length,
    });

    let signaturePath: string;
    try {
      logStep("Provider Signature", "Store signature data URL", "START", { contractId });
      signaturePath = storeSignatureDataUrl(parsed.data.signatureDataUrl);
      logStep("Provider Signature", "Store signature data URL", "SUCCESS", {
        contractId,
        storedLength: signaturePath.length,
      });
    } catch (err) {
      logStep("Provider Signature", "Store signature data URL", "FAIL", { contractId });
      logApiError("Provider Signature Store signature data URL", err, { contractId });
      if (err instanceof SignatureStorageError) {
        return failure("서명 정보를 확인해 주세요.", 400);
      }
      return failure("서명 저장 중 오류가 발생했습니다", 500);
    }

    const isUpdate = !!contract.providerSignedAt;
    logStep("Provider Signature", "Prisma transaction", "START", { contractId, isUpdate });

    const updated = await prisma.$transaction(async (tx) => {
      await deleteStoredSignature(contract.providerSignaturePath);

      const result = await tx.contract.update({
        where: { id },
        data: {
          providerSignerName: parsed.data.signerName,
          providerSignerTitle: parsed.data.signerTitle || null,
          providerSignaturePath: signaturePath,
          providerSignedAt: new Date(),
          status:
            contract.status === "DRAFT"
              ? "PROVIDER_SIGNED"
              : contract.status === "CUSTOMER_PENDING"
                ? "CUSTOMER_PENDING"
                : "PROVIDER_SIGNED",
        },
      });

      await tx.contractHistory.create({
        data: {
          contractId: id,
          action: isUpdate ? "PROVIDER_SIGNATURE_UPDATED" : "PROVIDER_SIGNED",
          description: isUpdate ? "공급자 서명 변경" : "공급자 서명 완료",
          actorType: "ADMIN",
        },
      });

      return result;
    });

    logStep("Provider Signature", "Prisma transaction", "SUCCESS", {
      contractId,
      status: updated.status,
    });
    return success({ contract: updated });
  } catch (err) {
    logStep("Provider Signature", "Prisma transaction", "FAIL", { contractId });
    logApiError("Provider Signature", err, { contractId });
    return failure("서명 저장 중 오류가 발생했습니다", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  let contractId: string | undefined;

  try {
    const { id } = await context.params;
    contractId = id;
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);
    if (contract.status === "COMPLETED") return failure("완료된 계약의 서명은 삭제할 수 없습니다", 409);

    const updated = await prisma.$transaction(async (tx) => {
      await deleteStoredSignature(contract.providerSignaturePath);

      await tx.shareToken.updateMany({
        where: { contractId: id, type: "CONTRACT_SIGN", isActive: true },
        data: { isActive: false },
      });

      const result = await tx.contract.update({
        where: { id },
        data: {
          providerSignerName: null,
          providerSignerTitle: null,
          providerSignaturePath: null,
          providerSignedAt: null,
          status: "DRAFT",
        },
      });

      await tx.contractHistory.create({
        data: {
          contractId: id,
          action: "PROVIDER_SIGNATURE_DELETED",
          description: "공급자 서명 삭제",
          actorType: "ADMIN",
        },
      });

      return result;
    });

    return success({ contract: updated });
  } catch (err) {
    logApiError("Provider Signature Delete", err, { contractId });
    return failure("서명 삭제 중 오류가 발생했습니다", 500);
  }
}
