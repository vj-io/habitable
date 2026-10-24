"use client";

import { useEffect, useState } from "react";
import type { BuildingRecord } from "@/lib/types";

export type BuildingState = {
  status: "loading" | "ready" | "error";
  record: BuildingRecord | null;
  retry: () => void;
};

/** The building's public HPD record from /api/building. Demo cases use the saved fixture. */
export function useBuilding(bbl: string | null, demo: boolean): BuildingState {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; record: BuildingRecord | null } | null>(null);
  const key = `${bbl}|${demo}|${attempt}`;

  useEffect(() => {
    if (!bbl) return;
    const ac = new AbortController();
    fetch(`/api/building?bbl=${bbl}${demo ? "&demo=1" : ""}`, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BuildingRecord>) : null))
      .catch(() => null)
      .then((record) => {
        if (!ac.signal.aborted) setResult({ key, record });
      });
    return () => ac.abort();
  }, [bbl, demo, key]);

  const status = !bbl ? "error" : result?.key !== key ? "loading" : result.record ? "ready" : "error";
  return { status, record: status === "ready" ? (result?.record ?? null) : null, retry: () => setAttempt((a) => a + 1) };
}
