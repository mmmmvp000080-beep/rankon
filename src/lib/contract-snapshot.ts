import crypto from "crypto";
import { Contract, ContractItem, ContractClause } from "@/generated/prisma/client";
import { CustomerType, normalizeCustomerType } from "@/lib/customer-type";
import { getContractTypeLabel } from "@/lib/contract-template";

export interface SnapshotClause {
  title: string;
  content: string;
  sortOrder: number;
}

export interface ContractSnapshot {
  contractNumber: string;
  companyName: string;
  representativeName: string;
  contactName: string | null;
  contactTitle: string | null;
  phone: string;
  email: string | null;
  businessNumber: string | null;
  corporateRegistrationNumber?: string | null;
  customerType?: CustomerType;
  address: string | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  vatIncluded: boolean;
  contractPurpose: string | null;
  contractType: string;
  contractTypeLabel?: string;
  templateVersion?: string;
  paymentTerms: string | null;
  specialTerms: string | null;
  items: Array<{
    name: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    amount: number;
    sortOrder: number;
  }>;
  clauses: SnapshotClause[];
  providerSignerName: string | null;
  providerSignerTitle: string | null;
  providerSignedAt: string | null;
  /** Company settings at customer sign time (optional for legacy snapshots). */
  providerPhone?: string;
  providerBusinessNumber?: string;
  providerAddress?: string;
}

export interface CompanySnapshotInput {
  phone: string;
  businessNumber: string;
  address: string;
}

export function buildContractSnapshot(
  contract: Contract,
  items: ContractItem[],
  clauses: ContractClause[] = [],
  companySettings?: CompanySnapshotInput | null,
  templateVersion?: string | null
): ContractSnapshot {
  return {
    contractNumber: contract.contractNumber,
    companyName: contract.companyName,
    representativeName: contract.contactName ?? "",
    contactName: contract.contactTitle,
    contactTitle: contract.contactTitle,
    phone: contract.phone,
    email: contract.email,
    businessNumber: contract.businessNumber,
    corporateRegistrationNumber: contract.corporateRegistrationNumber,
    customerType: normalizeCustomerType(contract.customerType),
    address: contract.address,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate.toISOString(),
    totalAmount: contract.totalAmount,
    vatIncluded: contract.vatIncluded,
    contractPurpose: contract.contractPurpose,
    contractType: contract.contractType,
    contractTypeLabel: getContractTypeLabel(contract.contractType),
    templateVersion: templateVersion ?? undefined,
    paymentTerms: contract.paymentTerms,
    specialTerms: contract.specialTerms,
    items: items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        sortOrder: item.sortOrder,
      })),
    clauses: clauses
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        title: c.title,
        content: c.content,
        sortOrder: c.sortOrder,
      })),
    providerSignerName: contract.providerSignerName,
    providerSignerTitle: contract.providerSignerTitle,
    providerSignedAt: contract.providerSignedAt?.toISOString() ?? null,
    ...(companySettings
      ? {
          providerPhone: companySettings.phone,
          providerBusinessNumber: companySettings.businessNumber,
          providerAddress: companySettings.address,
        }
      : {}),
  };
}

export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`;
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",")}}`;
}

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
