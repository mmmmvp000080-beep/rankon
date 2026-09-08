import { BRAND } from "@/lib/brand";
import { BRAND_ORANGE, BRAND_ORANGE_DEEP, LOGO_FILES } from "@/lib/logo-assets";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

interface ShareOgCardProps {
  logoSrc: string;
  title: string;
  description: string;
  eyebrow?: string;
}

/** Dark invitation card matching the RankOn logo */
export function ShareOgCard({ logoSrc, title, description, eyebrow }: ShareOgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#000000",
        padding: "64px 72px",
      }}
    >
      <img
        src={logoSrc}
        alt=""
        width={520}
        height={158}
        style={{ objectFit: "contain", objectPosition: "left center", marginTop: 24 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ width: 120, height: 3, background: BRAND_ORANGE }} />
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 20, color: "#A3A3A3", lineHeight: 1.45 }}>
          {description}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 600,
            color: BRAND_ORANGE_DEEP,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow ?? `${BRAND.name.toUpperCase()} ELECTRONIC CONTRACT`}
        </div>
      </div>
    </div>
  );
}

export const OG_LOGO_SRC = LOGO_FILES.transparent;
