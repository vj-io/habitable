import { describe, expect, it } from "vitest";
import { formatNY } from "../countdown";
import { heatSummary } from "../heat";
import { sampleHeatReadings } from "./heat";

describe("sampleHeatReadings", () => {
  it("is five DEMO readings on January 3-5 of this year, typed outdoor temps, four below the minimum", () => {
    const r = sampleHeatReadings(new Date("2026-10-25T12:00:00Z"));
    expect(r).toHaveLength(5);
    expect(r.every((x) => x.demo && x.id.startsWith("demo-heat-"))).toBe(true);
    expect(r.map((x) => formatNY(x.at, "datetime"))).toEqual([
      "Jan 3, 2026, 7:15 AM",
      "Jan 3, 2026, 11:30 PM",
      "Jan 4, 2026, 2:00 PM",
      "Jan 5, 2026, 6:45 AM",
      "Jan 5, 2026, 8:00 PM",
    ]);
    expect(r.every((x) => x.outdoorSource !== "nws")).toBe(true);
    expect(heatSummary(r)).toEqual({ total: 5, below: 4, since: r[0].at });
  });

  it("uses last January when this January's dates haven't happened yet", () => {
    expect(formatNY(sampleHeatReadings(new Date("2027-01-02T17:00:00Z"))[0].at, "date")).toBe("Jan 3, 2026");
    expect(formatNY(sampleHeatReadings(new Date("2027-01-06T17:00:00Z"))[0].at, "date")).toBe("Jan 3, 2027");
  });
});
