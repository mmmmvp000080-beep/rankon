import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminCredentials } from "@/lib/auth";
import { success, failure } from "@/lib/api-response";
import { loginSchema } from "@/lib/validation/schemas";
import { createSession, sessionCookieOptions } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return failure("너무 많은 로그인 시도입니다. 잠시 후 다시 시도하세요.", 429);
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    const admin = await verifyAdminCredentials(parsed.data.username, parsed.data.password);
    if (!admin) {
      return failure("로그인 정보가 올바르지 않습니다", 401);
    }

    const token = await createSession({ adminId: admin.id, username: admin.username });
    const cookieStore = await cookies();
    const opts = sessionCookieOptions(token);
    cookieStore.set(opts.name, opts.value, {
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      path: opts.path,
      maxAge: opts.maxAge,
    });

    return success({ username: admin.username });
  } catch {
    return failure("로그인 처리 중 오류가 발생했습니다", 500);
  }
}
