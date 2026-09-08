import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/api-utils";
import { failure } from "@/lib/api-response";
import { generateContractPdf } from "@/lib/pdf/generator";
import { contractToPdfInput } from "@/lib/pdf/contract-input";
import { loadContractWithItemsAndClauses } from "@/lib/contract-load";
import { buildContractPdfFilename } from "@/lib/pdf/filename";
import { pdfInlineHeaders } from "@/lib/pdf/response-headers";
import { logPdfRuntimeFailure, getPdfFailureContext } from "@/lib/pdf/pdf-runtime-error";
import { createPdfTiming } from "@/lib/pdf/pdf-timing";
import { prisma } from "@/lib/prisma";
import type { PdfCompanyInfo } from "@/lib/pdf/types";
import { PROVIDER_COMPANY_DISPLAY_NAME } from "@/lib/provider-company-display";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };
const ROUTE = "/api/admin/contracts/[id]/pdf/draft";

async function getCompanySettings(): Promise<PdfCompanyInfo> {
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
  return settings;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  let id: string | undefined;
  try {
    const timing = createPdfTiming();
    timing.logEvent("request-start");

    ({ id } = await context.params);
    if (!id) return failure("계약 ID가 필요합니다", 400);

    const contract = await loadContractWithItemsAndClauses(id);
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);
    timing.mark("contract-loaded");

    const company = await getCompanySettings();
    const pdfBuffer = await generateContractPdf("DRAFT", company, contractToPdfInput(contract), timing);
    const filename = buildContractPdfFilename({
      companyName: contract.companyName,
      representativeName: contract.contactName,
      contractNumber: contract.contractNumber,
      contractDate: contract.startDate ?? contract.createdAt,
      variant: "draft",
    });
    timing.mark("response-ready");

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: pdfInlineHeaders(filename),
    });
  } catch (err) {
    logPdfRuntimeFailure(ROUTE, err, getPdfFailureContext(err));
    const message = err instanceof Error ? err.message : "PDF 생성 중 오류가 발생했습니다";
    return failure(message, 500);
  }
}
