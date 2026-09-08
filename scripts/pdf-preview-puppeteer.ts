import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer-core";
import fsSync from "fs";

const QA_DIR = path.join(process.cwd(), "storage", "pdf-qa");
const OUT_DIR = path.join(QA_DIR, "previews");

function resolveExecutable(): string {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fsSync.existsSync(p)) return p;
  }
  throw new Error("Chrome/Edge not found");
}

async function previewPdf(name: string) {
  const pdfPath = path.join(QA_DIR, name);
  const browser = await puppeteer.launch({
    executablePath: resolveExecutable(),
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(`file:///${pdfPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
    await fs.mkdir(OUT_DIR, { recursive: true });
    const out = path.join(OUT_DIR, name.replace(".pdf", "-page1.png"));
    await page.screenshot({ path: out, fullPage: true });
    console.log("Wrote", out);
  } finally {
    await browser.close();
  }
}

async function main() {
  for (const pdf of [
    "1-management-draft.pdf",
    "2-guarantee-draft.pdf",
    "5-signed-complete.pdf",
  ]) {
    await previewPdf(pdf);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
