import { cookies } from "next/headers";
import { success } from "@/lib/api-response";
import { clearSessionCookieOptions } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  const opts = clearSessionCookieOptions();
  cookieStore.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return success({ loggedOut: true });
}
