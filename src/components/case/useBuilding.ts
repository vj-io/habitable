"use client";

import { useEffect, useState } from "react";
import { houseNumberOf } from "@/lib/registration";
import type { Address, BuildingRecord } from "@/lib/types";

export type BuildingState = {
  status: "loading" | "ready" | "error";
  record: BuildingRecord | null;
  retry: () => void;
};

/**
 * The building's public HPD record from /api/building. Demo cases use the saved fixture. The BIN and house number
 * only pick the right building when one tax lot has several HPD registrations.
 */
export function useBuilding(address: Pick<Address, "bbl" | "bin" | "label"> | null, demo: boolean): BuildingState {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; record: BuildingRecord | null } | null>(null);
  const bbl = address?.bbl ?? null;
  const bin = address?.bin ?? "";
  const houseNumber = (address && houseNumberOf(address.label)) ?? "";
  const key = `${bbl}|${bin}|${houseNumber}|${demo}|${attempt}`;

  useEffect(() => {
    if (!bbl) return;
    const ac = new AbortController();
    const q = new URLSearchParams({ bbl });
    if (bin) q.set("bin", bin);
    if (houseNumber) q.set("hn", houseNumber);
    if (demo) q.set("demo", "1");
    fetch(`/api/building?${q}`, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BuildingRecord>) : null))
      .catch(() => null)
      .then((record) => {
        if (!ac.signal.aborted) setResult({ key, record });
      });
    return () => ac.abort();
  }, [bbl, bin, houseNumber, demo, key]);

  const status = !bbl ? "error" : result?.key !== key ? "loading" : result.record ? "ready" : "error";
  return { status, record: status === "ready" ? (result?.record ?? null) : null, retry: () => setAttempt((a) => a + 1) };
}
