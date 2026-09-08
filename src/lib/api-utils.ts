import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { failure } from "@/lib/api-response";

export async function requireAdminApi() {
  const session = await getSession();
  if (!session) {
    return { error: failure("로그인이 필요합니다", 401), session: null };
  }
  return { error: null, session };
}

export async function parseJson<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
