const LOCAL_DEV_FALLBACK = "http://localhost:3000";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function warnInvalidProductionUrl(appUrl: string): void {
  if (isProduction() && appUrl.includes("localhost")) {
    console.error("[Invalid Production App URL]", {
      appUrl,
      vercelUrl: process.env.VERCEL_URL,
      nodeEnv: process.env.NODE_ENV,
    });
  }
}

/**
 * Resolves the public app base URL for share links and absolute URLs.
 *
 * Fallback order:
 * 1. APP_URL
 * 2. NEXT_PUBLIC_APP_URL
 * 3. Request x-forwarded-host / host (+ x-forwarded-proto)
 * 4. VERCEL_URL
 * 5. http://localhost:3000 (local development only)
 */
export function getAppUrl(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost?.split(",")[0]?.trim() || request.headers.get("host");
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host?.includes("localhost") ? "http" : "https");

    if (host) {
      const appUrl = normalizeUrl(`${forwardedProto}://${host}`);
      warnInvalidProductionUrl(appUrl);
      return appUrl;
    }
  }

  const configuredUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl && !configuredUrl.includes("localhost") && !configuredUrl.includes("127.0.0.1")) {
    const appUrl = normalizeUrl(configuredUrl);
    warnInvalidProductionUrl(appUrl);
    return appUrl;
  }

  if (process.env.VERCEL_URL) {
    const appUrl = `https://${process.env.VERCEL_URL}`;
    warnInvalidProductionUrl(appUrl);
    return appUrl;
  }

  if (configuredUrl) {
    const appUrl = normalizeUrl(configuredUrl);
    warnInvalidProductionUrl(appUrl);
    return appUrl;
  }

  const appUrl = LOCAL_DEV_FALLBACK;
  warnInvalidProductionUrl(appUrl);
  return appUrl;
}
