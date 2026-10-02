export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Exponential backoff with full jitter: random(0, min(max, base * 2^attempt)). */
export const backoffDelay = (attempt: number, baseMs = 400, maxMs = 8_000) =>
  Math.random() * Math.min(maxMs, baseMs * 2 ** attempt);
