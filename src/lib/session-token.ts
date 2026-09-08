import { SignJWT, jwtVerify } from "jose";
import { SESSION_DURATION_MS } from "./constants";

export interface SessionPayload {
  adminId: string;
  username: string;
}

export function sessionSecret() {
  return new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || "fallback-secret");
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_MS / 1000}s`)
    .sign(sessionSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.adminId || !payload.username) return null;
    return {
      adminId: String(payload.adminId),
      username: String(payload.username),
    };
  } catch {
    return null;
  }
}
