import { z } from "zod";

export const MOBILE_PHONE_REGEX = /^010-\d{4}-\d{4}$/;
export const MOBILE_PHONE_HINT = "010-1234-5678 형식으로 입력해 주세요.";

export function extractPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 11);
}

export function formatMobilePhone(raw: string): string {
  const digits = extractPhoneDigits(raw);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export const mobilePhoneSchema = z
  .string()
  .min(1, "대표번호를 입력하세요")
  .regex(MOBILE_PHONE_REGEX, MOBILE_PHONE_HINT);

export const LANDLINE_PHONE_REGEX = /^0\d{1,2}-\d{3,4}-\d{4}$/;

export function formatRepresentativePhone(raw: string): string {
  const digits = extractPhoneDigits(raw);
  if (!digits) return "";
  if (digits.startsWith("010")) return formatMobilePhone(raw);
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export const representativePhoneSchema = z
  .string()
  .min(1, "대표번호를 입력하세요")
  .refine(
    (v) => MOBILE_PHONE_REGEX.test(v) || LANDLINE_PHONE_REGEX.test(v),
    "대표번호 형식이 올바르지 않습니다."
  );
