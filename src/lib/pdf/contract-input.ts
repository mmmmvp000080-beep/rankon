import { Contract, ContractItem, ContractClause } from "@/generated/prisma/client";
import { PdfContractInput } from "@/lib/pdf/types";
import { normalizeCustomerType } from "@/lib/customer-type";

export function contractToPdfInput(
  contract: Contract & { items: ContractItem[]; clauses?: ContractClause[] }
): PdfContractInput {
  return {
    contractNumber: contract.contractNumber,
    companyName: contract.companyName ?? "",
    representativeName: contract.contactName ?? "",
    contactName: contract.contactTitle ?? null,
    contactTitle: contract.contactTitle ?? null,
    phone: contract.phone ?? "",
    email: contract.email ?? null,
    businessNumber: contract.businessNumber ?? null,
    corporateRegistrationNumber: contract.corporateRegistrationNumber ?? null,
    customerType: normalizeCustomerType(contract.customerType),
    address: contract.address ?? null,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate.toISOString(),
    totalAmount: contract.totalAmount ?? 0,
    vatIncluded: contract.vatIncluded ?? true,
    contractType: contract.contractType ?? "NAVER_PLACE_MONTHLY_MANAGEMENT",
    contractPurpose: contract.contractPurpose ?? null,
    paymentTerms: contract.paymentTerms ?? null,
    specialTerms: contract.specialTerms ?? null,
    items: (contract.items ?? []).map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    clauses: (contract.clauses || []).map((c) => ({
      title: c.title,
      content: c.content,
      sortOrder: c.sortOrder,
    })),
    providerSignerName: contract.providerSignerName ?? null,
    providerSignerTitle: contract.providerSignerTitle ?? null,
    providerSignedAt: contract.providerSignedAt?.toISOString() ?? null,
    providerSignaturePath: contract.providerSignaturePath ?? null,
    customerSignerName: contract.customerSignerName ?? null,
    customerSignerTitle: contract.customerSignerTitle ?? null,
    customerSignedAt: contract.customerSignedAt?.toISOString() ?? null,
    customerSignaturePath: contract.customerSignaturePath ?? null,
    signedContentHash: contract.signedContentHash ?? null,
    status: contract.status ?? null,
  };
}
