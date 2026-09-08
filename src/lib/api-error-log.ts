export function logApiError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  console.error(`[${context}]`, extra ?? {});
  console.error(error);
  if (error instanceof Error) {
    console.error(error.stack);
    console.error(error.message);
    console.error(error.cause);
  }
}

export function logStep(context: string, step: string, status: "START" | "SUCCESS" | "FAIL", extra?: Record<string, unknown>): void {
  const line = `[${context}] ${step} ${status}`;
  if (status === "FAIL") {
    console.error(line, extra ?? {});
  } else {
    console.log(line, extra ?? {});
  }
}
