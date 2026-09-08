import { PDFPage, RGB } from "pdf-lib";
import { PDF_THEME } from "./theme";
import { toRgb } from "./text-engine";

export function drawRule(page: PDFPage, x1: number, x2: number, y: number, color = PDF_THEME.rule) {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: 0.5,
    color: toRgb(color),
  });
}

export function drawPanel(
  page: PDFPage,
  x: number,
  yBottom: number,
  width: number,
  height: number,
  fill = PDF_THEME.panelBg
) {
  page.drawRectangle({
    x,
    y: yBottom,
    width,
    height,
    color: toRgb(fill),
    borderColor: toRgb(PDF_THEME.rule),
    borderWidth: 0.5,
  });
}

/** Small filled circle bullet */
export function drawBullet(page: PDFPage, cx: number, cy: number, r = 2, color = PDF_THEME.blue) {
  page.drawCircle({ x: cx, y: cy, size: r, color: toRgb(color) });
}

/** Check mark drawn with lines (no unicode) */
export function drawCheckMark(page: PDFPage, x: number, y: number, size = 8, color = PDF_THEME.blue) {
  const c = toRgb(color);
  page.drawLine({
    start: { x: x + size * 0.15, y: y + size * 0.45 },
    end: { x: x + size * 0.4, y: y + size * 0.2 },
    thickness: 1.2,
    color: c,
  });
  page.drawLine({
    start: { x: x + size * 0.4, y: y + size * 0.2 },
    end: { x: x + size * 0.88, y: y + size * 0.78 },
    thickness: 1.2,
    color: c,
  });
}

/** Check inside light circle */
export function drawCheckItem(page: PDFPage, x: number, y: number) {
  page.drawCircle({
    x: x + 5,
    y: y + 5,
    size: 5,
    borderColor: toRgb(PDF_THEME.blue),
    borderWidth: 0.8,
    color: toRgb(PDF_THEME.white),
  });
  drawCheckMark(page, x + 1, y + 1, 8, PDF_THEME.blue);
}

export function drawSigFrame(page: PDFPage, x: number, yBottom: number, w: number, h: number) {
  page.drawRectangle({
    x,
    y: yBottom,
    width: w,
    height: h,
    color: toRgb(PDF_THEME.white),
    borderColor: toRgb(PDF_THEME.rule),
    borderWidth: 0.5,
  });
}
