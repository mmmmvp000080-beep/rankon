import type { PdfClause, PdfContractInput } from "./types";

export function snapshotToPdfInput(
  snapshot: {
    contractNumber: string;
    companyName: string;
    representativeName: string;
    contactName: string | null;
    contactTitle: string | null;
    phone: string;
    email: string | null;
    businessNumber: string | null;
    corporateRegistrationNumber?: string | null;
    customerType?: string | null;
    address: string | null;
    startDate: string;
    endDate: string;
    totalAmount: number;
    vatIncluded: boolean;
    contractType: string;
    contractPurpose?: string | null;
    paymentTerms: string | null;
    specialTerms: string | null;
    items: PdfContractInput["items"];
    clauses?: PdfClause[];
    providerSignerName: string | null;
    providerSignerTitle: string | null;
    providerSignedAt: string | null;
  },
  extras?: Partial<PdfContractInput>
): PdfContractInput {
  return {
    contractNumber: snapshot.contractNumber,
    companyName: snapshot.companyName,
    representativeName: snapshot.representativeName,
    contactName: snapshot.contactName,
    contactTitle: snapshot.contactTitle,
    phone: snapshot.phone,
    email: snapshot.email,
    businessNumber: snapshot.businessNumber,
    corporateRegistrationNumber: snapshot.corporateRegistrationNumber ?? null,
    customerType: snapshot.customerType ?? "INDIVIDUAL",
    address: snapshot.address,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    totalAmount: snapshot.totalAmount,
    vatIncluded: snapshot.vatIncluded,
    contractType: snapshot.contractType,
    contractPurpose: snapshot.contractPurpose,
    paymentTerms: snapshot.paymentTerms,
    specialTerms: snapshot.specialTerms,
    items: snapshot.items,
    clauses: snapshot.clauses || [],
    providerSignerName: snapshot.providerSignerName,
    providerSignerTitle: snapshot.providerSignerTitle,
    providerSignedAt: snapshot.providerSignedAt,
    ...extras,
  };
}
