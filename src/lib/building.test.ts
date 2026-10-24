import { describe, expect, it } from "vitest";
import { cleanDescription, parseYearBuilt, summarize, violationIssue, type SocrataViolation } from "@/lib/building";
import { FIXTURE_BBLS } from "@/lib/demo/building";
import v1020020091 from "@/lib/demo/fixtures/1020020091-violations.json";
import v2043220010 from "@/lib/demo/fixtures/2043220010-violations.json";
import v3051900075 from "@/lib/demo/fixtures/3051900075-violations.json";
import { DEMO_BUILDINGS, demoBuilding } from "@/lib/demo/summaries";
import type { IssueId } from "@/lib/types";

const FIXTURES: Record<string, SocrataViolation[]> = {
  "1020020091": v1020020091,
  "2043220010": v2043220010,
  "3051900075": v3051900075,
};

// Real HPD wordings from the demo-building fixtures and the verified API notes. Entries marked (built) are
// constructed from the notes' description of the trap (the three demo buildings hold no such row).
const WORDINGS: [string, string, IssueId | null][] = [
  ["mold", "§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... LESS THAN 10 SQ FT AT EAST WALL", "mold"],
  ["pests: mice", "HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT LOCATED AT APT 512", "pests"],
  ["pests: roaches", "HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTMENT", "pests"],
  [
    "pests: rats beat leak (text says LEAKS)",
    "567 (C) § 27-2017, 27-2017.1, 27-2017.4 HMC: ABATE THE NUISANCE CONSISTING OF EVIDENCE OF RATS AND ALL UNDERLYING DEFECTS LEAKS",
    "pests",
  ],
  ["pests: bedbugs", "§ 27-2018 ADMIN. CODE: ABATE THE NUISANCE CONSISTING OF BEDBUGS", "pests"],
  ["TRAP bedbug paperwork", "(A) § HMC:FILE ANNUAL BEDBUG REPORT IN ACCORDANCE WITH HPD RULE AS DESCRIBED ON THE BACK OF THIS NOTICE", null],
  ["heat", "§ 27-2029 ADM CODE PROVIDE AN ADEQUATE SUPPLY OF HEAT FOR THE ENTIRE APARTMENT", "heat_hot_water"],
  ["hot water", "§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOCATED AT APT 512", "heat_hot_water"],
  ["TRAP boiler-room access", "§ 27-2033 ADM CODE PROVIDE READY ACCESS TO BUILDINGS HEATING SYSTEM DOOR LOCKED AT BOILER ROOM", null],
  ["self-closing door", "§ 27-2005, 27-2007, 27-2041.1 HMC: REPLACE OR REPAIR THE SELF-CLOSING DOORS THAT IS MISSING OR DEFECTIVE", "lock_door"],
  ["lock", "§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE MORTISE LOCK AT DOOR IN THE ENTRANCE", "lock_door"],
  ["latch", "§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH AND ITS ASSEMBLIES AT DOOR AT COMPACTOR CLOSET", "lock_door"],
  [
    "lock beats bare LEADING TO",
    "§ 27-2005 ADM CODE & 309 M/D LAW ABATE THE NUISANCE CONSISTING OF KEY OPERATED LOCK INSTALLED AT ROOM DOOR LEADING TO FIRE ESCAPE WINDOW",
    "lock_door",
  ],
  ["TRAP window guard (27-2043.1)", "§ 27-2043.1 HMC INSTALL THE MISSING OR REPAIR/REPLACE THE DEFECTIVE WINDOW GUARD(S) IN ACCORDANCE WITH THE SPECIFICATIONS", null],
  ["TRAP entrance-door notice", "§27-2153 ADM CODE POST AND MAINTAIN A NOTICE, WRITTEN IN ENGLISH AND IN SPANISH, ON THE BUILDING ENTRANCE DOOR", null],
  ["TRAP bare LEADING TO (built)", "§ 27-2005 HMC: REPAIR THE BROKEN OR DEFECTIVE STAIRS LEADING TO THE ROOF", null],
  ["peeling paint", "§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT ALL PEELING PAINT SURFACES", "peeling_paint"],
  ["lead paint", "§ 27-2056.6 ADM CODE - CORRECT THE LEAD-BASED PAINT HAZARD - PRESUMED LEAD PAINT THAT IS PEELING", "peeling_paint"],
  ["plastered surfaces and paint", "§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFORM COLOR AT CEILING", "peeling_paint"],
  ["leak", "§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT CEILING IN THE BATHROOM", "leak"],
  ["leaky faucet", "§ 27-2026 ADM CODE REPAIR THE LEAKY AND/OR DEFECTIVE FAUCETS AT THE BATHTUB IN THE BATHROOM", "leak"],
  ["TRAP bare WATER (cold water)", "§ 27-2024 ADM CODE PROVIDE ADEQUATE SUPPLY OF COLD WATER FOR THE FIXTURES .. IN THE KITCHEN", null],
  ["TRAP bare WATER (water closet)", "§ 27-2026 ADM CODE REPAIR THE FLUSHING APPARATUS AND MAINTAIN SAME SO AS TO FLUSH EFFECTIVELY THE WATER CLOSET", null],
  ["TRAP MOLDING (built)", "§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE MOLDINGS AT WALL IN THE LIVING ROOM", null],
  ["smoke detector", "§ 27-2045(B)(1)(A) HMC REPAIR, REPLACE OR PROVIDE AN APPROVED AND OPERATIONAL SMOKE DETECTOR", null],
];

