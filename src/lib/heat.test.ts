import { describe, expect, it } from "vitest";
import {
  HEAT_CITATION,
  HEAT_SOURCE_URL,
  HOT_WATER_CITATION,
  checkReading,
  formatF,
  fromNyInputValue,
  heatSummary,
  toNyInputValue,
} from "./heat";
import type { HeatReading } from "./types";

const heat = (at: string, indoorF: number, outdoorF?: number | null) => checkReading({ at, kind: "heat", indoorF, outdoorF });
const status = (at: string, indoorF: number, outdoorF?: number | null) => heat(at, indoorF, outdoorF).status;
const rule = (at: string) => heat(at, 50, 20).rule;

// January is EST (UTC-5): 6:00 AM in New York is 11:00Z, 10:00 PM is 03:00Z the next day.
describe("checkReading: heat, day and night hours (New York wall time)", () => {
  it("day starts at exactly 6:00 AM", () => {
    expect(rule("2026-01-15T10:59:59Z")).toBe("heat_night"); // 5:59:59 AM
    expect(rule("2026-01-15T11:00:00Z")).toBe("heat_day"); // 6:00 AM
  });

  it("night starts at exactly 10:00 PM", () => {
    expect(rule("2026-01-16T02:59:59Z")).toBe("heat_day"); // 9:59:59 PM on Jan 15
    expect(rule("2026-01-16T03:00:00Z")).toBe("heat_night"); // 10:00 PM on Jan 15
  });

  it("midnight is night, noon is day", () => {
    expect(rule("2026-01-15T05:00:00Z")).toBe("heat_night");
    expect(rule("2026-01-15T17:00:00Z")).toBe("heat_day");
  });

  it("uses New York time, not UTC", () => {
    expect(rule("2026-01-15T23:30:00Z")).toBe("heat_day"); // 6:30 PM EST (UTC hour 23 would read as night)
    expect(rule("2026-01-15T08:30:00Z")).toBe("heat_night"); // 3:30 AM EST (UTC hour 8 would read as day)
  });
});

describe("checkReading: heat, daytime minimum and the outdoor condition", () => {
  const noon = "2026-01-15T17:00:00Z";

  it("68°F applies when it is below 55°F outside", () => {
    expect(heat(noon, 67.9, 30)).toMatchObject({ status: "below_minimum", requiredF: 68, rule: "heat_day" });
    expect(heat(noon, 68, 30)).toMatchObject({ status: "ok", requiredF: 68 });
    expect(status(noon, 72, 30)).toBe("ok");
  });

  it("outdoor threshold: 54.9°F triggers it, 55°F and above does not", () => {
    expect(status(noon, 60, 54.9)).toBe("below_minimum");
    expect(heat(noon, 60, 55)).toMatchObject({ status: "not_required", requiredF: null, rule: "heat_day" });
    expect(status(noon, 60, 55.1)).toBe("not_required");
    expect(status(noon, 60, 70)).toBe("not_required");
  });

  it("asks for the outdoor temperature when it decides the result", () => {
    for (const outdoor of [undefined, null, Number.NaN]) {
      const r = heat(noon, 60, outdoor);
      expect(r).toMatchObject({ status: "needs_outdoor", requiredF: 68, rule: "heat_day" });
      expect(r.explanation).toMatch(/Add the outdoor temperature/);
    }
    // ...even when the indoor reading would pass: whether 68°F applies at all is unknown.
    expect(status(noon, 75, null)).toBe("needs_outdoor");
  });

  it("explains the rule in plain words", () => {
    expect(heat(noon, 60, 30).explanation).toBe("From 6 AM to 10 PM, when it is below 55°F outside, it must be at least 68°F inside.");
    expect(heat(noon, 60, 58).explanation).toBe("From 6 AM to 10 PM the 68°F minimum applies only when it is below 55°F outside. It was 58°F outside.");
  });
});

