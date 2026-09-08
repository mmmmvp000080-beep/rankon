export const CUSTOMER_TYPES = ["INDIVIDUAL", "SOLE_PROPRIETOR", "CORPORATION"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const DEFAULT_CUSTOMER_TYPE: CustomerType = "INDIVIDUAL";

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  INDIVIDUAL: "개인",
  SOLE_PROPRIETOR: "개인사업자",
  CORPORATION: "법인",
};

export function normalizeCustomerType(value?: string | null): CustomerType {
  if (value === "SOLE_PROPRIETOR" || value === "CORPORATION") return value;
  return "INDIVIDUAL";
}

export function customerDisplayNameLabel(type: CustomerType): string {
  switch (type) {
    case "INDIVIDUAL":
      return "성명";
    case "SOLE_PROPRIETOR":
      return "상호";
    case "CORPORATION":
      return "법인명";
  }
}
