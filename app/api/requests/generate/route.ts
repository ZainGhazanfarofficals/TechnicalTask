import { generateRequestSchema } from "@/lib/shared/schemas";
import { generateRequestFromIssue } from "@/lib/server/ai";
import { parseBody, route } from "@/lib/server/route";
import { rateLimit } from "@/lib/server/rate-limit";

// POST /api/requests/generate — { issue } → { title, description, priority } (nothing is saved)
export const POST = route({ auth: ["USER"] }, async ({ req, session }) => {
  rateLimit(`ai:${session.id}`, 10, 60_000);
  const { issue } = await parseBody(req, generateRequestSchema);
  return generateRequestFromIssue(issue);
});
