// Node has no IndexedDB, so the round-trip test runs on the store's in-memory fallback (same API as the IndexedDB path).
import { beforeEach, describe, expect, it } from "vitest";
import { backupFileName, exportCase, MAX_BACKUP_BYTES, parseBackup, restoreCase, type Backup } from "./backup";
import { clearAll, getCase, listIssues, saveCase, saveIssue } from "./store";
import type { CaseFile, Issue } from "./types";

const caseFile: CaseFile = {
  version: 1,
  address: { label: "618 West 136th Street, Manhattan, NY 10031", borough: "Manhattan", zip: "10031", bbl: "1020020091", lat: 40.82, lng: -73.95 },
  unit: "4B",
  yearBuilt: 1905,
  childUnder6: false,
  demo: false,
  createdAt: "2026-10-15T11:00:00.000Z",
  tenantName: "Ana",
};

const issue = (id = "issue-1", over: Partial<Issue> = {}): Issue => ({
  id,
  createdAt: "2026-10-15T11:42:00.000Z",
  note: "drip, drip",
  evidence: {
    sha256: "ab".repeat(32),
    capturedAt: "2026-10-15T11:40:00.000Z",
    captureSource: "exif",
    addedAt: "2026-10-15T11:42:00.000Z",
    receivedAt: "2026-10-15T11:42:01.000Z",
    receipt: "0123456789ab",
    photo: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==",
    width: 800,
    height: 600,
  },
  proposal: { issue: "leak", confidence: 0.93, rationale: "wet ceiling", source: "demo", model: "saved sample answer" },
  issue: "leak",
  facts: { active: "no" },
  outcome: {
    status: "classified",
    ruleId: "leak.stain",
    issue: "leak",
    hazardClass: "B",
    classLabel: "Hazardous",
    window: { days: 30, text: "30 days" },
    citation: "NYC Admin. Code §27-2017.3",
    sourceUrl: "https://example.org/rule",
    lawUrl: "https://example.org/law",
    plainEnglish: "A leak is hazardous.",
  },
  repairBy: "2026-11-14T12:42:00.000Z",
  followUps: [{ id: "f1", at: "2026-10-16T09:00:00.000Z", note: "still dripping", photo: "data:image/png;base64,iVBORw0KGgo=" }],
  fixedAt: null,
  ...over,
});

const backup = (over: Record<string, unknown> = {}) => ({
  app: "habitable",
  kind: "case-backup",
  version: 1,
  exportedAt: "2026-10-25T16:30:05.123Z",
  caseFile,
  issues: [issue()],
  ...over,
});

const parse = (b: unknown) => parseBackup(JSON.stringify(b));
const errorOf = (b: unknown) => {
  const r = parse(b);
  if (r.ok) throw new Error("expected a parse error");
  return r.error;
};

