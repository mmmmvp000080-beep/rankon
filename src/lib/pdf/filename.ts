import { PROVIDER_COMPANY_DISPLAY_NAME } from "@/lib/provider-company-display";

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export type ContractPdfFilenameVariant = "draft" | "signed";

export interface ContractPdfFilenameInput {
  companyName?: string | null;
  representativeName?: string | null;
  contractNumber?: string | null;
  contractDate?: string | Date | null;
  variant?: ContractPdfFilenameVariant;
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(INVALID_FILENAME_CHARS, "").replace(/\s+/g, " ").trim();
}

function formatContractDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

/**
 * Builds a human-readable Korean PDF filename for download.
 * Examples:
 * - 랭크온_계약서_디온의원_홍길동_2026-08-14.pdf
 * - 랭크온_계약서_디온의원_초안_2026-08-14.pdf
 */
export function buildContractPdfFilename(input: ContractPdfFilenameInput): string {
  const variant = input.variant ?? "signed";
  const parts = [PROVIDER_COMPANY_DISPLAY_NAME, "계약서"];

  const company = sanitizeFilenamePart(String(input.companyName ?? ""));
  if (company) parts.push(company);

  if (variant === "draft") {
    parts.push("초안");
  } else {
    const representative = sanitizeFilenamePart(String(input.representativeName ?? ""));
    if (representative) parts.push(representative);
  }

  const datePart = formatContractDate(input.contractDate);
  if (datePart) {
    parts.push(datePart);
  } else {
    const contractNumber = sanitizeFilenamePart(String(input.contractNumber ?? ""));
    if (contractNumber) parts.push(contractNumber);
  }

  return `${parts.join("_")}.pdf`;
}
