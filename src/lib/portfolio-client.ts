"use client";

import { useEffect, useState } from "react";
import type { LandlordRecord } from "./portfolio";

export type LandlordState = {
  status: "loading" | "ready" | "error";
  record: LandlordRecord | null;
  retry: () => void;
};

/** The landlord track record from /api/landlord. Demo cases use the saved snapshot. */
export function useLandlord(bbl: string | null, demo: boolean): LandlordState {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; record: LandlordRecord | null } | null>(null);
  const key = `${bbl}|${demo}|${attempt}`;

  useEffect(() => {
    if (!bbl) return;
    const ac = new AbortController();
    const q = new URLSearchParams({ bbl });
    if (demo) q.set("demo", "1");
    fetch(`/api/landlord?${q}`, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<LandlordRecord>) : null))
      .catch(() => null)
      .then((record) => {
        if (!ac.signal.aborted) setResult({ key, record });
      });
    return () => ac.abort();
  }, [bbl, demo, key]);

  const status = !bbl ? "error" : result?.key !== key ? "loading" : result.record ? "ready" : "error";
  return { status, record: status === "ready" ? (result?.record ?? null) : null, retry: () => setAttempt((a) => a + 1) };
}
