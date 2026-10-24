// The rules engine: "code disposes". Pure functions over the cited table in rules.json.
// The AI only proposes a problem type; everything here is deterministic and unit-tested.
import table from "./rules.json";
import type {
  CorrectionWindow,
  Facts,
  HazardClass,
  IssueId,
  ProposalIssue,
  RuleOutcome,
  RuleQuestion,
} from "./types";

type When = Record<string, string | string[]>;

interface ClassVariant {
  ruleId: string;
  when: When;
  hazardClass: HazardClass;
  classLabel: string;
  window: CorrectionWindow;
  citation: string;
  sourceUrl: string;
  lawUrl?: string;
  quote?: string;
  plainEnglish: string;
  note?: string;
}

interface NotApplicableVariant {
  ruleId: string;
  when: When;
  outcome: "not_applicable";
  reason: string;
  sourceUrl?: string;
}

type Variant = ClassVariant | NotApplicableVariant;

export interface IssueRules {
  label: string;
  short: string;
  complaintUrl: string;
  hpdUrl: string;
  facts: RuleQuestion[];
  variants: Variant[];
}

export const RULES = table.issues as unknown as Record<IssueId, IssueRules>;
export const CLASS_TABLE = table.classTable;
export const CLOCK_NOTE = table.clock;
export const CLOCK_SOURCE_URL = table.clockSourceUrl;
export const RULES_VERSION = table.version;

/** Facts the engine derives itself instead of asking. */
export function derivedFacts(ctx: { now: Date; yearBuilt: number | null }): Facts {
  const facts: Facts = { heatSeason: isHeatSeason(ctx.now) ? "yes" : "no" };
  if (ctx.yearBuilt) facts.builtBefore1960 = ctx.yearBuilt < 1960 ? "yes" : "no";
  return facts;
}

/** Heat season is October 1 through May 31, judged on the New York calendar. */
export function isHeatSeason(now: Date): boolean {
  const month = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" }).format(now),
  );
  return month >= 10 || month <= 5;
}

function matches(when: When, facts: Facts): "yes" | "no" | string[] {
  const missing: string[] = [];
  for (const [factId, expected] of Object.entries(when)) {
    const value = facts[factId];
    if (value === undefined) missing.push(factId);
    else if (Array.isArray(expected) ? !expected.includes(value) : value !== expected) return "no";
  }
  return missing.length ? missing : "yes";
}

/**
 * Walk the issue's variants in table order. The first variant whose conditions all hold wins.
 * If the first still-possible variant needs facts we don't have, ask for those (in table order).
 */
export function evaluate(
  issue: ProposalIssue,
  facts: Facts,
  ctx: { now: Date; yearBuilt: number | null },
): RuleOutcome {
  if (issue === "not_covered") {
    return {
      status: "not_applicable",
      ruleId: "not-covered",
      issue,
      reason: table.notCovered.reason,
      sourceUrl: table.notCovered.sourceUrl,
    };
  }
  const rules = RULES[issue];
  const known = { ...derivedFacts(ctx), ...facts };

  for (const v of rules.variants) {
    const m = matches(v.when, known);
    if (m === "no") continue;
    if (m !== "yes") {
      const questions = rules.facts.filter((q) => m.includes(q.factId));
      return { status: "needs_facts", issue, questions };
    }
    if ("outcome" in v) {
      return { status: "not_applicable", ruleId: v.ruleId, issue, reason: v.reason, sourceUrl: v.sourceUrl };
    }
    return {
      status: "classified",
      ruleId: v.ruleId,
      issue,
      hazardClass: v.hazardClass,
      classLabel: v.classLabel,
      window: v.window,
      citation: v.citation,
      sourceUrl: v.sourceUrl,
      lawUrl: v.lawUrl,
      quote: v.quote,
      plainEnglish: v.plainEnglish,
      note: v.note,
    };
  }
  // Unreachable while every issue's variants cover all fact values; tested in rules.test.ts.
  throw new Error(`No rule matched for ${issue} with ${JSON.stringify(known)}`);
}

export function issueLabel(issue: ProposalIssue): string {
  return issue === "not_covered" ? "Not covered" : RULES[issue].label;
}
