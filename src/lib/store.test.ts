// Node has no IndexedDB, so these tests exercise the in-memory fallback (same API as the IndexedDB path).
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addFollowUp,
  clearAll,
  deleteHeatReading,
  deleteIssue,
  getCase,
  getIssue,
  isPersistent,
  listHeatReadings,
  listIssues,
  markFixed,
  saveCase,
  saveHeatReading,
  saveIssue,
  storageAvailable,
  subscribe,
} from "./store";
import type { CaseFile, HeatReading, Issue } from "./types";

const caseFile: CaseFile = {
  version: 1,
  address: { label: "1 Main St, Brooklyn, NY", borough: "Brooklyn", bbl: "3000000001" },
  unit: "4B",
  yearBuilt: 1931,
  childUnder6: null,
  demo: true,
  createdAt: "2026-10-15T11:00:00.000Z",
};

const issue = (id: string, createdAt: string): Issue => ({
  id,
  createdAt,
  note: "",
  evidence: { sha256: "a".repeat(64), capturedAt: null, captureSource: "added", addedAt: createdAt, receivedAt: null, receipt: null, photo: "data:image/jpeg;base64,AA", width: 1, height: 1 },
  proposal: { issue: "leak", confidence: 0.9, rationale: "", source: "demo" },
  issue: "leak",
  facts: {},
  outcome: { status: "not_applicable", ruleId: "x", issue: "leak", reason: "" },
  repairBy: null,
  followUps: [],
  fixedAt: null,
});

beforeEach(() => clearAll());

describe("store (memory fallback)", () => {
  it("reports IndexedDB unavailable and stays non-persistent", async () => {
    expect(await storageAvailable()).toBe(false);
    expect(isPersistent()).toBe(false);
  });

  it("round-trips the case and clears it", async () => {
    expect(await getCase()).toBeNull();
    await saveCase(caseFile);
    expect(await getCase()).toEqual(caseFile);
    await clearAll();
    expect(await getCase()).toBeNull();
  });

  it("lists issues newest first and upserts by id", async () => {
    await saveIssue(issue("old", "2026-10-01T00:00:00.000Z"));
    await saveIssue(issue("new", "2026-10-15T00:00:00.000Z"));
    expect((await listIssues()).map((i) => i.id)).toEqual(["new", "old"]);
    await saveIssue({ ...issue("old", "2026-10-01T00:00:00.000Z"), note: "edited" });
    expect(await listIssues()).toHaveLength(2);
    expect((await getIssue("old"))?.note).toBe("edited");
    await deleteIssue("old");
    expect(await getIssue("old")).toBeNull();
  });

  it("adds follow-ups (keeping all of them under concurrent calls) and marks fixed", async () => {
    await saveIssue(issue("i1", "2026-10-15T00:00:00.000Z"));
    const [a] = await Promise.all([addFollowUp("i1", { note: "first" }), addFollowUp("i1", { note: "second", photo: "data:image/jpeg;base64,BB" })]);
    expect(a.followUps.length).toBeGreaterThan(0);
    const stored = await getIssue("i1");
    expect(stored?.followUps.map((f) => f.note).sort()).toEqual(["first", "second"]);
    expect(stored?.followUps.find((f) => f.note === "first")).not.toHaveProperty("photo");
    expect(stored?.followUps[0].id).toMatch(/^[0-9a-f-]{36}$/);

    const fixed = await markFixed("i1", "2026-10-20T00:00:00.000Z");
    expect(fixed.fixedAt).toBe("2026-10-20T00:00:00.000Z");
    expect((await getIssue("i1"))?.fixedAt).toBe("2026-10-20T00:00:00.000Z");
  });

  it("rejects follow-ups and fixes for an unknown issue", async () => {
    await expect(addFollowUp("nope", { note: "x" })).rejects.toThrow(/not found/);
    await expect(markFixed("nope")).rejects.toThrow(/not found/);
  });

  it("does not hand out references into the store", async () => {
    await saveIssue(issue("i1", "2026-10-15T00:00:00.000Z"));
    (await getIssue("i1"))!.note = "mutated";
    expect((await getIssue("i1"))?.note).toBe("");
  });

  it("keeps heat readings newest first, upserts and deletes by id, and clears them with the case", async () => {
    const reading = (id: string, at: string): HeatReading => ({
      id,
      at,
      kind: "heat",
      indoorF: 61,
      outdoorF: 28,
      outdoorSource: "nws",
      outdoorStation: "KNYC",
      outdoorObservedAt: at,
      createdAt: at,
    });
    await Promise.all([saveHeatReading(reading("a", "2026-01-03T12:00:00.000Z")), saveHeatReading(reading("b", "2026-01-05T12:00:00.000Z"))]);
    expect((await listHeatReadings()).map((r) => r.id)).toEqual(["b", "a"]);
    await saveHeatReading({ ...reading("a", "2026-01-03T12:00:00.000Z"), indoorF: 59 });
    expect(await listHeatReadings()).toHaveLength(2);
    expect((await listHeatReadings()).find((r) => r.id === "a")?.indoorF).toBe(59);
    await deleteHeatReading("b");
    expect((await listHeatReadings()).map((r) => r.id)).toEqual(["a"]);
    await clearAll();
    expect(await listHeatReadings()).toEqual([]);
  });

  it("notifies subscribers after every write until unsubscribed", async () => {
    const fn = vi.fn();
    const off = subscribe(fn);
    await saveCase(caseFile);
    await saveIssue(issue("i1", "2026-10-15T00:00:00.000Z"));
    await deleteIssue("i1");
    await clearAll();
    expect(fn).toHaveBeenCalledTimes(4);
    off();
    await saveCase(caseFile);
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
