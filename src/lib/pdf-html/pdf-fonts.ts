import "server-only";
import fs from "fs/promises";
import path from "path";

export const PDF_KOREAN_FONT_FAMILY = "RankOnPdfKorean";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

const FONT_WEIGHTS = {
  regular: {
    weight: 400,
    candidates: ["Pretendard-Regular.woff2", "NotoSansKR-Regular.ttf", "NotoSansKR-Regular.otf"],
  },
  medium: {
    weight: 500,
    candidates: ["Pretendard-Medium.woff2", "NotoSansKR-Regular.ttf", "NotoSansKR-Regular.otf"],
  },
  semibold: {
    weight: 600,
    candidates: ["Pretendard-SemiBold.woff2", "NotoSansKR-Bold.ttf", "NotoSansKR-Bold.otf"],
  },
  bold: {
    weight: 700,
    candidates: ["Pretendard-Bold.woff2", "NotoSansKR-Bold.ttf", "NotoSansKR-Bold.otf"],
  },
} as const;

export type PdfFontFace = {
  weight: number;
  dataUrl: string;
  format: "woff2" | "truetype" | "opentype";
};

export type PdfKoreanFonts = {
  family: typeof PDF_KOREAN_FONT_FAMILY;
  faces: PdfFontFace[];
  totalBytes: number;
  loaded: boolean;
};

let fontsPromise: Promise<PdfKoreanFonts> | null = null;

function mimeForFormat(format: PdfFontFace["format"]): string {
  if (format === "woff2") return "font/woff2";
  if (format === "opentype") return "font/otf";
  return "font/ttf";
}

function formatForFilename(name: string): PdfFontFace["format"] {
  if (name.endsWith(".woff2")) return "woff2";
  if (name.endsWith(".otf")) return "opentype";
  return "truetype";
}

async function resolveFontFile(
  candidates: readonly string[]
): Promise<{ buffer: Buffer; format: PdfFontFace["format"] } | null> {
  for (const name of candidates) {
    const filePath = path.join(FONTS_DIR, name);
    try {
      const stat = await fs.stat(filePath);
      if (stat.size < 1000) continue;
      const head = await fs.readFile(filePath, { encoding: "utf8", flag: "r" }).catch(() => "");
      if (head.includes("<!DOCTYPE") || head.includes("Couldn't find")) continue;
      return {
        buffer: await fs.readFile(filePath),
        format: formatForFilename(name),
      };
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function loadPdfKoreanFonts(): Promise<PdfKoreanFonts> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const faces: PdfFontFace[] = [];
      let totalBytes = 0;

      for (const key of Object.keys(FONT_WEIGHTS) as Array<keyof typeof FONT_WEIGHTS>) {
        const { weight, candidates } = FONT_WEIGHTS[key];
        const resolved = await resolveFontFile(candidates);
        if (!resolved) continue;

        totalBytes += resolved.buffer.length;
        const mime = mimeForFormat(resolved.format);
        faces.push({
          weight,
          format: resolved.format,
          dataUrl: `data:${mime};base64,${resolved.buffer.toString("base64")}`,
        });
      }

      return {
        family: PDF_KOREAN_FONT_FAMILY,
        faces,
        totalBytes,
        loaded: faces.length > 0,
      };
    })();
  }

  return fontsPromise;
}
