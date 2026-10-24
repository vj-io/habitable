// Where the renter stands on the escalation ladder (notice -> 311 -> HP Action), from what is on this device.
// Pure: the case-file card and its tests share it. It reads the requested repair-by dates, which are not legal deadlines.
import type { CaseFile, Issue } from "./types";

export type NextStep =
  | { kind: "photo" }
  | { kind: "fixed" }
  /** Open problems and no notice made yet. `overdue` = how many are past their repair-by date. */
  | { kind: "notice"; open: number; overdue: number }
  /** Notice made and no repair-by date has passed yet. */
  | { kind: "waiting"; open: number; noticeMadeAt: string }
  /** Notice made and at least one repair-by date has passed: time for 311 and, after that, the court. */
  | { kind: "file"; overdue: number };

/**
 * `heatBelow` = heat-log readings below the legal minimum. A heat log with any counts as one open problem, and as
 * one that is already late: HPD gives heat and hot water "no time" to correct.
 */
export function nextStep(c: Pick<CaseFile, "noticeMadeAt">, issues: Issue[], now: Date | null, heatBelow = 0): NextStep {
  const heat = heatBelow > 0 ? 1 : 0;
  if (issues.length === 0 && !heat) return { kind: "photo" };
  const open = issues.filter((i) => !i.fixedAt).length + heat;
  if (open === 0) return { kind: "fixed" };
  // Before the first clock tick (server render, hydration) nothing counts as late.
  const late = now ? issues.filter((i) => !i.fixedAt && i.repairBy && new Date(i.repairBy).getTime() < now.getTime()).length : 0;
  const overdue = late + heat;
  if (!c.noticeMadeAt) return { kind: "notice", open, overdue };
  return overdue > 0 ? { kind: "file", overdue } : { kind: "waiting", open, noticeMadeAt: c.noticeMadeAt };
}
