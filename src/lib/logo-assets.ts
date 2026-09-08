export type LogoColor = "original" | "white" | "symbol";
export type LogoLayout = "full" | "symbol";

export const LOGO_FILES = {
  source: "/brand/rankon-logo-source.png",
  transparent: "/brand/rankon-logo-transparent.png",
  onLight: "/brand/rankon-logo-on-light.png",
  full: "/brand/logo-full.png",
  symbol: "/brand/rankon-symbol-transparent.png",
} as const;

export const LOGO_ASPECT = {
  full: 3.2963,
  symbol: 0.672,
} as const;

export const LOGO_HEIGHT = {
  sidebar: 40,
  sidebarCollapsed: 32,
  login: 72,
  loginMobile: 56,
  portal: 44,
  portalMobile: 40,
  pdf: 32,
} as const;

/** RankOn orange sampled from the official logo */
export const BRAND_ORANGE = "#F57709";
export const BRAND_ORANGE_LIGHT = "#FF9A3D";
export const BRAND_ORANGE_DEEP = "#DC6A08";

export function getLogoSrc(layout: LogoLayout, color: LogoColor): string {
  if (layout === "symbol" || color === "symbol") return LOGO_FILES.symbol;
  if (color === "white") return LOGO_FILES.transparent;
  return LOGO_FILES.onLight;
}

export function logoWidth(height: number, aspectRatio: number): number {
  return Math.round(height * aspectRatio);
}
