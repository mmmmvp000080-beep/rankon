import { NextRequest } from "next/server";
import { failure } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loadActiveContractShareToken } from "@/lib/contract-load";
import { generateSignedPdfFromSnapshot } from "@/lib/pdf/pdf-service";
import { buildContractPdfFilename } from "@/lib/pdf/filename";
import { pdfDownloadHeaders, pdfInlineHeaders } from "@/lib/pdf/response-headers";
import { jsonNoStore } from "@/lib/http-cache";
import { logPdfRuntimeFailure, getPdfFailureContext } from "@/lib/pdf/pdf-runtime-error";
import { createPdfTiming } from "@/lib/pdf/pdf-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type RouteContext = { params: Promise<{ shareToken: string }> };
const ROUTE = "/api/shared-contracts/[shareToken]/pdf";

export async function GET(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`shared-pdf:${ip}`, 20, 60_000)) {
    return failure("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  let shareToken: string | undefined;
  let contractId: string | undefined;

  try {
    const timing = createPdfTiming();
    timing.logEvent("request-start");

    ({ shareToken } = await context.params);
    if (!shareToken) return failure("계약 링크가 올바르지 않습니다", 400);

    const result = await loadActiveContractShareToken(shareToken);
    if (!result?.contract) {
      return failure("유효하지 않은 계약 링크입니다", 404);
    }

    const contract = result.contract;
    contractId = contract.id;
    timing.mark("contract-loaded");

    if (contract.status !== "COMPLETED") {
      return failure("계약이 완료되지 않았습니다", 409);
    }
    if (
      !contract.providerSignedAt ||
      !contract.customerSignedAt ||
      !contract.providerSignaturePath ||
      !contract.customerSignaturePath
    ) {
      return failure("양측 서명이 완료된 후 최종 PDF를 다운로드할 수 있습니다", 409);
    }
    if (!contract.signedSnapshot) {
      return jsonNoStore(
        { success: false, message: "최종 계약서를 생성하지 못했습니다." },
        500
      );
    }

    const { buffer, contract: signedContract } = await generateSignedPdfFromSnapshot(
      contract.id,
      timing
    );
    const filename = buildContractPdfFilename({
      companyName: signedContract.companyName,
      representativeName: signedContract.customerSignerName ?? signedContract.contactName,
      contractNumber: signedContract.contractNumber,
      contractDate:
        signedContract.customerSignedAt ??
        signedContract.providerSignedAt ??
        signedContract.startDate,
      variant: "signed",
    });
    const download = request.nextUrl.searchParams.get("download") === "1";
    timing.mark("response-ready");

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: download ? pdfDownloadHeaders(filename) : pdfInlineHeaders(filename),
    });
  } catch (err) {
    logPdfRuntimeFailure(ROUTE, err, getPdfFailureContext(err));
    return jsonNoStore(
      { success: false, message: "최종 계약서를 생성하지 못했습니다." },
      500
    );
  }
}
