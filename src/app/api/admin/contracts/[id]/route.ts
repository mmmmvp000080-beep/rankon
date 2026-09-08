import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { updateContractSchema, buildContractItemFromType } from "@/lib/validation/schemas";
import { addContractHistory, isContractLocked } from "@/lib/contract-history";
import { loadAdminContractDetail } from "@/lib/contract-load";
import { serializeContract, representativeToDbFields, contractRegistrationFields } from "@/lib/contract-fields";
import { normalizeCustomerType } from "@/lib/customer-type";
import { normalizeContractType } from "@/lib/contract-type";
import {
  getDefaultContractPurpose,
  replaceContractClausesFromTemplate,
} from "@/lib/contract-template";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const contract = await loadAdminContractDetail(id);
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);

    return success({
      contract: serializeContract(contract),
    });
  } catch (err) {
    console.error("[GET /api/admin/contracts/:id] error:", err);
    const message = err instanceof Error ? err.message : "계약 정보를 불러올 수 없습니다";
    return failure(message, 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const existing = await prisma.contract.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) return failure("계약을 찾을 수 없습니다", 404);

    const locked = isContractLocked(existing.status, existing.lockedAt);
    const body = await request.json();
    const parsed = updateContractSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (locked) {
      if (data.internalMemo !== undefined) {
        updateData.internalMemo = data.internalMemo;
      }
    } else {
      if (data.customerType !== undefined) {
        updateData.customerType = normalizeCustomerType(data.customerType);
      }
      if (data.companyName !== undefined) updateData.companyName = data.companyName;
      if (data.representativeName !== undefined || data.customerType !== undefined) {
        const merged = {
          customerType: normalizeCustomerType(data.customerType ?? existing.customerType),
          companyName: data.companyName ?? existing.companyName,
          representativeName:
            data.representativeName ??
            (existing.customerType === "INDIVIDUAL" ? existing.companyName : existing.contactName),
          contactName: data.contactName ?? existing.contactTitle,
        };
        const { contactName, contactTitle } = representativeToDbFields(merged);
        updateData.contactName = contactName || merged.companyName.trim();
        updateData.contactTitle = contactTitle;
      } else if (data.contactName !== undefined) {
        updateData.contactTitle = data.contactName?.trim() || null;
      }
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (
        data.businessNumber !== undefined ||
        data.corporateRegistrationNumber !== undefined ||
        data.customerType !== undefined
      ) {
        const registration = contractRegistrationFields({
          customerType: normalizeCustomerType(data.customerType ?? existing.customerType),
          businessNumber: data.businessNumber ?? existing.businessNumber,
          corporateRegistrationNumber:
            data.corporateRegistrationNumber ?? existing.corporateRegistrationNumber,
        });
        updateData.businessNumber = registration.businessNumber;
        updateData.corporateRegistrationNumber = registration.corporateRegistrationNumber;
      }
      if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
      if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
      if (data.vatIncluded !== undefined) updateData.vatIncluded = data.vatIncluded;
      if (data.specialTerms !== undefined) updateData.specialTerms = data.specialTerms || null;
      if (data.internalMemo !== undefined) updateData.internalMemo = data.internalMemo;
    }

    let totalAmount = existing.totalAmount;
    if (!locked && data.totalAmount !== undefined) {
      totalAmount = data.totalAmount;
      updateData.totalAmount = totalAmount;
    }

    if (!locked && data.contractType !== undefined) {
      const nextType = normalizeContractType(data.contractType);
      if (nextType !== existing.contractType) {
        updateData.contractType = nextType;
        updateData.contractPurpose = await getDefaultContractPurpose(nextType);
        await replaceContractClausesFromTemplate(id, nextType);
        const item = buildContractItemFromType(nextType, totalAmount);
        await prisma.contractItem.deleteMany({ where: { contractId: id } });
        await prisma.contractItem.create({
          data: { ...item, contractId: id },
        });
        await addContractHistory(id, "CONTRACT_TYPE_CHANGED", `계약 유형 변경: ${nextType}`);
      }
    }

    if (!locked && data.totalAmount !== undefined && data.contractType === undefined) {
      const itemType = normalizeContractType(
        (updateData.contractType as string | undefined) ?? existing.contractType
      );
      const item = buildContractItemFromType(itemType, totalAmount);
      await prisma.contractItem.deleteMany({ where: { contractId: id } });
      await prisma.contractItem.create({
        data: { ...item, contractId: id },
      });
      await addContractHistory(id, "ITEMS_UPDATED", "계약금액 수정");
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    await addContractHistory(id, "CONTRACT_UPDATED", "계약 정보 수정");

    return success({ contract: serializeContract(contract) });
  } catch (err) {
    console.error("[PATCH /api/admin/contracts/:id] error:", err);
    const message = err instanceof Error ? err.message : "계약 수정 중 오류가 발생했습니다";
    return failure(message, 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { uploadedFiles: true, generatedPdfs: true },
    });
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);

    const filePaths = contract.uploadedFiles.map((f) => f.storagePath);
    const pdfPaths = contract.generatedPdfs.map((p) => p.storagePath);

    await prisma.$transaction(async (tx) => {
      await tx.contract.delete({ where: { id } });
    });

    const { deleteStoredSignature } = await import("@/lib/signature-storage");
    const { deleteUploadedFile } = await import("@/lib/uploaded-file-storage");
    const { storage } = await import("@/lib/storage");

    await deleteStoredSignature(contract.providerSignaturePath);
    await deleteStoredSignature(contract.customerSignaturePath);

    for (const p of filePaths) {
      await deleteUploadedFile(p);
    }
    for (const p of pdfPaths) {
      try {
        await storage.delete(p);
      } catch (err) {
        console.error("[Contract Delete Failed] pdf cleanup", { path: p, error: err });
      }
    }

    return success({ deleted: true });
  } catch (err) {
    console.error("[Contract Delete Failed]", err);
    return failure("계약 삭제 중 오류가 발생했습니다", 500);
  }
}
