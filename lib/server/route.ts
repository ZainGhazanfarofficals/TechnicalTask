import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { ZodError, type ZodType } from "zod";
import { ApiError, badRequest, forbidden, unauthorized } from "./errors";
import { getSession, type Session } from "./session";
import type { Role } from "@/lib/shared/constants";

const MAX_BODY_BYTES = 10_000;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return NextResponse.json(data, { ...init, headers });
}

function errorResponse(err: unknown) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
    err = badRequest("Validation failed.", fields);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") err = new ApiError(404, "NOT_FOUND", "Not found.");
    else if (err.code === "P2002") err = new ApiError(409, "CONFLICT", "Resource already exists.");
  }

  // Database unreachable / starting up → tell clients to retry rather than 500.
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P1002", "P1017"].includes(err.code))
  ) {
    err = new ApiError(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable.", { retryAfter: 2 });
  }

  if (err instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (err.extra?.retryAfter) headers["Retry-After"] = String(err.extra.retryAfter);
    return json(
      { error: { code: err.code, message: err.message, fields: err.extra?.fields } },
      { status: err.status, headers },
    );
  }

  // Never leak internals to the client.
  console.error("Unhandled API error:", err);
  return json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });
}

/** CSRF defence-in-depth (on top of SameSite=Lax): state-changing calls must come from our own origin. */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  // Compare hosts via headers: req.nextUrl.origin reflects the bind address (0.0.0.0) in containers.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw forbidden("Cross-origin request blocked.");
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw badRequest("Malformed JSON.");
  }
  return schema.parse(raw);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}

type Options = { auth?: boolean | Role[] };
type Ctx<P> = { req: NextRequest; params: P; session: Session };

/**
 * Wraps a route handler with: same-origin check, authentication/role gate,
 * and uniform error → JSON mapping. Handlers just return data (or a Response).
 */
export function route<P = Record<string, never>>(
  options: Options,
  handler: (ctx: Ctx<P>) => Promise<unknown>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      if (!SAFE_METHODS.has(req.method)) assertSameOrigin(req);

      let session = null as Session | null;
      if (options.auth) {
        session = await getSession();
        if (!session) throw unauthorized();
        if (Array.isArray(options.auth) && !options.auth.includes(session.role)) throw forbidden();
      }

      const params = (await context?.params) ?? ({} as P);
      const result = await handler({ req, params, session: session as Session });
      return result instanceof Response ? result : json(result);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
