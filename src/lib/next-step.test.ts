import { describe, expect, it } from "vitest";
import { nextStep } from "./next-step";
import type { Issue } from "./types";

const NOW = new Date("2026-10-24T14:00:00Z");

// Only the fields nextStep reads.
const issue = (over: Partial<Issue>): Issue => ({ id: "x", fixedAt: null, repairBy: null, ...over }) as Issue;
const fresh = issue({ repairBy: "2026-11-14T12:00:00.000Z" }); // 21 days away
const late = issue({ repairBy: "2026-10-16T12:00:00.000Z" }); // a week ago
const fixed = issue({ fixedAt: "2026-10-20T12:00:00.000Z", repairBy: "2026-10-01T12:00:00.000Z" });
const note = issue({ repairBy: null }); // a classless note has no repair-by date

describe("nextStep", () => {
  it("no issues: start with a photo", () => {
    expect(nextStep({}, [], NOW)).toEqual({ kind: "photo" });
  });

  it("everything fixed: nothing to do, even with a notice made and a date long past", () => {
    expect(nextStep({ noticeMadeAt: "2026-10-10T00:00:00Z" }, [fixed], NOW)).toEqual({ kind: "fixed" });
  });

  it("open issues and no notice yet: make the notice, and say how many are past their date", () => {
    expect(nextStep({}, [fresh, note, fixed], NOW)).toEqual({ kind: "notice", open: 2, overdue: 0 });
    expect(nextStep({}, [fresh, late], NOW)).toEqual({ kind: "notice", open: 2, overdue: 1 });
  });

  it("notice made and every date still ahead: wait, and remember when the notice was made", () => {
    expect(nextStep({ noticeMadeAt: "2026-10-20T00:00:00Z" }, [fresh, note], NOW)).toEqual({ kind: "waiting", open: 2, noticeMadeAt: "2026-10-20T00:00:00Z" });
  });

  it("notice made and a repair-by date passed: file with 311 (counts only open issues)", () => {
    expect(nextStep({ noticeMadeAt: "2026-10-10T00:00:00Z" }, [late, late, fresh, fixed], NOW)).toEqual({ kind: "file", overdue: 2 });
  });

  it("a repair-by date exactly now is not late yet", () => {
    expect(nextStep({ noticeMadeAt: "2026-10-10T00:00:00Z" }, [issue({ repairBy: NOW.toISOString() })], NOW).kind).toBe("waiting");
  });

  it("before the clock has ticked nothing counts as late", () => {
    expect(nextStep({ noticeMadeAt: "2026-10-10T00:00:00Z" }, [late], null).kind).toBe("waiting");
    expect(nextStep({}, [late], null)).toEqual({ kind: "notice", open: 1, overdue: 0 });
  });
});
