import fs from "fs/promises";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont } from "pdf-lib";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

export interface KoreanFontSet {
  regular: PDFFont;
  medium: PDFFont;
  semibold: PDFFont;
  bold: PDFFont;
}

const FILE_CANDIDATES = {
  regular: ["NotoSansKR-Regular.ttf", "NotoSansKR-Regular.otf"],
  bold: ["NotoSansKR-Bold.ttf", "NotoSansKR-Bold.otf"],
  medium: ["NotoSansKR-Medium.ttf", "NotoSansKR-Medium.otf"],
  semibold: ["NotoSansKR-SemiBold.ttf", "NotoSansKR-SemiBold.otf"],
} as const;

async function readFontFile(names: readonly string[]): Promise<Buffer | null> {
  for (const name of names) {
    try {
      const filePath = path.join(FONT_DIR, name);
      const bytes = await fs.readFile(filePath);
      if (bytes.length < 10000) continue;
      if (bytes.slice(0, 15).toString("utf8").includes("<!DOCTYPE")) continue;
      return bytes;
    } catch {
      // try next
    }
  }
  return null;
}

export async function embedKoreanFonts(doc: PDFDocument): Promise<KoreanFontSet> {
  doc.registerFontkit(fontkit);

  const regularBytes = await readFontFile(FILE_CANDIDATES.regular);
  const boldBytes = await readFontFile(FILE_CANDIDATES.bold);
  if (!regularBytes || !boldBytes) {
    throw new Error("한글 PDF 폰트(Regular/Bold)를 읽을 수 없습니다. public/fonts/ 를 확인하세요.");
  }

  const embedOpts = { subset: false as const };
  const regular = await doc.embedFont(regularBytes, embedOpts);
  const bold = await doc.embedFont(boldBytes, embedOpts);

  const mediumBytes = await readFontFile(FILE_CANDIDATES.medium);
  const semiboldBytes = await readFontFile(FILE_CANDIDATES.semibold);

  const medium =
    mediumBytes && !mediumBytes.equals(regularBytes)
      ? await doc.embedFont(mediumBytes, embedOpts)
      : regular;
  const semibold =
    semiboldBytes && !semiboldBytes.equals(boldBytes)
      ? await doc.embedFont(semiboldBytes, embedOpts)
      : bold;

  return { regular, medium, semibold, bold };
}
