"use client";

import { useEffect, useEffectEvent, useState } from "react";

type Result<T> = { key: string; data?: T; error?: Error };

/**
 * Runs `fn` on mount and whenever `deps` change (aborting the stale call). `reload()` re-runs it.
 * While a new request is in flight, the previous `data` is kept so lists don't flash empty.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = `${JSON.stringify(deps)}#${tick}`;
  const call = useEffectEvent(fn);

  useEffect(() => {
    const ctrl = new AbortController();
    call(ctrl.signal).then(
      (data) => setResult({ key, data }),
      (error) => {
        if (error?.name !== "AbortError") setResult((prev) => ({ key, data: prev?.data, error }));
      },
    );
    return () => ctrl.abort();
  }, [key]);

  const settled = result?.key === key;
  return {
    data: result?.data ?? null,
    error: settled ? (result?.error ?? null) : null,
    loading: !settled,
    reload: () => setTick((t) => t + 1),
  };
}
