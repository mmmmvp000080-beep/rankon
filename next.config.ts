import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/contracts/[id]/pdf/draft": ["./public/fonts/**", "./public/brand/**"],
    "/api/admin/contracts/[id]/pdf/signed": ["./public/fonts/**", "./public/brand/**"],
    "/api/shared-contracts/[shareToken]/pdf": ["./public/fonts/**", "./public/brand/**"],
    "/api/shared-contracts/[shareToken]/pdf/draft": ["./public/fonts/**", "./public/brand/**"],
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/og/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/icon.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
