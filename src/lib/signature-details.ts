import { displayPhone } from "@/lib/display-phone";
import { CustomerType, normalizeCustomerType } from "@/lib/customer-type";

export interface SignatureDetailRow {
  label: string;
  value: string;
  hidden?: boolean;
}

export interface SignaturePartyDetailsInput {
  representative: string;
  phone?: string | null;
  businessNumber?: string | null;
  corporateRegistrationNumber?: string | null;
  address?: string | null;
  customerType?: CustomerType | string | null;
}

const EMPTY_ROW: SignatureDetailRow = { label: "", value: "", hidden: true };

export function buildProviderSignatureRows(party: SignaturePartyDetailsInput): SignatureDetailRow[] {
  return [
    { label: "대표자", value: party.representative || "-" },
    { label: "사업자등록번호", value: displayPhone(party.businessNumber) },
    { label: "주소", value: displayPhone(party.address) },
    { label: "대표번호", value: displayPhone(party.phone) },
  ];
}

export function buildCustomerSignatureRows(party: SignaturePartyDetailsInput): SignatureDetailRow[] {
  const type = normalizeCustomerType(party.customerType);

  if (type === "INDIVIDUAL") {
    return [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, { label: "대표번호", value: displayPhone(party.phone) }];
  }

  if (type === "SOLE_PROPRIETOR") {
    return [
      { label: "대표자", value: party.representative || "-" },
      { label: "사업자등록번호", value: displayPhone(party.businessNumber) },
      EMPTY_ROW,
      { label: "대표번호", value: displayPhone(party.phone) },
    ];
  }

  return [
    { label: "대표자", value: party.representative || "-" },
    { label: "사업자등록번호", value: displayPhone(party.businessNumber) },
    { label: "법인등록번호", value: displayPhone(party.corporateRegistrationNumber) },
    { label: "대표번호", value: displayPhone(party.phone) },
  ];
}
