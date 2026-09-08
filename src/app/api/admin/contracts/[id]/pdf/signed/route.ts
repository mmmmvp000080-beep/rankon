import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { failure } from "@/lib/api-response";
import { generateSignedPdfFromSnapshot } from "@/lib/pdf/pdf-service";
import { buildContractPdfFilename } from "@/lib/pdf/filename";
import { pdfDownloadHeaders } from "@/lib/pdf/response-headers";
import { logPdfRuntimeFailure, getPdfFailureContext } from "@/lib/pdf/pdf-runtime-error";
import { createPdfTiming } from "@/lib/pdf/pdf-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };
const ROUTE = "/api/admin/contracts/[id]/pdf/signed";

async function generateSignedPdfResponse(contractId: string, timing: ReturnType<typeof createPdfTiming>) {
  const { buffer, contract } = await generateSignedPdfFromSnapshot(contractId, timing);
  const filename = buildContractPdfFilename({
    companyName: contract.companyName,
    representativeName: contract.customerSignerName ?? contract.contactName,
    contractNumber: contract.contractNumber,
    contractDate: contract.customerSignedAt ?? contract.providerSignedAt ?? contract.startDate,
    variant: "signed",
  });
  timing.mark("response-ready");
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: pdfDownloadHeaders(filename),
  });
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const timing = createPdfTiming();
    timing.logEvent("request-start");

    const { id } = await context.params;
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);
    timing.mark("contract-loaded");
    if (contract.status !== "COMPLETED" || !contract.signedSnapshot) {
      return failure("고객 서명이 완료된 계약만 완료 PDF를 생성할 수 있습니다");
    }

    return await generateSignedPdfResponse(id, timing);
  } catch (err) {
    logPdfRuntimeFailure(ROUTE, err, getPdfFailureContext(err));
    return failure("PDF 생성 중 오류가 발생했습니다", 500);
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const timing = createPdfTiming();
    timing.logEvent("request-start");

    const { id } = await context.params;
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) return failure("계약을 찾을 수 없습니다", 404);
    timing.mark("contract-loaded");
    if (contract.status !== "COMPLETED" || !contract.signedSnapshot) {
      return failure("고객 서명이 완료된 계약만 완료 PDF를 생성할 수 있습니다");
    }

    return await generateSignedPdfResponse(id, timing);
  } catch (err) {
    logPdfRuntimeFailure(ROUTE, err, getPdfFailureContext(err));
    return failure("PDF 생성 중 오류가 발생했습니다", 500);
  }
}
