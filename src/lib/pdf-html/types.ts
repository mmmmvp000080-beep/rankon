import type { PdfDocumentType } from "@/lib/pdf/types";

export interface PdfSignatureParty {
  name: string;
  representative: string;
  phone: string | null;
  businessNumber?: string | null;
  corporateRegistrationNumber?: string | null;
  address?: string | null;
  customerType?: string | null;
  signedAt: string | null;
  imageDataUrl: string | null;
  showImage: boolean;
}

export interface ContractPdfViewModel {
  type: PdfDocumentType;
  generatedAt: string;
  logoDataUrl: string;
  fontRegularUrl: string;
  fontMediumUrl: string;
  fontSemiBoldUrl: string;
  fontBoldUrl: string;
  company: {
    name: string;
    representativeName: string;
  };
  contractNumber: string;
  statusLabel: string;
  titleLine1: string;
  titleLine2: string;
  introLine: string;
  isGuarantee: boolean;
  customerCompany: string;
  representativeName: string;
  phone: string;
  productName: string;
  contractPeriod: string;
  totalAmount: string;
  vatLabel: string;
  serviceTypeLabel: string;
  serviceScopeTitle: string;
  serviceItems: string[];
  clauses: Array<{ num: string; title: string; content: string }>;
  specialTerms: string | null;
  signatures: {
    provider: PdfSignatureParty;
    customer: PdfSignatureParty;
  };
  verification: {
    completedAt: string | null;
    contractNumber: string;
    sha256: string | null;
    statusLabel: string;
  } | null;
}
