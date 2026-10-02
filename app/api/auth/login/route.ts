import { loginSchema } from "@/lib/shared/schemas";
import { login } from "@/lib/server/auth";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { parseBody, route } from "@/lib/server/route";

export const POST = route({}, async ({ req }) => {
  const input = await parseBody(req, loginSchema);
  const key = `login:${clientIp(req)}:${input.email}`;
  rateLimit(key, 5, 15 * 60_000); // counts attempts…
  const user = await login(input);
  resetRateLimit(key); // …but a successful sign-in clears the counter
  return user;
});
