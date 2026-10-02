export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: { fields?: Record<string, string>; retryAfter?: number },
  ) {
    super(message);
  }
}

export const unauthorized = (message = "Authentication required.") =>
  new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You don't have permission to do that.") =>
  new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found.") => new ApiError(404, "NOT_FOUND", message);
export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiError(400, "BAD_REQUEST", message, { fields });
