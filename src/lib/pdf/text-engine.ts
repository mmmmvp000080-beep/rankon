import { PDFFont, RGB, rgb } from "pdf-lib";

export type ThemeColor = { r: number; g: number; b: number };

export function toRgb(color: ThemeColor): RGB {
  return rgb(color.r, color.g, color.b);
}

export function lineHeight(size: number, ratio: number): number {
  return size * ratio;
}

/** Collapse irregular whitespace — never inject extra spaces */
export function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/** Strip unicode box/check chars used in template clauses */
export function sanitizeClauseContent(content: string): string {
  return normalizeText(
    content
      .split("\n")
      .filter((line) => !/^[■☐☑☒✓●]\s*/u.test(line.trim()))
      .map((line) => line.replace(/^[■☐☑☒✓●]\s*/u, ""))
      .join("\n")
  );
}

/** Word wrap — one drawText call per line, single spaces only */
export function wrapText(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const lines: string[] = [];
  for (const paragraph of normalizeText(text).split("\n")) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    lines.push(...wrapParagraph(trimmed, maxWidth, font, size));
  }
  return lines;
}

function wrapParagraph(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
    } else {
      const parts = wrapByChars(word, maxWidth, font, size);
      lines.push(...parts.slice(0, -1));
      line = parts[parts.length - 1] || "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapByChars(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of [...text]) {
    const next = line + ch;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function textWidth(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(normalizeText(text), size);
}

export function measureWrappedHeight(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lhRatio: number
): number {
  const lines = wrapText(text, maxWidth, font, size);
  if (lines.length === 0) return 0;
  return lines.length * lineHeight(size, lhRatio);
}
