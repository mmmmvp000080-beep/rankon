export type PdfFailureContext = {
  stage?: string;
  elapsedMs?: number;
  executablePathOk?: boolean;
  browserLaunchOk?: boolean;
};

export function attachPdfFailureContext(error: unknown, context: PdfFailureContext): unknown {
  if (error instanceof Error) {
    Object.assign(error, { pdfFailureContext: context });
  }
  return error;
}

export function getPdfFailureContext(error: unknown): PdfFailureContext | undefined {
  if (error && typeof error === "object" && "pdfFailureContext" in error) {
    return (error as Error & { pdfFailureContext: PdfFailureContext }).pdfFailureContext;
  }
  return undefined;
}

export function logPdfRuntimeFailure(
  route: string,
  error: unknown,
  context?: PdfFailureContext
): void {
  const fromError = getPdfFailureContext(error);
  const merged = { ...fromError, ...context };

  console.error("[PDF Runtime Failure]", {
    route,
    stage: merged.stage,
    elapsedMs: merged.elapsedMs,
    executablePathOk: merged.executablePathOk,
    browserLaunchOk: merged.browserLaunchOk,
    errorName: error instanceof Error ? error.name : "Unknown",
    errorMessage: error instanceof Error ? error.message : String(error),
  });
}