describe("checkReading: heat, night minimum", () => {
  const night = "2026-01-15T08:00:00Z"; // 3:00 AM

  it("62°F at night, whatever the weather (no outdoor condition)", () => {
    expect(heat(night, 61.9, 70)).toMatchObject({ status: "below_minimum", requiredF: 62, rule: "heat_night" });
    expect(status(night, 62, 70)).toBe("ok");
    expect(status(night, 61, null)).toBe("below_minimum");
    expect(status(night, 61, undefined)).toBe("below_minimum");
    expect(heat(night, 61, null).explanation).toBe("From 10 PM to 6 AM it must be at least 62°F inside, whatever the weather outside.");
  });

  it("a 64°F night reading meets the night minimum though it would fail by day", () => {
    expect(status(night, 64, 30)).toBe("ok");
    expect(status("2026-01-15T17:00:00Z", 64, 30)).toBe("below_minimum");
  });
});

describe("checkReading: heat season (Oct 1 - May 31, New York calendar)", () => {
  it("starts at midnight on October 1 in New York", () => {
    // 11:59 PM EDT Sep 30 = 03:59Z Oct 1 (UTC already says October)
    expect(heat("2026-10-01T03:59:00Z", 50).status).toBe("not_required");
    expect(heat("2026-10-01T03:59:00Z", 50).rule).toBe("heat_off_season");
    expect(heat("2026-10-01T04:00:00Z", 50)).toMatchObject({ status: "below_minimum", requiredF: 62, rule: "heat_night" });
  });

  it("ends after May 31 in New York", () => {
    expect(heat("2026-06-01T03:59:00Z", 50).rule).toBe("heat_night"); // 11:59 PM EDT May 31
    expect(heat("2026-06-01T04:00:00Z", 50)).toMatchObject({ status: "not_required", requiredF: null, rule: "heat_off_season" });
  });

  it("summer: no heat minimum day or night, even with a cold reading", () => {
    expect(status("2026-07-15T16:00:00Z", 50, 40)).toBe("not_required");
    expect(status("2026-07-15T07:00:00Z", 50, null)).toBe("not_required");
    expect(heat("2026-07-15T16:00:00Z", 50).explanation).toMatch(/October 1 to May 31/);
  });
});

describe("checkReading: DST days", () => {
  it("spring forward (Mar 8 2026): 6:00 AM EDT is 10:00Z, an hour earlier in UTC than the day before", () => {
    expect(rule("2026-03-07T10:00:00Z")).toBe("heat_night"); // 5:00 AM EST
    expect(rule("2026-03-08T09:59:00Z")).toBe("heat_night"); // 5:59 AM EDT
    expect(rule("2026-03-08T10:00:00Z")).toBe("heat_day"); // 6:00 AM EDT
    expect(rule("2026-03-09T01:59:00Z")).toBe("heat_day"); // 9:59 PM EDT
    expect(rule("2026-03-09T02:00:00Z")).toBe("heat_night"); // 10:00 PM EDT
  });

  it("fall back (Nov 1 2026): 6:00 AM EST is 11:00Z, an hour later in UTC than the day before", () => {
    expect(rule("2026-10-31T10:00:00Z")).toBe("heat_day"); // 6:00 AM EDT
    expect(rule("2026-11-01T05:30:00Z")).toBe("heat_night"); // 1:30 AM EDT (first pass)
    expect(rule("2026-11-01T06:30:00Z")).toBe("heat_night"); // 1:30 AM EST (repeated hour)
    expect(rule("2026-11-01T10:00:00Z")).toBe("heat_night"); // 5:00 AM EST
    expect(rule("2026-11-01T11:00:00Z")).toBe("heat_day"); // 6:00 AM EST
    expect(rule("2026-11-02T02:59:00Z")).toBe("heat_day"); // 9:59 PM EST
    expect(rule("2026-11-02T03:00:00Z")).toBe("heat_night"); // 10:00 PM EST
  });
});

