"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 5000;

export function usePollingFetch<T>(url: string, intervalMs = DEFAULT_INTERVAL_MS) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            (json as { error?: string }).error ?? "Failed to load"
          );
        }
        setData(json as T);
        setError(null);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    const initial = window.setTimeout(() => void load(false), 0);

    const poll = () => {
      if (document.visibilityState === "hidden") return;
      void load(true);
    };

    const id = window.setInterval(poll, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const onFocus = () => void load(true);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, intervalMs]);

  return {
    data,
    error,
    loading,
    lastUpdated,
    refresh: () => void load(true),
  };
}
