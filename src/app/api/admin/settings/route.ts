import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { companySettingsSchema } from "@/lib/validation/schemas";
import { migrateLegacyProviderBrandInStoredTemplates } from "@/lib/contract-template";
import { PROVIDER_COMPANY_DISPLAY_NAME } from "@/lib/provider-company-display";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const [, settingsFound] = await Promise.all([
      migrateLegacyProviderBrandInStoredTemplates(),
      prisma.companySettings.findFirst(),
    ]);
    let settings = settingsFound;
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: PROVIDER_COMPANY_DISPLAY_NAME,
          representativeName: "",
          representativeTitle: null,
          businessNumber: "",
          address: "",
          phone: "",
          email: "",
        },
      });
    }
    return success({ settings });
  } catch {
    return failure("설정을 불러올 수 없습니다", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = companySettingsSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    const existing = await prisma.companySettings.findFirst();
    const settings = existing
      ? await prisma.companySettings.update({
          where: { id: existing.id },
          data: parsed.data,
        })
      : await prisma.companySettings.create({ data: parsed.data });

    return success({ settings });
  } catch {
    return failure("설정 저장 중 오류가 발생했습니다", 500);
  }
}
