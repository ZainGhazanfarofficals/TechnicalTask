import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError } from "./errors";
import { createSession } from "./session";
import type { LoginInput, RegisterInput } from "@/lib/shared/schemas";

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const publicUser = { id: true, name: true, email: true, role: true } as const;

export async function login({ email, password, as }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  // One generic message for: unknown email, wrong password, wrong portal (user logging in as admin).
  if (!user || !ok || (as === "admin" && user.role !== "ADMIN")) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  await createSession(user.id);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Public sign-up always creates a USER. Admins are provisioned via the seed script. */
export async function register({ name, email, password }: RegisterInput) {
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: "USER" },
    select: publicUser,
  }).catch((e) => {
    // Don't reveal whether the email exists beyond what sign-up inherently must.
    if (e?.code === "P2002") throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    throw e;
  });
  await createSession(user.id);
  return user;
}
