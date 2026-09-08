import { NextRequest } from "next/server";
import { failure } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loadActiveContractShareToken } from "@/lib/contract-load";
import { generateContractPdf } from "@/lib/pdf/generator";
import { contractToPdfInput } from "@/lib/pdf/contract-input";
import { prisma } from "@/lib/prisma";
import { PdfCompanyInfo } from "@/lib/pdf/types";
import { PROVIDER_COMPANY_DISPLAY_NAME } from "@/lib/provider-company-display";
import { pdfInlineHeaders } from "@/lib/pdf/response-headers";
import { buildContractPdfFilename } from "@/lib/pdf/filename";
import { logPdfRuntimeFailure, getPdfFailureContext } from "@/lib/pdf/pdf-runtime-error";
import { createPdfTiming } from "@/lib/pdf/pdf-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type RouteContext = { params: Promise<{ shareToken: string }> };
const ROUTE = "/api/shared-contracts/[shareToken]/pdf/draft";

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

export async function GET(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`shared-draft-pdf:${ip}`, 20, 60_000)) {
    return failure("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  try {
    const timing = createPdfTiming();
    timing.logEvent("request-start");

    const { shareToken } = await context.params;
    if (!shareToken) return failure("계약 링크가 올바르지 않습니다", 400);

    const result = await loadActiveContractShareToken(shareToken);
    if (!result?.contract) {
      return failure("비활성화된 계약 링크입니다", 403);
    }
    timing.mark("contract-loaded");

    const company = await getCompanySettings();
    const pdfBuffer = await generateContractPdf(
      "DRAFT",
      company,
      contractToPdfInput(result.contract),
      timing
    );
    const filename = buildContractPdfFilename({
      companyName: result.contract.companyName,
      representativeName: result.contract.contactName,
      contractNumber: result.contract.contractNumber,
      contractDate: result.contract.startDate ?? result.contract.createdAt,
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
