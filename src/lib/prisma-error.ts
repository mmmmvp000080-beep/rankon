import { Prisma } from "@/generated/prisma/client";

export interface PrismaErrorDetail {
  type: string;
  code?: string;
  message: string;
  meta?: unknown;
  clientVersion?: string;
}

export function formatPrismaError(err: unknown): PrismaErrorDetail {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      type: "PrismaClientKnownRequestError",
      code: err.code,
      message: err.message,
      meta: err.meta,
      clientVersion: err.clientVersion,
    };
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      type: "PrismaClientValidationError",
      message: err.message,
    };
  }

  if (err instanceof Error) {
    return {
      type: err.name || "Error",
      message: err.message,
    };
  }

  return {
    type: "UnknownError",
    message: String(err),
  };
}

export function logServerError(context: string, err: unknown): PrismaErrorDetail {
  const detail = formatPrismaError(err);
  console.error(`[${context}]`, detail);
  if (err instanceof Error && err.stack) {
    console.error(`[${context}] stack:`, err.stack);
  }
  return detail;
}
