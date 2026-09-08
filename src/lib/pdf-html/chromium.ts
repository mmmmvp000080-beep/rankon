import "server-only";
import fs from "fs";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { logApiError, logStep } from "@/lib/api-error-log";
import { PROVIDER_COMPANY_PDF_FOOTER_LABEL } from "@/lib/provider-company-display";
import { attachPdfFailureContext } from "@/lib/pdf/pdf-runtime-error";
import type { PdfTiming } from "@/lib/pdf/pdf-timing";
import { PDF_KOREAN_FONT_FAMILY } from "@/lib/pdf-html/pdf-fonts";

const LOCAL_BROWSER_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

let vercelExecutablePathPromise: Promise<string> | null = null;

function resolveLocalExecutablePath(): string {
  for (const candidate of LOCAL_BROWSER_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    "Chromium/Chrome 실행 파일을 찾을 수 없습니다. PUPPETEER_EXECUTABLE_PATH 환경 변수를 설정하세요."
  );
}

async function resolveVercelExecutablePath(timing?: PdfTiming): Promise<string> {
  const remotePackUrl = process.env.CHROMIUM_REMOTE_EXEC_PATH?.trim();

  if (!remotePackUrl) {
    throw new Error(
      "CHROMIUM_REMOTE_EXEC_PATH is required for PDF generation on Vercel. " +
        "Use a Chromium 133 remote pack compatible with @sparticuz/chromium-min@133.0.0."
    );
  }

  timing?.logEvent("chromium-path-start");

  if (!vercelExecutablePathPromise) {
    vercelExecutablePathPromise = (async () => {
      chromium.setGraphicsMode = false;
      return chromium.executablePath(remotePackUrl);
    })();
  }

  const executablePath = await vercelExecutablePathPromise;
  timing?.mark("chromium-path-ready");
  return executablePath;
}

export async function launchPdfBrowser(timing?: PdfTiming) {
  if (process.env.VERCEL === "1") {
    const executablePath = await resolveVercelExecutablePath(timing);

    console.log("[PDF Chromium Runtime]", {
      mode: "vercel-remote-pack",
      executablePathResolved: true,
      remotePackConfigured: true,
    });

    return puppeteer.launch({
      executablePath,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });
  }

  return puppeteer.launch({
    executablePath: resolveLocalExecutablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });
}

function footerTemplate(contractNumber: string): string {
  const safeNumber = contractNumber.replace(/[<>&"]/g, "");
  return `
    <div style="width:100%;font-size:7pt;color:#9A9EA6;font-family:Arial,sans-serif;padding:0 15mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;">
      <span>${PROVIDER_COMPANY_PDF_FOOTER_LABEL} · ${safeNumber}</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  `;
}

export async function generatePdfFromHtml(
  html: string,
  contractNumber: string,
  timing?: PdfTiming
): Promise<Buffer> {
  logStep("PDF Generation", "Render PDF", "START", { contractNumber, htmlLength: html.length });

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  let executablePathOk = false;
  let browserLaunchOk = false;
  let stage = "chromium-path";

  try {
    stage = "browser-launch";
    browser = await launchPdfBrowser(timing);
    executablePathOk = true;
    browserLaunchOk = true;
    timing?.mark("browser-launched");

    stage = "page-create";
    const page = await browser.newPage();
    timing?.mark("page-created");

    stage = "set-content";
    await page.setContent(html, {
      waitUntil: process.env.VERCEL === "1" ? "domcontentloaded" : "networkidle0",
      timeout: 60_000,
    });
    timing?.mark("html-set");

    stage = "fonts-ready";
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]);

    const fontValidation = await page.evaluate((family) => {
      const koreanSample = "가나다라마바사";
      const fontAvailable = document.fonts.check(`16px "${family}"`);
      let koreanRenderable = false;

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = `16px "${family}", sans-serif`;
          const withFont = ctx.measureText(koreanSample).width;
          ctx.font = "16px sans-serif";
          const fallback = ctx.measureText(koreanSample).width;
          koreanRenderable = withFont > 0 && withFont !== fallback;
        }
      } catch {
        koreanRenderable = false;
      }

      return {
        documentFontsReady: document.fonts.status === "loaded",
        fontAvailable,
        koreanRenderable,
      };
    }, PDF_KOREAN_FONT_FAMILY);

    timing?.logEvent(`document-fonts-ready: ${fontValidation.documentFontsReady}`);
    timing?.logEvent(`Korean font availability: ${fontValidation.fontAvailable && fontValidation.koreanRenderable}`);
    timing?.mark("fonts-ready");

    stage = "pdf-generate";
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: footerTemplate(contractNumber),
      margin: {
        top: "14mm",
        right: "15mm",
        bottom: "18mm",
        left: "15mm",
      },
    });
    timing?.mark("pdf-generated");

    const buffer = Buffer.from(pdfBytes);
    logStep("PDF Generation", "Render PDF", "SUCCESS", { bytes: buffer.length });
    return buffer;
  } catch (err) {
    logStep("PDF Generation", "Render PDF", "FAIL", { contractNumber });
    logApiError("PDF Generation Render PDF", err, { contractNumber });
    throw attachPdfFailureContext(err, {
      stage,
      elapsedMs: timing?.elapsedMs(),
      executablePathOk,
      browserLaunchOk,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
      timing?.mark("browser-closed");
    }
  }
}
