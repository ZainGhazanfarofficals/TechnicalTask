import { prisma } from "@/lib/prisma";
import { notFound } from "./errors";
import { assertCan, visibleTo } from "./permissions";
import type { Session } from "./session";
import type { CreateRequestInput, UpdateRequestInput } from "@/lib/shared/schemas";
import type { RequestStatus } from "@/lib/shared/constants";

const select = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { name: true, email: true } },
} as const;

export async function listRequests(
  session: Session,
  q: { status?: RequestStatus; page: number; pageSize: number },
) {
  const where = { ...visibleTo(session), ...(q.status && { status: q.status }) };
  const [items, total] = await prisma.$transaction([
    prisma.serviceRequest.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.serviceRequest.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize };
}

/** Loads one request the session may see; non-owners get a 404, not a 403. */
export async function getRequest(session: Session, id: string) {
  const found = await prisma.serviceRequest.findFirst({
    where: { id, ...visibleTo(session) },
    select,
  });
  if (!found) throw notFound("Request not found.");
  return found;
}

export function createRequest(session: Session, input: CreateRequestInput) {
  assertCan(session, "create");
  return prisma.serviceRequest.create({
    data: { ...input, createdById: session.id },
    select,
  });
}

export async function updateRequest(session: Session, id: string, input: UpdateRequestInput) {
  const existing = await getRequest(session, id);
  assertCan(session, "update", existing.createdById);
  if (input.status !== undefined) assertCan(session, "setStatus");
  return prisma.serviceRequest.update({ where: { id }, data: input, select });
}

export async function deleteRequest(session: Session, id: string) {
  assertCan(session, "delete");
  await prisma.serviceRequest.delete({ where: { id } }); // P2025 → 404 via route()
}
