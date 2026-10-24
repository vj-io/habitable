import { describe, expect, it } from "vitest";
import { evaluate, isHeatSeason, RULES } from "./rules";
import { ISSUE_IDS, type RuleOutcome } from "./types";

const OCT = new Date("2026-10-24T12:00:00-04:00");
const JULY = new Date("2026-07-04T12:00:00-04:00");
const ctx = { now: OCT, yearBuilt: 1931 };

function classOf(o: RuleOutcome) {
  if (o.status !== "classified") throw new Error(`expected classified, got ${o.status}`);
  return [o.hazardClass, o.window.text];
}

describe("rules engine", () => {
  it("asks for the facts a rule needs before stamping", () => {
    const o = evaluate("leak", {}, ctx);
    expect(o.status).toBe("needs_facts");
    if (o.status === "needs_facts") expect(o.questions.map((q) => q.factId)).toEqual(["activeLeak"]);
  });

  it("leak: active = C 24h, stain = B 30d", () => {
    expect(classOf(evaluate("leak", { activeLeak: "yes" }, ctx))).toEqual(["C", "24 hours"]);
    expect(classOf(evaluate("leak", { activeLeak: "no" }, ctx))).toEqual(["B", "30 days"]);
  });

  it("mold: Local Law 55 area thresholds", () => {
    expect(classOf(evaluate("mold", { moldArea: "lt10" }, ctx))).toEqual(["A", "90 days"]);
    expect(classOf(evaluate("mold", { moldArea: "10to29" }, ctx))).toEqual(["B", "30 days"]);
    expect(classOf(evaluate("mold", { moldArea: "gte30" }, ctx))).toEqual(["C", "21 days"]);
  });

  it("pests: mice/roaches/rats = C 21d, others = B 30d", () => {
    expect(classOf(evaluate("pests", { pest: "mice_roaches_rats" }, ctx))).toEqual(["C", "21 days"]);
    expect(classOf(evaluate("pests", { pest: "bedbugs_other" }, ctx))).toEqual(["B", "30 days"]);
  });

  it("heat only in season; hot water all year", () => {
    expect(evaluate("heat_hot_water", { problem: "no_heat" }, ctx)).toMatchObject({
      status: "classified",
      hazardClass: "C",
      ruleId: "heat-in-season",
    });
    expect(evaluate("heat_hot_water", { problem: "no_heat" }, { ...ctx, now: JULY })).toMatchObject({
      status: "not_applicable",
      ruleId: "heat-off-season",
    });
    expect(evaluate("heat_hot_water", { problem: "no_hot_water" }, { ...ctx, now: JULY })).toMatchObject({
      status: "classified",
      ruleId: "hot-water",
    });
    expect(evaluate("heat_hot_water", { problem: "both" }, ctx)).toMatchObject({ ruleId: "hot-water" });
  });

  it("heat season boundaries are Oct 1 and May 31 in New York", () => {
    expect(isHeatSeason(new Date("2026-10-01T00:30:00-04:00"))).toBe(true);
    expect(isHeatSeason(new Date("2026-09-30T23:30:00-04:00"))).toBe(false); // already Oct 1 in UTC
    expect(isHeatSeason(new Date("2026-05-31T23:30:00-04:00"))).toBe(true);
    expect(isHeatSeason(new Date("2026-06-01T00:30:00-04:00"))).toBe(false);
  });

  it("locks and doors", () => {
    expect(classOf(evaluate("lock_door", { door: "apartment_cannot_lock" }, ctx))).toEqual(["C", "24 hours"]);
    expect(classOf(evaluate("lock_door", { door: "apartment_lock_damaged" }, ctx))).toEqual(["B", "30 days"]);
    expect(classOf(evaluate("lock_door", { door: "building_entrance" }, ctx))).toEqual(["C", "24 hours"]);
    expect(classOf(evaluate("lock_door", { door: "not_self_closing" }, ctx))).toEqual(["C", "14 days"]);
  });

  it("peeling paint: lead presumption needs pre-1960 AND a child under 6", () => {
    // pre-1960 from the building record → asks about a child first
    const q = evaluate("peeling_paint", {}, ctx);
    expect(q.status === "needs_facts" && q.questions[0].factId).toBe("childUnder6");
    expect(classOf(evaluate("peeling_paint", { childUnder6: "yes" }, ctx))).toEqual(["C", "21 days"]);
    // no child → plaster question → A or B
    const q2 = evaluate("peeling_paint", { childUnder6: "no" }, ctx);
    expect(q2.status === "needs_facts" && q2.questions[0].factId).toBe("plasterDamage");
    expect(classOf(evaluate("peeling_paint", { childUnder6: "no", plasterDamage: "no" }, ctx))).toEqual(["A", "90 days"]);
    expect(classOf(evaluate("peeling_paint", { childUnder6: "no", plasterDamage: "yes" }, ctx))).toEqual(["B", "30 days"]);
    // built 1975 with a child: no lead presumption
    const newer = { now: OCT, yearBuilt: 1975 };
    const q3 = evaluate("peeling_paint", { childUnder6: "yes" }, newer);
    expect(q3.status === "needs_facts" && q3.questions[0].factId).toBe("plasterDamage");
    // unknown year → asks the renter
    const q4 = evaluate("peeling_paint", {}, { now: OCT, yearBuilt: null });
    expect(q4.status === "needs_facts" && q4.questions.map((x) => x.factId)).toEqual(["builtBefore1960", "childUnder6"]);
  });

  it("not covered never gets a class", () => {
    expect(evaluate("not_covered", {}, ctx)).toMatchObject({ status: "not_applicable", issue: "not_covered" });
  });

  it("every combination of every fact option reaches an outcome, and each one is cited", () => {
    for (const issue of ISSUE_IDS) {
      const qs = RULES[issue].facts;
      const combos = qs.reduce<Record<string, string>[]>(
        (acc, q) => acc.flatMap((c) => q.options.map((o) => ({ ...c, [q.factId]: o.value }))),
        [{}],
      );
      for (const facts of combos) {
        for (const now of [OCT, JULY]) {
          const o = evaluate(issue, facts, { now, yearBuilt: null });
          expect(["classified", "not_applicable"]).toContain(o.status);
          if (o.status === "classified") {
            expect(o.citation).toMatch(/§/);
            expect(o.sourceUrl).toMatch(/^https:\/\/(www\.nyc\.gov|portal\.311\.nyc\.gov)\//);
            expect(o.window.days ?? o.window.hours).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
