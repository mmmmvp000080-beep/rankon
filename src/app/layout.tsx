import type { Metadata, Viewport } from "next";
import "./globals.css";
import { resolveMetadataBase, ROOT_SITE_ICONS } from "@/lib/site-metadata";
import { PretendardStylesheet, PRETENDARD_STYLESHEET_HREF } from "@/components/brand/PretendardStylesheet";
import { BRAND_ORANGE } from "@/lib/logo-assets";

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "RankOn — 계약관리 시스템",
  description: "랭크온 전자계약 관리 플랫폼",
  manifest: "/manifest.webmanifest",
  icons: ROOT_SITE_ICONS,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_ORANGE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <PretendardStylesheet />
        <noscript>
          <link rel="stylesheet" href={PRETENDARD_STYLESHEET_HREF} />
        </noscript>
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
