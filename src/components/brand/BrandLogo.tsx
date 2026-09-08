import Image from "next/image";
import {
  getLogoSrc,
  logoWidth,
  LOGO_ASPECT,
  type LogoColor,
  type LogoLayout,
} from "@/lib/logo-assets";
import { PROVIDER_PORTAL_BRAND_LABEL } from "@/lib/provider-company-display";

export interface BrandLogoProps {
  layout?: LogoLayout;
  /** white = on dark backgrounds, original = on light backgrounds */
  color?: LogoColor;
  height: number;
  className?: string;
  priority?: boolean;
  maxWidth?: number;
}

export function BrandLogo({
  layout = "full",
  color = "original",
  height,
  className = "",
  priority = false,
  maxWidth,
}: BrandLogoProps) {
  const src = getLogoSrc(layout, color);
  const aspect = layout === "symbol" ? LOGO_ASPECT.symbol : LOGO_ASPECT.full;
  const width = logoWidth(height, aspect);

  return (
    <Image
      src={src}
      alt={PROVIDER_PORTAL_BRAND_LABEL}
      width={width}
      height={height}
      priority={priority}
      unoptimized
      sizes={`${Math.min(maxWidth ?? width, width)}px`}
      className={`object-contain object-left ${className}`}
      style={{
        height,
        width: "auto",
        maxWidth: maxWidth ?? "100%",
        maxHeight: height,
      }}
    />
  );
}
