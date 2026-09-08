import "server-only";
import fs from "fs/promises";
import path from "path";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { CONTRACT_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { resolveSignatureDataUrl } from "@/lib/signature-storage";
import type { PdfCompanyInfo, PdfContractInput, PdfDocumentType } from "@/lib/pdf/types";
import type { PdfTiming } from "@/lib/pdf/pdf-timing";
import type { ContractPdfViewModel } from "./types";
import { loadPdfKoreanFonts } from "./pdf-fonts";
import {
  PROVIDER_COMPANY_DISPLAY_NAME,
  PROVIDER_CONTRACT_INTRO,
  displayProviderCompanyInText,
} from "@/lib/provider-company-display";

const LOGO_PATH = path.join(process.cwd(), "public", "brand", "rankon-logo-on-light.png");
const BRAND_NAME = PROVIDER_COMPANY_DISPLAY_NAME;
const INTRO = PROVIDER_CONTRACT_INTRO;

const MANAGEMENT_SERVICES = [
  "네이버 플레이스 관리",
  "플레이스 최적화",
  "플레이스 운영 관리",
  "리뷰 관리",
  "이미지 관리",
  "게시글 관리",
  "운영 상태 점검",
];

const GUARANTEE_SERVICES = [
  "계약서에 기재된 키워드 기준",
  "네이버 플레이스 상위 5위 진입 목표",
  "상위 5위 진입 확인 후 입금",
  "계약서에 명시된 조건에 따라 진행",
];

function sanitizeClauseContent(content: string): string {
  return content
    .split("\n")
    .filter((line) => !/^[■☐☑☒✓●]\s*/u.test(line.trim()))
    .map((line) => line.replace(/^[■☐☑☒✓●]\s*/u, ""))
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function toDataUrl(stored: string | null | undefined): Promise<string | null> {
  return resolveSignatureDataUrl(stored);
}

function statusLabel(type: PdfDocumentType, status?: string | null): string {
  if (type === "SIGNED") return "체결 완료";
  if (status && STATUS_LABELS[status]) return STATUS_LABELS[status];
  return "서명 전";
}

export async function buildContractPdfViewModel(
  type: PdfDocumentType,
  company: PdfCompanyInfo,
  contract: PdfContractInput,
  generatedAt = new Date(),
  timing?: PdfTiming
): Promise<ContractPdfViewModel> {
  const isGuarantee = contract.contractType === "NAVER_PLACE_MONTHLY_GUARANTEE";
  const [logoBuf, providerSig, customerSig, pdfFonts] = await Promise.all([
    fs.readFile(LOGO_PATH).catch(() => null),
    toDataUrl(contract.providerSignaturePath),
    toDataUrl(contract.customerSignaturePath),
    loadPdfKoreanFonts(),
  ]);

  timing?.logEvent(`font-source-loaded: ${pdfFonts.loaded}`);
  timing?.logEvent(`font-bytes: ${pdfFonts.totalBytes}`);

  const faceByWeight = new Map(pdfFonts.faces.map((face) => [face.weight, face.dataUrl]));
  const fontRegularUrl = faceByWeight.get(400) ?? "";
  const fontMediumUrl = faceByWeight.get(500) ?? "";
  const fontSemiBoldUrl = faceByWeight.get(600) ?? "";
  const fontBoldUrl = faceByWeight.get(700) ?? "";

  const clauses = [...contract.clauses]
    .filter((c) => !c.title.includes("특약") && c.title !== "서비스 내용")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c, i) => ({
      num: String(i + 1).padStart(2, "0"),
      title: c.title,
      content: displayProviderCompanyInText(sanitizeClauseContent(c.content)),
    }));

  const productName =
    contract.items[0]?.name ||
    CONTRACT_TYPE_LABELS[contract.contractType || ""] ||
    "네이버 플레이스 서비스";

  const signed = type === "SIGNED";
  const completedAt = contract.customerSignedAt || contract.providerSignedAt || null;

  return {
    type,
    generatedAt: generatedAt.toISOString(),
    logoDataUrl: logoBuf ? `data:image/png;base64,${logoBuf.toString("base64")}` : "",
    fontRegularUrl,
    fontMediumUrl,
    fontSemiBoldUrl,
    fontBoldUrl,
    company: {
      name: BRAND_NAME,
      representativeName: company.representativeName || "-",
    },
    contractNumber: contract.contractNumber,
    statusLabel: statusLabel(type, contract.status),
    titleLine1: "네이버 플레이스",
    titleLine2: isGuarantee ? "월 순위보장 계약서" : "월관리 계약서",
    introLine: INTRO,
    isGuarantee,
    customerCompany: contract.companyName,
    representativeName: contract.representativeName || "-",
    phone: contract.phone,
    productName,
    contractPeriod: `${formatDate(contract.startDate)} — ${formatDate(contract.endDate)}`,
    totalAmount: formatCurrency(contract.totalAmount),
    vatLabel: contract.vatIncluded ? "VAT 포함" : "VAT 별도",
    serviceTypeLabel: isGuarantee ? "월 순위보장" : "월관리",
    serviceScopeTitle: isGuarantee ? "서비스 조건" : "서비스 범위",
    serviceItems: isGuarantee ? GUARANTEE_SERVICES : MANAGEMENT_SERVICES,
    clauses,
    specialTerms: contract.specialTerms?.trim() || null,
    signatures: {
      provider: {
        name: BRAND_NAME,
        representative: company.representativeName || "-",
        businessNumber: company.businessNumber || null,
        address: company.address || null,
        phone: company.phone || null,
        signedAt: contract.providerSignedAt ? formatDateTime(contract.providerSignedAt) : null,
        imageDataUrl: providerSig,
        showImage: signed && Boolean(providerSig),
      },
      customer: {
        name: contract.companyName,
        representative: contract.representativeName || "-",
        phone: contract.phone || null,
        businessNumber: contract.businessNumber || null,
        corporateRegistrationNumber: contract.corporateRegistrationNumber || null,
        customerType: contract.customerType || "INDIVIDUAL",
        signedAt: contract.customerSignedAt ? formatDateTime(contract.customerSignedAt) : null,
        imageDataUrl: customerSig,
        showImage: signed && Boolean(customerSig),
      },
    },
    verification: signed
      ? {
          completedAt: completedAt ? formatDateTime(completedAt) : null,
          contractNumber: contract.contractNumber,
          sha256: contract.signedContentHash || null,
          statusLabel: statusLabel(type, contract.status),
        }
      : null,
  };
}
