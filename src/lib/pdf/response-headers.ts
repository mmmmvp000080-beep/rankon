import { NO_STORE_HEADERS } from "@/lib/http-cache";

function asciiFilename(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return ascii || "contract.pdf";
}

export function pdfContentDisposition(filename: string, download: boolean): string {
  const type = download ? "attachment" : "inline";
  const ascii = asciiFilename(filename);
  const encoded = encodeURIComponent(filename);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export function pdfInlineHeaders(filename: string) {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": pdfContentDisposition(filename, false),
    ...NO_STORE_HEADERS,
  };
}

export function pdfDownloadHeaders(filename: string) {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": pdfContentDisposition(filename, true),
    ...NO_STORE_HEADERS,
  };
}
