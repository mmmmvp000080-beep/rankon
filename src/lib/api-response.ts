import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function failure(message: string, status = 400, error?: unknown) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(error !== undefined ? { error } : {}),
    },
    { status }
  );
}