describe("parseBackup", () => {
  it("accepts a good backup and returns it typed and unchanged", () => {
    const r = parse(backup());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup).toEqual(backup());
  });

  it("accepts a case with no issues and a not-applicable note", () => {
    expect(parse(backup({ issues: [] })).ok).toBe(true);
    const note = issue("n", { outcome: { status: "not_applicable", ruleId: "x", issue: "not_covered", reason: "r" }, repairBy: null, issue: "not_covered" });
    expect(parse(backup({ issues: [note] })).ok).toBe(true);
  });

  it("rejects the wrong app or kind with a friendly message", () => {
    expect(errorOf(backup({ app: "other" }))).toMatch(/doesn't look like a Habitable backup/);
    expect(errorOf(backup({ kind: "something-else" }))).toMatch(/doesn't look like a Habitable backup/);
  });

  it("rejects text that is not JSON, or JSON that is not an object", () => {
    for (const text of ["", "not json", "[1,2]", "null", "42", '"str"']) {
      const r = parseBackup(text);
      expect(r.ok).toBe(false);
    }
  });

  it("rejects unknown versions, telling a newer file from an unsupported one", () => {
    expect(errorOf(backup({ version: 2 }))).toMatch(/newer version/);
    expect(errorOf(backup({ version: 0 }))).toMatch(/can't be restored/);
    expect(errorOf(backup({ version: "1" }))).toMatch(/can't be restored/);
    const { version: _omit, ...noVersion } = backup();
    void _omit;
    expect(errorOf(noVersion)).toMatch(/can't be restored/);
  });

  it("rejects malformed issues and says where the problem is", () => {
    expect(errorOf(backup({ issues: [{ ...issue(), evidence: undefined }] }))).toMatch(/issues\.0\.evidence/);
    expect(errorOf(backup({ issues: [issue("a", { createdAt: "yesterday" })] }))).toMatch(/issues\.0\.createdAt/);
    expect(errorOf(backup({ issues: [issue("a", { issue: "dragons" as never })] }))).toMatch(/issues\.0\.issue/);
    expect(errorOf(backup({ issues: "none" }))).toMatch(/damaged/);
    expect(errorOf(backup({ caseFile: { ...caseFile, address: { ...caseFile.address, bbl: "12" } } }))).toMatch(/caseFile\.address\.bbl/);
    expect(errorOf(backup({ caseFile: null }))).toMatch(/damaged/);
  });

  it("rejects values the app would render unsafely: remote photos, non-https links", () => {
    const withPhoto = (photo: string) => issue("p", { evidence: { ...issue().evidence, photo } });
    expect(errorOf(backup({ issues: [withPhoto("https://tracker.example/pixel.png")] }))).toMatch(/evidence\.photo/);
    expect(errorOf(backup({ issues: [withPhoto("data:image/svg+xml;base64,PHN2Zz4=")] }))).toMatch(/evidence\.photo/);
    const badLink = issue("l", { outcome: { ...(issue().outcome as Extract<Issue["outcome"], { status: "classified" }>), sourceUrl: "javascript:alert(1)" } });
    expect(errorOf(backup({ issues: [badLink] }))).toMatch(/outcome/);
  });

  it("rejects a bad fingerprint or receipt, and two issues with one id", () => {
    expect(errorOf(backup({ issues: [issue("a", { evidence: { ...issue().evidence, sha256: "xyz" } })] }))).toMatch(/sha256/);
    expect(errorOf(backup({ issues: [issue("a", { evidence: { ...issue().evidence, receipt: "nope" } })] }))).toMatch(/receipt/);
    expect(errorOf(backup({ issues: [issue("same"), issue("same")] }))).toMatch(/damaged/);
  });

  it("rejects text over the size cap before parsing it", () => {
    const r = parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too big/);
  });

  it("drops fields it doesn't know", () => {
    const r = parse(backup({ caseFile: { ...caseFile, extra: "x" }, surprise: 1 }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect("extra" in r.backup.caseFile).toBe(false);
      expect("surprise" in r.backup).toBe(false);
    }
  });
});

describe("export and restore", () => {
  beforeEach(() => clearAll());

  it("exports null when there is no case", async () => {
    expect(await exportCase()).toBeNull();
  });

  it("round-trips: export, delete everything, restore", async () => {
    await saveCase(caseFile);
    await saveIssue(issue("one"));
    await saveIssue(issue("two", { createdAt: "2026-10-16T08:00:00.000Z" }));

    const exported = (await exportCase(new Date("2026-10-25T16:30:05.123Z")))!;
    expect(exported).toMatchObject({ app: "habitable", kind: "case-backup", version: 1, exportedAt: "2026-10-25T16:30:05.123Z" });
    expect(exported.issues).toHaveLength(2);

    await clearAll();
    expect(await getCase()).toBeNull();

    const parsed = parseBackup(JSON.stringify(exported));
    expect(parsed.ok).toBe(true);
    await restoreCase((parsed as { ok: true; backup: Backup }).backup);

    expect(await getCase()).toEqual(caseFile);
    expect((await listIssues()).map((i) => i.id)).toEqual(["two", "one"]); // newest first
  });

  it("replaces what is there, it does not merge", async () => {
    await saveCase(caseFile);
    await saveIssue(issue("old"));
    await restoreCase(backup({ issues: [issue("new")] }) as unknown as Backup);
    expect((await listIssues()).map((i) => i.id)).toEqual(["new"]);
  });
});

describe("backupFileName", () => {
  it("is habitable-case-<New York date>.json", () => {
    expect(backupFileName(new Date("2026-10-25T16:30:00Z"))).toBe("habitable-case-2026-10-25.json");
    expect(backupFileName(new Date("2026-10-26T02:30:00Z"))).toBe("habitable-case-2026-10-25.json"); // still the 25th in New York
  });
});
