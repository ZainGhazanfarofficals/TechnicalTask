import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/shared/constants";

export type Session = { id: string; role: Role; name: string | null; email: string };

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 8; // 8h

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set (>= 32 chars).");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Resolves the current user from the cookie, re-reading the DB so role changes/deletions apply immediately. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, name: true, email: true },
    });
    return user;
  } catch {
    return null;
  }
}
