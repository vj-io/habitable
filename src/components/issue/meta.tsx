import { Brush, Bug, Doc, Drop, Flame, Lock, Spore, type IconProps } from "@/components/doodle";
import { RULES, issueLabel } from "@/lib/rules";
import type { HazardClass, IssueId, ProposalIssue } from "@/lib/types";

const ICONS = {
  leak: Drop,
  mold: Spore,
  heat_hot_water: Flame,
  pests: Bug,
  lock_door: Lock,
  peeling_paint: Brush,
  not_covered: Doc,
} as const;

export function IssueIcon({ issue, ...p }: IconProps & { issue: ProposalIssue }) {
  const Icon = ICONS[issue];
  return <Icon {...p} />;
}

export const CLASS_TONE = { A: "ink", B: "amber", C: "red" } as const satisfies Record<HazardClass, string>;

/** "… open HPD violations — 37 for leaks." */
export const ISSUE_FOR: Record<IssueId, string> = {
  leak: "leaks",
  mold: "mold",
  heat_hot_water: "heat or hot water",
  pests: "pests",
  lock_door: "locks or doors",
  peeling_paint: "peeling paint",
};

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function issueName(issue: ProposalIssue) {
  return issue === "not_covered" ? "Not something Habitable covers" : issueLabel(issue);
}

const DERIVED_LABEL: Record<string, string> = {
  heatSeason: "Heat season (Oct 1 – May 31)",
};

/**
 * The facts that fed the rule, as readable lines: "Water actively dripping or flowing right now? → No, it's a stain".
 * Derived facts say where they came from.
 */
export function factLines(issue: IssueId, facts: Record<string, string>, yearBuilt: number | null) {
  const rules = RULES[issue];
  const lines: { q: string; a: string; from?: string }[] = [];
  if (issue === "heat_hot_water" && facts.heatSeason) {
    lines.push({ q: DERIVED_LABEL.heatSeason, a: facts.heatSeason === "yes" ? "In season" : "Out of season", from: "from the date" });
  }
  for (const q of rules.facts) {
    const v = facts[q.factId];
    if (v === undefined) continue;
    const opt = q.options.find((o) => o.value === v);
    const from =
      q.factId === "builtBefore1960" && yearBuilt ? `from city records: built ${yearBuilt}` : q.factId === "childUnder6" ? "your answer, remembered for this case" : undefined;
    lines.push({ q: q.prompt, a: opt?.label ?? v, from });
  }
  return lines;
}
