import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import {
  deleteStoredSignature,
  storeSignatureDataUrl,
  SignatureStorageError,
} from "@/lib/signature-storage";
import { providerSignatureSchema } from "@/lib/validation/schemas";
import { PROVIDER_COMPANY_DISPLAY_NAME } from "@/lib/provider-company-display";

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = providerSignatureSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: PROVIDER_COMPANY_DISPLAY_NAME,
          representativeName: "관리자",
          representativeTitle: "대표",
          businessNumber: "",
          address: "",
          phone: "",
          email: "",
        },
      });
    }

    if (settings.defaultSignaturePath) {
      await deleteStoredSignature(settings.defaultSignaturePath);
    }

    let storagePath: string;
    try {
      storagePath = storeSignatureDataUrl(parsed.data.signatureDataUrl);
    } catch (err) {
      console.error("[Default Signature Save Failed]", { error: err });
      if (err instanceof SignatureStorageError) {
        return failure("서명 정보를 확인해 주세요.", 400);
      }
      return failure("기본 서명 저장 중 오류가 발생했습니다", 500);
    }
    const updated = await prisma.companySettings.update({
      where: { id: settings.id },
      data: { defaultSignaturePath: storagePath },
    });

    return success({ settings: updated });
  } catch {
    return failure("기본 서명 저장 중 오류가 발생했습니다", 500);
  }
}

export async function DELETE() {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const settings = await prisma.companySettings.findFirst();
    if (!settings) return failure("설정을 찾을 수 없습니다", 404);

    if (settings.defaultSignaturePath) {
      await deleteStoredSignature(settings.defaultSignaturePath);
    }

    const updated = await prisma.companySettings.update({
      where: { id: settings.id },
      data: { defaultSignaturePath: null },
    });

    return success({ settings: updated });
  } catch {
    return failure("기본 서명 삭제 중 오류가 발생했습니다", 500);
  }
}
