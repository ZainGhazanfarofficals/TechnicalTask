import { toast } from "sonner";
import { backoffDelay, sleep } from "@/lib/shared/retry";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

type Options<T> = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  retries?: number;
  /** Shown as a success toast when the call succeeds (mutations). */
  successMessage?: string | ((data: T) => string);
};

const MAX_RETRY_DELAY_MS = 8_000;
const IDEMPOTENT = new Set(["GET", "PATCH", "DELETE"]);

/**
 * Only retry when it's safe and useful:
 *  - network failures, 408, 502/504 for idempotent methods
 *  - 429/503 for any method (the server says it did NOT process the request)
 */
function shouldRetry(method: string, status: number | null, retryAfterMs: number) {
  // A long Retry-After (e.g. login lockout) isn't worth waiting out; surface it to the user instead.
  if (retryAfterMs > MAX_RETRY_DELAY_MS) return false;
  if (status === 429 || status === 503) return true;
  if (!IDEMPOTENT.has(method)) return false;
  return status === null || status === 408 || status === 502 || status === 504;
}

const formatWait = (s: number) => (s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`);

function errorToast(err: ApiClientError, path: string) {
  // Same id → repeated identical failures (e.g. retried polling) update one toast instead of stacking.
  const id = `${err.code}:${path}`;
  if (err.status === 400 && err.fields) {
    toast.error("Please fix the highlighted fields.", { id });
  } else if (err.code === "NETWORK") {
    toast.error(err.message, { id, description: "We retried a few times without success." });
  } else if (err.status === 429) {
    toast.warning(err.message, { id, description: err.retryAfter ? `Try again in about ${formatWait(err.retryAfter)}.` : undefined });
  } else {
    toast.error(err.message, { id });
  }
}

export async function apiFetch<T>(path: string, opts: Options<T> = {}): Promise<T> {
  const { method = "GET", body, signal, retries = 3, successMessage } = opts;

  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(`/api${path}`, {
        method,
        signal,
        credentials: "same-origin",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      // network error: res stays null
    }

    if (res?.ok) {
      const data = (await res.json()) as T;
      if (successMessage) toast.success(typeof successMessage === "function" ? successMessage(data) : successMessage);
      return data;
    }

    const status = res?.status ?? null;
    // Honour Retry-After if the server sent one, otherwise back off exponentially.
    const retryAfterMs = Number(res?.headers.get("Retry-After")) * 1000 || 0;
    if (attempt < retries && shouldRetry(method, status, retryAfterMs)) {
      const delay = retryAfterMs > 0 ? retryAfterMs : backoffDelay(attempt);
      await sleep(delay, signal);
      continue;
    }

    const error = res
      ? await res.json().then(
          (d) => new ApiClientError(res.status, d?.error?.code ?? "UNKNOWN", d?.error?.message ?? "Something went wrong.", d?.error?.fields, Number(res.headers.get("Retry-After")) || undefined),
          () => new ApiClientError(res.status, "UNKNOWN", "Something went wrong."),
        )
      : new ApiClientError(0, "NETWORK", "Network error. Check your connection and try again.");

    // Expired session on a data call → back to sign-in. (Login itself legitimately returns 401.)
    if (error.status === 401 && !path.startsWith("/auth/")) {
      toast.error("Your session has expired. Please sign in again.", { id: "session" });
      // Hard navigation on purpose: this module runs outside React and must reset all client state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } else {
      errorToast(error, path);
    }
    throw error;
  }
}
