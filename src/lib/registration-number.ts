import { z } from "zod";

export const BUSINESS_REG_DIGITS = 10;
export const CORPORATE_REG_DIGITS = 13;

export const BUSINESS_REG_REGEX = /^\d{3}-\d{2}-\d{5}$/;
export const CORPORATE_REG_REGEX = /^\d{6}-\d{7}$/;

export const BUSINESS_REG_HINT = "123-45-67890 형식으로 입력해 주세요.";
export const CORPORATE_REG_HINT = "123456-1234567 형식으로 입력해 주세요.";

export function extractRegistrationDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function formatBusinessRegistration(raw: string): string {
  const digits = extractRegistrationDigits(raw).slice(0, BUSINESS_REG_DIGITS);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatCorporateRegistration(raw: string): string {
  const digits = extractRegistrationDigits(raw).slice(0, CORPORATE_REG_DIGITS);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

export const businessRegistrationSchema = z
  .string()
  .min(1, "사업자등록번호를 입력하세요")
  .regex(BUSINESS_REG_REGEX, "사업자등록번호 10자리를 정확히 입력해주세요.");

export const corporateRegistrationSchema = z
  .string()
  .min(1, "법인등록번호를 입력하세요")
  .regex(CORPORATE_REG_REGEX, "법인등록번호 13자리를 정확히 입력해주세요.");

export const optionalBusinessRegistrationSchema = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || BUSINESS_REG_REGEX.test(v), "사업자등록번호 10자리를 정확히 입력해주세요.");

export const optionalCorporateRegistrationSchema = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || CORPORATE_REG_REGEX.test(v), "법인등록번호 13자리를 정확히 입력해주세요.");
