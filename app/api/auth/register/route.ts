import { registerSchema } from "@/lib/shared/schemas";
import { register } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { json, parseBody, route } from "@/lib/server/route";

export const POST = route({}, async ({ req }) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  return json(await register(await parseBody(req, registerSchema)), { status: 201 });
});
