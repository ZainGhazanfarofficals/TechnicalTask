// Validation schemas shared by the API (authoritative) and the forms (fast feedback).
import { z } from "zod";
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "./constants";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/; // single-line text: none allowed
const CONTROL_CHARS_EXCEPT_NEWLINES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const singleLine = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`)
    .refine((v) => !CONTROL_CHARS.test(v), `${label} contains invalid characters.`);

const email = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .pipe(z.email("Enter a valid email address."));

export const loginSchema = z
  .strictObject({
    email,
    password: z.string({ error: "Password is required." }).min(1, "Password is required.").max(128),
    // Admin tab: the account must actually be an admin.
    as: z.enum(["admin"]).optional(),
  });

export const registerSchema = z.strictObject({
  name: singleLine("Name", 1, 80),
  email,
  password: z
    .string({ error: "Password is required." })
    .min(8, "Use at least 8 characters.")
    .max(128, "Password is too long.")
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Include at least one letter and one number."),
});

export const requestId = z.string().regex(/^[a-z0-9]{20,32}$/, "Invalid id.");

const title = singleLine("Title", 3, 120);
const description = z
  .string({ error: "Description is required." })
  .trim()
  .min(10, "Description must be at least 10 characters.")
  .max(2000, "Description must be at most 2000 characters.")
  .refine((v) => !CONTROL_CHARS_EXCEPT_NEWLINES.test(v), "Description contains invalid characters.");
const priority = z.enum(REQUEST_PRIORITIES);
const status = z.enum(REQUEST_STATUSES);

// strictObject rejects unknown keys → no mass assignment (e.g. createdById, role).
export const createRequestSchema = z.strictObject({
  title,
  description,
  priority: priority.default("MEDIUM"),
});

export const updateRequestSchema = z
  .strictObject({ title, description, priority, status })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");

export const listRequestsQuery = z.object({
  status: status.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

export const generateRequestSchema = z.strictObject({
  issue: singleLine("Issue", 10, 500),
});
