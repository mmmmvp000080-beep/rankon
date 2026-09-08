export const SESSION_COOKIE = "rankon_admin_session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;
export const MAX_SIGNATURE_DATA_URL_SIZE = 3 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "작성중",
  PROVIDER_SIGNED: "공급자 서명 완료",
  CUSTOMER_PENDING: "고객 서명 대기",
  COMPLETED: "계약 완료",
  CANCELLED: "취소",
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  NAVER_PLACE_MONTHLY_MANAGEMENT: "네이버 플레이스 월관리",
  NAVER_PLACE_MONTHLY_GUARANTEE: "월 순위보장",
};

export const CONTRACT_TYPE_TITLES: Record<string, string> = {
  NAVER_PLACE_MONTHLY_MANAGEMENT: "네이버 플레이스 월관리 계약서",
  NAVER_PLACE_MONTHLY_GUARANTEE: "네이버 플레이스 월 순위보장 계약서",
};

export const CONTRACT_TYPE_PDF_SUBTITLE: Record<string, string> = {
  NAVER_PLACE_MONTHLY_MANAGEMENT: "월관리",
  NAVER_PLACE_MONTHLY_GUARANTEE: "월 순위보장",
};

export const CONTRACT_TYPE_BADGE: Record<string, string> = {
  NAVER_PLACE_MONTHLY_MANAGEMENT: "월관리",
  NAVER_PLACE_MONTHLY_GUARANTEE: "월보장",
};

export const ELECTRONIC_CONTRACT_NOTICE =
  "본 계약은 전자문서로 작성되며 전자서명을 통해 체결됩니다.\n\n전자문서 및 전자서명은 관계 법령에 따라 계약 체결의 증빙자료로 활용됩니다.\n\n계약 내용을 충분히 확인한 후 서명을 진행해 주시기 바랍니다.";

export const PDF_ELECTRONIC_FOOTER_NOTICE =
  "본 계약서는 전자문서로 작성되었으며, 전자서명을 통해 체결되었습니다.\n\n계약 체결 일시와 서명 정보는 시스템에 안전하게 보관됩니다.";

export const FILE_CATEGORY_LABELS: Record<string, string> = {
  BUSINESS_LICENSE: "사업자등록증",
  BANKBOOK: "통장사본",
  OTHER: "기타",
};