describe("checkReading: hot water", () => {
  const hw = (at: string, indoorF: number, outdoorF?: number | null) => checkReading({ at, kind: "hot_water", indoorF, outdoorF });

  it("at least 120°F at the tap", () => {
    expect(hw("2026-01-15T17:00:00Z", 119.9)).toMatchObject({ status: "below_minimum", requiredF: 120, rule: "hot_water" });
    expect(hw("2026-01-15T17:00:00Z", 120)).toMatchObject({ status: "ok", requiredF: 120 });
  });

  it("applies year-round and at every hour; the outdoor temperature plays no part", () => {
    for (const at of ["2026-07-15T16:00:00Z", "2026-07-15T07:00:00Z", "2026-06-01T04:00:00Z", "2026-03-08T10:00:00Z"]) {
      expect(hw(at, 100).status).toBe("below_minimum");
      expect(hw(at, 100, 90).status).toBe("below_minimum");
      expect(hw(at, 100, null).status).toBe("below_minimum");
    }
  });

  it("says 'year-round, at least 120°F at the tap' and states no hours", () => {
    const below = hw("2026-01-15T17:00:00Z", 104).explanation;
    expect(below).toBe("Hot water is required year-round, at least 120°F at the tap. This reading was 104°F.");
    expect(hw("2026-01-15T17:00:00Z", 125).explanation).toBe("Hot water is required year-round, at least 120°F at the tap. This reading meets it.");
    expect(below).not.toMatch(/\b(AM|PM|a\.m\.|p\.m\.|midnight|hours?)\b/i);
  });

  it("cites §27-2031; heat cites §27-2029(a); both link HPD's heat page", () => {
    expect(hw("2026-01-15T17:00:00Z", 100)).toMatchObject({ citation: HOT_WATER_CITATION, sourceUrl: HEAT_SOURCE_URL });
    expect(HOT_WATER_CITATION).toBe("NYC Admin. Code §27-2031");
    for (const at of ["2026-01-15T17:00:00Z", "2026-01-15T08:00:00Z", "2026-07-15T16:00:00Z"]) {
      expect(heat(at, 60, 30)).toMatchObject({ citation: HEAT_CITATION, sourceUrl: HEAT_SOURCE_URL });
    }
    expect(HEAT_CITATION).toContain("§27-2029(a)");
  });
});

describe("formatF", () => {
  it("drops a trailing .0 and keeps one decimal", () => {
    expect(formatF(61)).toBe("61°F");
    expect(formatF(61.5)).toBe("61.5°F");
    expect(formatF(57.92)).toBe("57.9°F");
  });
});

describe("heatSummary", () => {
  const r = (id: string, at: string, kind: HeatReading["kind"], indoorF: number, outdoorF: number | null): HeatReading => ({
    id,
    at,
    kind,
    indoorF,
    outdoorF,
    outdoorSource: outdoorF === null ? null : "typed",
    createdAt: at,
  });

  it("counts readings below the minimum out of all readings, since the earliest", () => {
    const readings = [
      r("a", "2026-01-05T12:00:00Z", "heat", 61, 28), // day, below
      r("b", "2026-01-03T12:00:00Z", "heat", 70, 28), // day, ok
      r("c", "2026-01-04T08:00:00Z", "heat", 58, null), // night, below
      r("d", "2026-01-04T17:00:00Z", "heat", 60, null), // day, needs outdoor (not counted)
      r("e", "2026-01-04T17:00:00Z", "hot_water", 104, null), // below
    ];
    expect(heatSummary(readings)).toEqual({ total: 5, below: 3, since: "2026-01-03T12:00:00Z" });
    expect(heatSummary([])).toEqual({ total: 0, below: 0, since: null });
  });
});

describe("New York datetime-local helpers", () => {
  it("shows New York wall time", () => {
    expect(toNyInputValue("2026-01-03T12:15:00Z")).toBe("2026-01-03T07:15");
    expect(toNyInputValue("2026-10-25T03:30:00Z")).toBe("2026-10-24T23:30");
  });

  it("reads a value as New York wall time, EST and EDT", () => {
    expect(fromNyInputValue("2026-01-03T07:15")).toBe("2026-01-03T12:15:00.000Z");
    expect(fromNyInputValue("2026-03-08T06:00")).toBe("2026-03-08T10:00:00.000Z");
    expect(fromNyInputValue("2026-11-01T06:00")).toBe("2026-11-01T11:00:00.000Z");
  });

  it("round-trips, and rejects anything else", () => {
    for (const v of ["2026-01-15T22:00", "2026-07-04T06:00", "2026-11-01T00:30"]) {
      expect(toNyInputValue(fromNyInputValue(v)!)).toBe(v);
    }
    expect(fromNyInputValue("")).toBeNull();
    expect(fromNyInputValue("tomorrow")).toBeNull();
  });
});
