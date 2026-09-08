/**
 * Client-safe public app URL for share links displayed in the admin UI.
 * Prefers NEXT_PUBLIC_APP_URL (Production fixed domain) over window.location.origin.
 */
export function getPublicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function buildContractShareUrl(token: string): string {
  const base = getPublicAppUrl();
  return base ? `${base}/contract/${token}` : `/contract/${token}`;
}

export function buildUploadShareUrl(token: string): string {
  const base = getPublicAppUrl();
  return base ? `${base}/submit/${token}` : `/submit/${token}`;
}
