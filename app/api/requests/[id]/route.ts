import { requestId, updateRequestSchema } from "@/lib/shared/schemas";
import { deleteRequest, getRequest, updateRequest } from "@/lib/server/requests";
import { parseBody, route } from "@/lib/server/route";

type P = { id: string };

export const GET = route<P>({ auth: true }, ({ session, params }) =>
  getRequest(session, requestId.parse(params.id)),
);

export const PATCH = route<P>({ auth: true }, async ({ req, session, params }) =>
  updateRequest(session, requestId.parse(params.id), await parseBody(req, updateRequestSchema)),
);

export const DELETE = route<P>({ auth: ["ADMIN"] }, async ({ session, params }) => {
  await deleteRequest(session, requestId.parse(params.id));
  return { ok: true };
});
