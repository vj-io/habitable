import { describe, expect, it } from "vitest";
import { NY_TZ, daysSince, formatNY, remaining, repairByDate } from "./countdown";

describe("repairByDate", () => {
  it("keeps NY wall-clock time for a 30-day window across the Nov 1 2026 DST change", () => {
    // Oct 15 2026 7:42 AM EDT (UTC-4) -> Nov 14 2026 7:42 AM EST (UTC-5)
    const out = repairByDate("2026-10-15T07:42:00-04:00", { days: 30, text: "30 days" });
    expect(out).toBe("2026-11-14T12:42:00.000Z");
    expect(formatNY(out, "datetime")).toBe("Nov 14, 2026, 7:42 AM");
  });

  it("keeps wall-clock time across the spring-forward change too", () => {
    // Feb 20 2026 9:00 AM EST -> Mar 22 2026 9:00 AM EDT
    expect(repairByDate("2026-02-20T09:00:00-05:00", { days: 30, text: "30 days" })).toBe("2026-03-22T13:00:00.000Z");
  });

  it("adds exact elapsed hours for an hours window (24h across fall-back is 24 real hours)", () => {
    // Oct 31 2026 12:00 PM EDT + 24h = Nov 1 2026 11:00 AM EST
    expect(repairByDate("2026-10-31T12:00:00-04:00", { hours: 24, text: "24 hours" })).toBe("2026-11-01T16:00:00.000Z");
    expect(repairByDate("2026-10-15T11:42:00.000Z", { hours: 24, text: "24 hours" })).toBe("2026-10-16T11:42:00.000Z");
  });

  it("preserves milliseconds and accepts UTC input", () => {
    expect(repairByDate("2026-10-15T11:42:00.123Z", { days: 7, text: "7 days" })).toBe("2026-10-22T11:42:00.123Z");
  });
});

describe("remaining", () => {
  const deadline = "2026-11-14T12:42:00.000Z";

  it("counts down before the deadline", () => {
    const r = remaining(deadline, new Date("2026-11-12T10:41:30.000Z")); // 2d 2h 0m 30s left
    expect(r).toEqual({ totalMs: 2 * 86400000 + 2 * 3600000 + 30000, days: 2, hours: 2, minutes: 0, seconds: 30, overdue: false });
  });

  it("reports the absolute overrun after the deadline", () => {
    const r = remaining(deadline, new Date("2026-11-15T13:43:05.000Z")); // 1d 1h 1m 5s over
    expect(r).toMatchObject({ days: 1, hours: 1, minutes: 1, seconds: 5, overdue: true });
    expect(r.totalMs).toBeLessThan(0);
  });

  it("is not overdue at the exact deadline", () => {
    expect(remaining(deadline, new Date(deadline))).toMatchObject({ totalMs: 0, days: 0, seconds: 0, overdue: false });
  });
});

describe("daysSince", () => {
  it("is day 1 on the day documented", () => {
    expect(daysSince("2026-10-15T08:00:00-04:00", new Date("2026-10-15T23:59:00-04:00"))).toBe(1);
  });

  it("rolls over at NY midnight, not UTC midnight", () => {
    // Both instants are on Oct 16 in UTC, but 23:30 is still Oct 15 in New York.
    expect(daysSince("2026-10-15T23:30:00-04:00", new Date("2026-10-16T00:30:00-04:00"))).toBe(2);
    // 9:30 PM EDT Oct 15 is already Oct 16 in UTC, yet it is still day 1 in NY.
    expect(daysSince("2026-10-15T08:00:00-04:00", new Date("2026-10-16T01:30:00Z"))).toBe(1);
  });

  it("counts calendar days across the DST change", () => {
    expect(daysSince("2026-10-31T12:00:00-04:00", new Date("2026-11-02T00:30:00-05:00"))).toBe(3);
  });
});

describe("formatNY", () => {
  it("formats in America/New_York regardless of the process time zone", () => {
    expect(NY_TZ).toBe("America/New_York");
    const iso = "2026-10-15T11:42:00.000Z"; // 7:42 AM in New York
    expect(formatNY(iso, "date")).toBe("Oct 15, 2026");
    expect(formatNY(iso, "datetime")).toBe("Oct 15, 2026, 7:42 AM");
    expect(formatNY(iso, "short")).toBe("Oct 15");
  });

  it("uses the NY date, not the UTC date, near midnight", () => {
    expect(formatNY("2026-10-16T02:30:00.000Z", "short")).toBe("Oct 15"); // 10:30 PM EDT on the 15th
  });
});

describe("nyWallTimeToIso", () => {
  it("reads EXIF wall time as New York time (EDT and EST)", async () => {
    const { nyWallTimeToIso } = await import("./countdown");
    expect(nyWallTimeToIso(2026, 10, 15, 7, 42, 10)).toBe("2026-10-15T11:42:10.000Z");
    expect(nyWallTimeToIso(2026, 12, 1, 9, 0, 0)).toBe("2026-12-01T14:00:00.000Z");
  });
});
