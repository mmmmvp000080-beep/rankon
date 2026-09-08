import "server-only";
import { buildContractPdfViewModel } from "@/lib/pdf-html/build-view-model";
import { generatePdfFromHtml } from "@/lib/pdf-html/chromium";
import { renderContractHtml } from "@/lib/pdf-html/render-html.server";
import { snapshotToPdfInput } from "./snapshot-input";
import { logStep } from "@/lib/api-error-log";
import type { PdfTiming } from "@/lib/pdf/pdf-timing";
import type { PdfClause, PdfCompanyInfo, PdfContractInput, PdfDocumentType } from "./types";

export type { PdfClause, PdfCompanyInfo, PdfContractInput, PdfDocumentType };
export { snapshotToPdfInput, snapshotToPdfInput as snapshotToPdfData };

export async function generateContractPdf(
  type: PdfDocumentType,
  company: PdfCompanyInfo,
  contract: PdfContractInput,
  timing?: PdfTiming
): Promise<Buffer> {
  logStep("PDF Generation", "Build view model", "START", {
    type,
    contractNumber: contract.contractNumber,
  });
  const viewModel = await buildContractPdfViewModel(type, company, contract, new Date(), timing);
  timing?.mark("view-model-built");
  logStep("PDF Generation", "Build view model", "SUCCESS", {
    type,
    contractNumber: contract.contractNumber,
  });

  logStep("PDF Generation", "Render HTML", "START", { type, contractNumber: contract.contractNumber });
  const html = renderContractHtml(viewModel);
  logStep("PDF Generation", "Render HTML", "SUCCESS", {
    type,
    contractNumber: contract.contractNumber,
    htmlLength: html.length,
  });

  return generatePdfFromHtml(html, contract.contractNumber, timing);
}
