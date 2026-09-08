import fs from "fs/promises";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");

async function extractText(pdfName: string) {
  const pdfPath = path.join(process.cwd(), "storage", "pdf-qa", pdfName);
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((item: { str: string }) => item.str).join("");
  return { pages: doc.numPages, sample: text.slice(0, 200) };
}

async function main() {
  for (const pdf of [
    "1-management-draft.pdf",
    "2-guarantee-draft.pdf",
    "5-signed-complete.pdf",
  ]) {
    const result = await extractText(pdf);
    console.log(pdf, result.pages, "pages");
    console.log("  text:", result.sample.replace(/\s+/g, " ").trim());
  }
}

main().catch(console.error);
