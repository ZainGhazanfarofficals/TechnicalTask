import type { ZodType } from "zod";
import { ApiClientError } from "./http";

export type FieldErrors = Record<string, string>;

/** Validates with the same schema the API uses. Returns parsed data or per-field messages. */
export function validateWith<T>(schema: ZodType<T>, values: unknown):
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) errors[String(issue.path[0] ?? "_")] ??= issue.message;
  return { ok: false, errors };
}

/** Field-level messages from a failed API call; everything else is already shown as a toast. */
export function apiFieldErrors(err: unknown): FieldErrors {
  return err instanceof ApiClientError ? (err.fields ?? {}) : {};
}
