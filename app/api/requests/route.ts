import { createRequestSchema, listRequestsQuery } from "@/lib/shared/schemas";
import { createRequest, listRequests } from "@/lib/server/requests";
import { json, parseBody, parseQuery, route } from "@/lib/server/route";

export const GET = route({ auth: true }, ({ req, session }) =>
  listRequests(session, parseQuery(req, listRequestsQuery)),
);

// Admins only moderate requests; creation is for users (also enforced in permissions.ts).
export const POST = route({ auth: ["USER"] }, async ({ req, session }) =>
  json(await createRequest(session, await parseBody(req, createRequestSchema)), { status: 201 }),
);
