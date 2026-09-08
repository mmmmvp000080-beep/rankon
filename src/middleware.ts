import { SESSION_COOKIE } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session-token";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (token) {
        const session = await verifySession(token);
        if (session) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
      return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