describe("violationIssue", () => {
  it.each(WORDINGS)("%s", (_name, text, want) => {
    expect(violationIssue(text)).toBe(want);
  });

  it("is case-insensitive and tolerates empty text", () => {
    expect(violationIssue("abate the visible mold condition")).toBe("mold");
    expect(violationIssue("")).toBeNull();
  });
});

describe("cleanDescription", () => {
  it.each([
    ["§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE", "Properly repair the source"],
    ["HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE", "Abate the infestation consisting of mice"],
    ["(A) § HMC:FILE ANNUAL BEDBUG REPORT IN ACCORDANCE WITH HPD RULE", "File annual bedbug report in accordance with HPD rule"],
    ["567 (C) § 27-2017, 27-2017.4 HMC: ABATE THE NUISANCE", "Abate the nuisance"],
    ["§ 27-2056.6 ADM CODE - CORRECT THE LEAD-BASED PAINT HAZARD", "Correct the lead-based paint hazard"],
    ["§ 27-2045(B)(1)(B) HMC, § 12-06, § 12-07 RCNY REPAIR, REPLACE THE DETECTOR", "Repair, replace the detector"],
    ["§ 300 M/D LAW FILE PLANS", "File plans"],
    ["§ 27-2005 ADM CODE & 309 M/D LAW ABATE THE NUISANCE", "Abate the nuisance"],
    ["§ 27-2005 HMC: REFIT\u001a  WINDOW AT APT 3b ,  KITCHEN", "Refit window at apt 3B, kitchen"],
    ["PROVIDE 2 SMOKE DETECTORS", "Provide 2 smoke detectors"],
  ])("%j", (raw, want) => {
    expect(cleanDescription(raw)).toBe(want);
  });

  it("caps long text near 160 characters on a word boundary", () => {
    const out = cleanDescription(`§ 27-2005 HMC: ${"REPAIR THE BROKEN CEILING ".repeat(20)}`);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
});

describe("parseYearBuilt", () => {
  it("reads PLUTO text and treats 0 or junk as unknown", () => {
    expect(parseYearBuilt("1905")).toBe(1905);
    expect(parseYearBuilt("0")).toBeNull();
    expect(parseYearBuilt(undefined)).toBeNull();
    expect(parseYearBuilt("n/a")).toBeNull();
  });
});

describe("summarize", () => {
  const rows = FIXTURES["1020020091"];
  const opts = { bbl: "1020020091", yearBuilt: 1905, source: "live" as const, fetchedAt: "2026-10-24T00:00:00.000Z" };

  it("counts classes and issues straight from the rows", () => {
    const rec = summarize(rows, opts);
    const tally = (f: (r: SocrataViolation) => string | null) =>
      rows.reduce<Record<string, number>>((m, r) => ({ ...m, [f(r) ?? "-"]: (m[f(r) ?? "-"] ?? 0) + 1 }), {});
    const cls = tally((r) => r.class ?? null);
    const iss = tally((r) => violationIssue(r.novdescription ?? ""));
    expect(rec.byClass).toEqual({ A: cls.A ?? 0, B: cls.B ?? 0, C: cls.C ?? 0 });
    for (const k of ["leak", "mold", "heat_hot_water", "pests", "lock_door", "peeling_paint"] as const) {
      expect(rec.byIssue[k]).toBe(iss[k] ?? 0);
    }
    expect(rec.openTotal).toBe(rows.length);
    expect(rec).toMatchObject({ bbl: "1020020091", yearBuilt: 1905, source: "live", fetchedAt: opts.fetchedAt });
    expect(rec.byIssue.leak + rec.byIssue.mold + rec.byIssue.peeling_paint).toBeGreaterThan(0); // fixture is not all "other"
  });

  it("keeps the 25 newest, newest first, with clean ISO dates and descriptions", () => {
    const { recent } = summarize(rows, opts);
    expect(recent).toHaveLength(25);
    const dates = recent.map((r) => r.date ?? "");
    expect(dates).toEqual([...dates].sort().reverse());
    for (const r of recent) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.description).not.toMatch(/§|^HMC|^ADM/);
      expect(r.description.length).toBeLessThanOrEqual(160);
    }
    expect(recent.find((r) => r.id === "19292528")).toMatchObject({ hazardClass: "B", issue: "leak", date: "2026-10-12" });
  });

  it("uses true totals when given and counts class I only in openTotal", () => {
    const withI: SocrataViolation[] = [
      { violationid: "1", class: "I", inspectiondate: "2026-01-01T00:00:00.000", novdescription: "ORDER TO VACATE" },
      { violationid: "2", class: "C", novissueddate: "2026-02-01T00:00:00.000", novdescription: "ABATE THE VISIBLE MOLD" },
    ];
    const rec = summarize(withI, opts);
    expect(rec.openTotal).toBe(2);
    expect(rec.byClass).toEqual({ A: 0, B: 0, C: 1 });
    expect(rec.recent.map((r) => [r.id, r.date, r.hazardClass])).toEqual([
      ["2", "2026-02-01", "C"], // inspectiondate missing -> novissueddate
      ["1", "2026-01-01", null],
    ]);
    const capped = summarize(withI, { ...opts, totals: { openTotal: 1500, byClass: { A: 1, B: 2, C: 1496 } } });
    expect(capped.openTotal).toBe(1500);
    expect(capped.byClass.C).toBe(1496);
  });

  it("returns zeros for a building with no open violations", () => {
    const rec = summarize([], { ...opts, yearBuilt: null });
    expect(rec).toMatchObject({ openTotal: 0, byClass: { A: 0, B: 0, C: 0 }, recent: [], yearBuilt: null });
    expect(Object.values(rec.byIssue).every((n) => n === 0)).toBe(true);
  });
});

describe("demo summaries", () => {
  it("cover every fixture BBL with the verified all-time headline numbers", () => {
    expect(Object.keys(DEMO_BUILDINGS).sort()).toEqual([...FIXTURE_BBLS].sort());
    const a = demoBuilding("1020020091");
    expect(a).toMatchObject({ openTotal: 291, yearBuilt: 1905, source: "demo-fixture", byClass: { A: 54, B: 154, C: 82 } });
    expect(a?.byIssue).toMatchObject({ leak: 37, mold: 18, peeling_paint: 88, pests: 22, lock_door: 9, heat_hot_water: 1 });
    expect(demoBuilding("1000010010")).toBeNull();
  });

  it.each(FIXTURE_BBLS)("%s: recent matches summarize() over the saved fixture rows", (bbl) => {
    const fresh = summarize(FIXTURES[bbl], { bbl, yearBuilt: null, source: "demo-fixture" });
    expect(DEMO_BUILDINGS[bbl].recent).toEqual(fresh.recent);
  });
});
