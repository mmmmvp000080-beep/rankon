import { ContractType } from "@/generated/prisma/client";

export const CONTRACT_TYPES = [
  "NAVER_PLACE_MONTHLY_MANAGEMENT",
  "NAVER_PLACE_MONTHLY_GUARANTEE",
] as const;

export type AppContractType = (typeof CONTRACT_TYPES)[number];

export const DEFAULT_CONTRACT_TYPE: AppContractType = "NAVER_PLACE_MONTHLY_MANAGEMENT";

export function normalizeContractType(value?: string | null): ContractType {
  if (value === "NAVER_PLACE_MONTHLY_GUARANTEE") return value;
  return "NAVER_PLACE_MONTHLY_MANAGEMENT";
}

export function parseContractTypeQuery(value: string | null | undefined): ContractType | null {
  if (value === "NAVER_PLACE_MONTHLY_MANAGEMENT" || value === "NAVER_PLACE_MONTHLY_GUARANTEE") {
    return value;
  }
  return null;
}

export function isContractType(value: string): value is ContractType {
  return value === "NAVER_PLACE_MONTHLY_MANAGEMENT" || value === "NAVER_PLACE_MONTHLY_GUARANTEE";
}
