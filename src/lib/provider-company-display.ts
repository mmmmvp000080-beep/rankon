/** Provider (our company) display name in contracts and PDFs — not stored in DB. */
export const PROVIDER_COMPANY_DISPLAY_NAME = "랭크온";

export const PROVIDER_COMPANY_PDF_HEADER_TAG = "RANKON ELECTRONIC CONTRACT";

export const PROVIDER_COMPANY_PDF_FOOTER_LABEL = "RankOn Electronic Contract";

export const PROVIDER_CONTRACT_INTRO =
  "랭크온과 고객 간의 네이버 플레이스 마케팅 서비스 계약 내용을 기록한 전자계약서입니다.";

export const PROVIDER_PORTAL_BRAND_LABEL = "RankOn";

const LEGACY_PROVIDER_BRAND_PATTERN =
  /ADNA|ADnA|\bADn\b|에드앤에이|AI Studio|닥터포워드|닥터포어드|Dr\.?\s*Forward/i;

/** Whether stored text still uses a legacy provider brand name. */
export function containsLegacyProviderBrand(text: string | null | undefined): boolean {
  if (!text) return false;
  return LEGACY_PROVIDER_BRAND_PATTERN.test(text);
}

/** Replace stored provider company name in clause/body text at render time only. */
export function displayProviderCompanyInText(text: string): string {
  return text
    .replace(/ADn이/g, `${PROVIDER_COMPANY_DISPLAY_NAME}이`)
    .replace(/\bADnA\b/g, PROVIDER_COMPANY_DISPLAY_NAME)
    .replace(/\bADNA\b/g, PROVIDER_COMPANY_DISPLAY_NAME)
    .replace(/\bADn\b/g, PROVIDER_COMPANY_DISPLAY_NAME)
    .replace(/에드앤에이/g, PROVIDER_COMPANY_DISPLAY_NAME)
    .replace(/AI Studio/g, PROVIDER_COMPANY_DISPLAY_NAME)
    .replace(/닥터포워드/g, PROVIDER_COMPANY_DISPLAY_NAME)
    .replace(/닥터포어드/g, PROVIDER_COMPANY_DISPLAY_NAME)
    .replace(/Dr\.?\s*Forward/gi, PROVIDER_PORTAL_BRAND_LABEL);
}
