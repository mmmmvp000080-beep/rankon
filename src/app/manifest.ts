import type { MetadataRoute } from "next";
import { BRAND_ORANGE } from "@/lib/logo-assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RankOn",
    short_name: "RankOn",
    description: "랭크온 전자계약 및 파일 제출",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F6F2",
    theme_color: BRAND_ORANGE,
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
