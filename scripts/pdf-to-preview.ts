import fs from "fs/promises";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";

// pdfjs-dist legacy build for Node
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");

const QA_DIR = path.join(process.cwd(), "storage", "pdf-qa");
const OUT_DIR = path.join(QA_DIR, "previews");

async function renderPdfPreview(pdfName: string, maxPages = 2) {
  const pdfPath = path.join(QA_DIR, pdfName);
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  await fs.mkdir(OUT_DIR, { recursive: true });

  const count = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const outName = pdfName.replace(".pdf", `-page${i}.png`);
    await fs.writeFile(path.join(OUT_DIR, outName), canvas.toBuffer("image/png"));
    console.log("Wrote", outName);
  }
}

async function main() {
  const pdfs = [
    "1-management-draft.pdf",
    "2-guarantee-draft.pdf",
    "5-signed-complete.pdf",
  ];
  for (const pdf of pdfs) {
    await renderPdfPreview(pdf, 2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
