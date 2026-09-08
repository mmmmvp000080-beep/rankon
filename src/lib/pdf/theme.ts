import { PROVIDER_CONTRACT_INTRO } from "@/lib/provider-company-display";

/** Premium PDF palette — ivory / charcoal / RankOn orange */
export const PDF_THEME = {
  white: { r: 0.992, g: 0.988, b: 0.98 },
  charcoal: { r: 0.106, g: 0.114, b: 0.129 },
  muted: { r: 0.55, g: 0.58, b: 0.64 },
  blue: { r: 0.961, g: 0.467, b: 0.035 },
  panelBg: { r: 0.969, g: 0.961, b: 0.941 },
  rule: { r: 0.89, g: 0.871, b: 0.835 },
  draft: { r: 0.72, g: 0.74, b: 0.78 },
} as const;

export const PDF_PAGE = {
  width: 595.28,
  height: 841.89,
  marginTop: 42,
  marginBottom: 40,
  marginLeft: 46,
  marginRight: 46,
  footerY: 22,
  footerH: 20,
} as const;

export const PDF_TYPE = {
  heroTitle: 26,
  heroLine2: 26,
  section: 12,
  panelLabel: 7.5,
  panelValue: 10,
  panelValueAmount: 10.5,
  body: 10,
  articleNum: 11,
  articleTitle: 13.5,
  articleBody: 10,
  caption: 8,
  metaLabel: 7.5,
  metaValue: 9,
  sigTitle: 16,
  sigSubtitle: 9,
  recordLabel: 7.5,
  recordValue: 7.5,
  brandTag: 7,
  lineHeight: 1.6,
  articleLineHeight: 1.62,
  sectionGap: 14,
  panelPad: 14,
  articleNumCol: 24,
  articleGap: 8,
  summaryRowH: 34,
  summaryLabelGap: 13,
  serviceIconGap: 12,
  serviceRowH: 17,
  serviceColGap: 20,
  sigImageW: 140,
  sigImageH: 70,
} as const;

export const INTRO_LINE = PROVIDER_CONTRACT_INTRO;

export const MANAGEMENT_SERVICES = [
  "네이버 플레이스 관리",
  "플레이스 최적화",
  "플레이스 운영 관리",
  "리뷰 관리",
  "이미지 관리",
  "게시글 관리",
  "플레이스 품질 개선",
] as const;

export const GUARANTEE_SERVICES = [
  "계약서에 기재된 키워드 기준",
  "네이버 플레이스 상위 5위 진입 목표",
  "상위 5위 진입 확인 후 입금",
  "계약서에 명시된 조건에 따라 진행",
] as const;

export const SERVICE_TYPE_LABEL = {
  NAVER_PLACE_MONTHLY_MANAGEMENT: "월관리",
  NAVER_PLACE_MONTHLY_GUARANTEE: "월 순위보장",
} as const;
