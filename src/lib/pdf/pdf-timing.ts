export type PdfTiming = {
  logEvent: (label: string) => void;
  mark: (label: string) => void;
  elapsedMs: () => number;
};

export function createPdfTiming(): PdfTiming {
  const start = Date.now();

  return {
    logEvent(label: string) {
      console.log(`[PDF Timing] ${label}`);
    },
    mark(label: string) {
      console.log(`[PDF Timing] ${label}: ${Date.now() - start}ms`);
    },
    elapsedMs() {
      return Date.now() - start;
    },
  };
}
