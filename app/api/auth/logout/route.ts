import { destroySession } from "@/lib/server/session";
import { route } from "@/lib/server/route";

export const POST = route({}, async () => {
  await destroySession();
  return { ok: true };
});
