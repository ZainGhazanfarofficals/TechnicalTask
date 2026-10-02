import { forbidden } from "./errors";
import type { Session } from "./session";

export type Action = "create" | "view" | "update" | "delete" | "setStatus";

/**
 * Admin: view / update / delete everything, but never create requests.
 * User: create, and view + update their own requests (never delete, never set status).
 */
export function can(session: Session, action: Action, ownerId?: string): boolean {
  if (session.role === "ADMIN") return action !== "create";
  switch (action) {
    case "create":
      return true;
    case "view":
    case "update":
      return ownerId === session.id;
    default:
      return false;
  }
}

export function assertCan(session: Session, action: Action, ownerId?: string) {
  if (!can(session, action, ownerId)) throw forbidden();
}

/** Prisma `where` fragment that limits a query to what the session may see (404 instead of leaking existence). */
export const visibleTo = (session: Session) =>
  session.role === "ADMIN" ? {} : { createdById: session.id };
