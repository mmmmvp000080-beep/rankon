import type { Metadata } from "next";
import { headers } from "next/headers";
import { getAppUrl } from "@/lib/app-url";

export const CONTRACT_SHARE_OG = {
  title: "랭크온 전자계약",
  description: "안전하고 간편하게 계약 내용을 확인하고 서명하세요.",
  siteName: "RankOn",
} as const;

export const SUBMIT_SHARE_OG = {
  title: "랭크온 파일 제출",
  description: "요청받은 파일을 안전하게 제출해 주세요.",
  siteName: "RankOn",
} as const;

/** Bump when OG PNG assets change so link previews (Kakao, etc.) re-fetch the image. */
export const OG_IMAGE_CACHE_VERSION = "4";

/** Static OG images — always public, no auth, crawler-safe PNG endpoints */
export const OG_STATIC_IMAGES = {
  contract: `/og/contract-share.png?v=${OG_IMAGE_CACHE_VERSION}`,
  submit: `/og/submit-share.png?v=${OG_IMAGE_CACHE_VERSION}`,
} as const;

export const OG_IMAGE_DIMENSIONS = {
  width: 1200,
  height: 630,
  type: "image/png" as const,
};

export const ROOT_SITE_ICONS: NonNullable<Metadata["icons"]> = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/icon.png", type: "image/png", sizes: "512x512" },
  ],
  apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  shortcut: ["/favicon.ico"],
};

function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function normalizeMetadataBase(url: string): URL | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/** Env-based fallback when request headers are unavailable (build/scripts). */
export function resolveMetadataBase(): URL | undefined {
  return normalizeMetadataBase(getAppUrl());
}

/**
 * Request-time metadata base for share/crawler pages.
 * Uses the incoming Host / x-forwarded-* headers so og:image is always the public HTTPS domain.
 */
export async function resolveMetadataBaseFromHeaders(): Promise<URL | undefined> {
  try {
    const headerStore = await headers();
    const host = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() || headerStore.get("host");
    if (!host) return resolveMetadataBase();

    const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      forwardedProto ||
      (isLocalhostHostname(host.split(":")[0]) ? "http" : "https");

    return normalizeMetadataBase(`${proto}://${host}`);
  } catch {
    return resolveMetadataBase();
  }
}

function buildAbsoluteOgImageUrl(metadataBase: URL | undefined, assetPath: string): string | undefined {
  if (!metadataBase) return undefined;
  return new URL(assetPath, metadataBase).toString();
}

function buildShareMetadata({
  token,
  pagePath,
  ogAssetPath,
  ogContent,
  metadataBase,
}: {
  token: string;
  pagePath: "/contract" | "/submit";
  ogAssetPath: string;
  ogContent: { title: string; description: string; siteName: string };
  metadataBase?: URL;
}): Metadata {
  const base = metadataBase ?? resolveMetadataBase();
  const pageUrl = base ? new URL(`${pagePath}/${token}`, base).toString() : undefined;
  const ogImageUrl = buildAbsoluteOgImageUrl(base, ogAssetPath);

  return {
    metadataBase: base,
    title: ogContent.title,
    description: ogContent.description,
    icons: ROOT_SITE_ICONS,
    openGraph: {
      title: ogContent.title,
      description: ogContent.description,
      type: "website",
      siteName: ogContent.siteName,
      url: pageUrl,
      locale: "ko_KR",
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                secureUrl: ogImageUrl.startsWith("https://") ? ogImageUrl : undefined,
                width: OG_IMAGE_DIMENSIONS.width,
                height: OG_IMAGE_DIMENSIONS.height,
                alt: ogContent.title,
                type: OG_IMAGE_DIMENSIONS.type,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogContent.title,
      description: ogContent.description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export function buildContractShareMetadata(token: string, metadataBase?: URL): Metadata {
  return buildShareMetadata({
    token,
    pagePath: "/contract",
    ogAssetPath: OG_STATIC_IMAGES.contract,
    ogContent: CONTRACT_SHARE_OG,
    metadataBase,
  });
}

export function buildSubmitShareMetadata(token: string, metadataBase?: URL): Metadata {
  return buildShareMetadata({
    token,
    pagePath: "/submit",
    ogAssetPath: OG_STATIC_IMAGES.submit,
    ogContent: SUBMIT_SHARE_OG,
    metadataBase,
  });
}

/** For diagnostics — shows the og:image URL shape for a given public host. */
export function describeContractOgImageUrl(publicOrigin: string, token = "example-token"): string {
  const base = normalizeMetadataBase(publicOrigin);
  if (!base) return "(invalid origin)";
  return buildAbsoluteOgImageUrl(base, OG_STATIC_IMAGES.contract) ?? "(missing)";
}
