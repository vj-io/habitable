import { describe, expect, it } from "vitest";
import { demoBuilding } from "@/lib/demo/summaries";
import { buildSignals, categoryLabel, complaintsSince } from "@/lib/signals";

// Real Socrata answers (HPD ygpa-z7cr, 59kj-x8nc, hcir-3275; fetched 2026-10-25) for BBL 1020020091: 618 West 136th Street.
// Its AEP rows hold an old discharged round next to the current one.
const MANHATTAN = {
  complaints: [
    { major_category: "UNSANITARY CONDITION", n: "46" },
    { major_category: "PAINT/PLASTER", n: "42" },
    { major_category: "WATER LEAK", n: "36" },
    { major_category: "HEAT/HOT WATER", n: "13" },
  ],
  litigation: [{ n: "16" }],
  aep: [{ current_status: "AEP Active" }, { current_status: "AEP Discharged" }],
};

describe("buildSignals", () => {
  it("turns the aggregate rows into numbers, most complaints first", () => {
    expect(buildSignals("2025-10-25", MANHATTAN)).toEqual({
      since: "2025-10-25",
      complaints: [
        { category: "UNSANITARY CONDITION", n: 46 },
        { category: "PAINT/PLASTER", n: 42 },
        { category: "WATER LEAK", n: 36 },
        { category: "HEAT/HOT WATER", n: 13 },
      ],
      litigations: 16,
      aep: true,
    });
  });

  it("is in AEP when any round is active, and not when every round is discharged or there are none", () => {
    const aep = (rows: { current_status?: string }[]) => buildSignals("2025-10-25", { ...MANHATTAN, aep: rows }).aep;
    expect(aep([{ current_status: "AEP Discharged" }, { current_status: "AEP Active" }])).toBe(true);
    expect(aep([{ current_status: "AEP Discharged" }])).toBe(false);
    expect(aep([])).toBe(false);
  });

  it("copes with an empty building: no complaints, no litigation row, no AEP", () => {
    expect(buildSignals("2025-10-25", { complaints: [], litigation: [], aep: [] })).toEqual({ since: "2025-10-25", complaints: [], litigations: 0, aep: false });
  });

  it("drops junk rows, orders ties by name, and reads counts only from digits", () => {
    const s = buildSignals("2025-10-25", {
      complaints: [
        { major_category: "PLUMBING", n: "5" },
        { major_category: "ELECTRIC", n: "5" },
        { major_category: "", n: "9" },
        { major_category: "SAFETY", n: "0" },
        { major_category: "GENERAL", n: "many" },
        { n: "3" },
      ],
      litigation: [{ n: "-1" }],
      aep: [{}],
    });
    expect(s.complaints.map((c) => c.category)).toEqual(["ELECTRIC", "PLUMBING"]);
    expect(s.litigations).toBe(0);
  });
});

describe("complaintsSince", () => {
  it("is 365 days back, as an ISO date", () => {
    expect(complaintsSince(new Date("2026-10-25T12:00:00Z"))).toBe("2025-10-25");
    expect(complaintsSince(new Date("2026-03-01T00:30:00Z"))).toBe("2025-03-01");
  });
});

describe("categoryLabel", () => {
  it("sentence-cases HPD's capitals", () => {
    expect(categoryLabel("UNSANITARY CONDITION")).toBe("Unsanitary condition");
    expect(categoryLabel("HEAT/HOT WATER")).toBe("Heat/hot water");
  });
});

describe("demo signals", () => {
  it("the demo building carries its saved counts and its current AEP round", () => {
    const s = demoBuilding("1020020091")?.signals;
    expect(s).toMatchObject({ since: "2025-10-25", litigations: 16, aep: true });
    expect(s?.complaints[0]).toEqual({ category: "UNSANITARY CONDITION", n: 46 });
    expect(s?.complaints.reduce((t, c) => t + c.n, 0)).toBe(46 + 42 + 36 + 26 + 22 + 19 + 14 + 14 + 13 + 10 + 6);
  });

  it("a building that was never in AEP is not flagged", () => {
    expect(demoBuilding("2043220010")?.signals).toMatchObject({ litigations: 14, aep: false });
  });

  it("no demo building's signals carry anything but counts and category names", () => {
    for (const bbl of ["1020020091", "2043220010", "3051900075"]) {
      expect(JSON.stringify(demoBuilding(bbl)?.signals)).not.toMatch(/apartment|apt|unit/i);
    }
  });
});
