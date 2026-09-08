import { normalizeCustomerType } from "@/lib/customer-type";

/** DB contactName = 대표자명, contactTitle = 담당자명 */
export function serializeContract<
  T extends {
    customerType?: string | null;
    companyName: string;
    contactName: string | null;
    contactTitle?: string | null;
  },
>(contract: T) {
  const customerType = normalizeCustomerType(contract.customerType);
  return {
    ...contract,
    customerType,
    representativeName:
      customerType === "INDIVIDUAL" ? contract.companyName : contract.contactName,
    contactName: contract.contactTitle ?? null,
  };
}

export function representativeToDbFields(data: {
  customerType?: string;
  companyName: string;
  representativeName?: string | null;
  contactName?: string | null;
}) {
  const customerType = normalizeCustomerType(data.customerType);

  if (customerType === "INDIVIDUAL") {
    const name = data.companyName.trim();
    return {
      contactName: name,
      contactTitle: null as string | null,
    };
  }

  const representativeName = data.representativeName?.trim();
  const contactPerson = data.contactName?.trim() || null;
  return {
    contactName: representativeName,
    contactTitle: contactPerson,
  };
}

export function contractRegistrationFields(data: {
  customerType?: string;
  businessNumber?: string | null;
  corporateRegistrationNumber?: string | null;
}) {
  const customerType = normalizeCustomerType(data.customerType);
  return {
    businessNumber:
      customerType === "INDIVIDUAL" ? null : data.businessNumber?.trim() || null,
    corporateRegistrationNumber:
      customerType === "CORPORATION" ? data.corporateRegistrationNumber?.trim() || null : null,
  };
}
