export interface PdfClause {
  title: string;
  content: string;
  sortOrder: number;
}

export interface PdfCompanyInfo {
  companyName: string;
  representativeName: string;
  representativeTitle?: string | null;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
}

export interface PdfContractInput {
  contractNumber: string;
  companyName: string;
  representativeName: string;
  contactName?: string | null;
  contactTitle?: string | null;
  phone: string;
  email?: string | null;
  businessNumber?: string | null;
  corporateRegistrationNumber?: string | null;
  customerType?: string | null;
  address?: string | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  vatIncluded: boolean;
  contractType?: string;
  contractPurpose?: string | null;
  paymentTerms?: string | null;
  specialTerms?: string | null;
  status?: string | null;
  items: Array<{
    name: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  clauses: PdfClause[];
  providerSignerName?: string | null;
  providerSignerTitle?: string | null;
  providerSignedAt?: string | null;
  providerSignaturePath?: string | null;
  customerSignerName?: string | null;
  customerSignerTitle?: string | null;
  customerSignedAt?: string | null;
  customerSignaturePath?: string | null;
  signedContentHash?: string | null;
  customerSignIp?: string | null;
  customerSignUserAgent?: string | null;
}

export type PdfDocumentType = "DRAFT" | "SIGNED";
