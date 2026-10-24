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

export function nextStep(c: Pick<CaseFile, "noticeMadeAt">, issues: Issue[], now: Date | null): NextStep {
  if (issues.length === 0) return { kind: "photo" };
  const open = issues.filter((i) => !i.fixedAt);
  if (open.length === 0) return { kind: "fixed" };
  // Before the first clock tick (server render, hydration) nothing counts as late.
  const overdue = now ? open.filter((i) => i.repairBy && new Date(i.repairBy).getTime() < now.getTime()).length : 0;
  if (!c.noticeMadeAt) return { kind: "notice", open: open.length, overdue };
  return overdue > 0 ? { kind: "file", overdue } : { kind: "waiting", open: open.length, noticeMadeAt: c.noticeMadeAt };
}
