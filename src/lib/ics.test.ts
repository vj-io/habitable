import { describe, expect, it } from "vitest";
import { escapeText, foldLine, repairByFileName, repairByIcs } from "./ics";
import type { CaseFile, Issue } from "./types";

const caseFile: CaseFile = {
  version: 1,
  address: { label: "618 West 136th Street, Manhattan, NY 10031", borough: "Manhattan", bbl: "1020020091" },
  unit: "4B",
  yearBuilt: 1905,
  childUnder6: null,
  demo: false,
  createdAt: "2026-10-15T11:00:00.000Z",
};

const issue = (over: Partial<Issue> = {}): Issue => ({
  id: "abc-123",
  createdAt: "2026-10-15T11:42:00.000Z",
  note: "",
  evidence: { sha256: "a".repeat(64), capturedAt: null, captureSource: "added", addedAt: "2026-10-15T11:42:00.000Z", receivedAt: null, receipt: null, photo: "data:image/jpeg;base64,AA", width: 1, height: 1 },
  proposal: { issue: "leak", confidence: 0.9, rationale: "", source: "demo" },
  issue: "leak",
  facts: {},
  outcome: {
    status: "classified",
    ruleId: "leak.stain",
    issue: "leak",
    hazardClass: "B",
    classLabel: "Hazardous",
    window: { days: 30, text: "30 days" },
    citation: "NYC Admin. Code §27-2017.3",
    sourceUrl: "https://example.org/rule",
    plainEnglish: "",
  },
  repairBy: "2026-11-14T12:42:00.000Z", // 7:42 AM in New York
  followUps: [],
  fixedAt: null,
  ...over,
});

const NOW = new Date("2026-10-25T16:30:05.123Z");
const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const octets = (s: string) => new TextEncoder().encode(s).length;

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and line breaks (RFC 5545 §3.3.11)", () => {
    expect(escapeText("a,b;c\\d")).toBe("a\\,b\\;c\\\\d");
    expect(escapeText("one\ntwo\r\nthree\rfour")).toBe("one\\ntwo\\nthree\\nfour");
  });
});

describe("foldLine", () => {
  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:short")).toEqual(["SUMMARY:short"]);
  });

  it("folds at 75 octets, continuation lines start with one space, and unfolding restores the text", () => {
    const line = "DESCRIPTION:" + "word ".repeat(60);
    const parts = foldLine(line);
    expect(parts.length).toBeGreaterThan(3);
    for (const p of parts) expect(octets(p)).toBeLessThanOrEqual(75);
    for (const p of parts.slice(1)) expect(p.startsWith(" ")).toBe(true);
    expect(parts.join("\r\n").replace(/\r\n /g, "")).toBe(line);
  });

  it("counts octets, not characters, and never splits a multi-byte character", () => {
    const line = "SUMMARY:" + "—é😀".repeat(40); // 3 + 2 + 4 octets each
    const parts = foldLine(line);
    for (const p of parts) expect(octets(p)).toBeLessThanOrEqual(75);
    expect(parts.join("\r\n").replace(/\r\n /g, "")).toBe(line);
    // every piece is valid UTF-8 on its own (a split character would decode to U+FFFD)
    for (const p of parts) expect(new TextDecoder("utf-8", { fatal: true }).decode(new TextEncoder().encode(p))).toBe(p);
  });
});

describe("repairByIcs", () => {
  it("is one VCALENDAR with one VEVENT and one VALARM, CRLF line endings throughout", () => {
    const ics = repairByIcs(caseFile, issue(), NOW)!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/); // no bare CR or LF
    const lines = ics.split("\r\n");
    for (const tag of ["VCALENDAR", "VEVENT", "VALARM"]) {
      expect(lines.filter((l) => l === `BEGIN:${tag}`)).toHaveLength(1);
      expect(lines.filter((l) => l === `END:${tag}`)).toHaveLength(1);
    }
    for (const l of lines) expect(octets(l)).toBeLessThanOrEqual(75);
  });

  it("is an all-day event on the New York date of the repair-by instant", () => {
    const text = unfold(repairByIcs(caseFile, issue(), NOW)!);
    expect(text).toContain("\r\nDTSTART;VALUE=DATE:20261114\r\n");
    expect(text).toContain("\r\nDTEND;VALUE=DATE:20261115\r\n");
    // 03:30 UTC on the 15th is still the 14th in New York
    const late = unfold(repairByIcs(caseFile, issue({ repairBy: "2026-11-15T03:30:00.000Z" }), NOW)!);
    expect(late).toContain("DTSTART;VALUE=DATE:20261114");
  });

  it("ends the day after across month and year boundaries", () => {
    const eom = unfold(repairByIcs(caseFile, issue({ repairBy: "2026-11-30T15:00:00.000Z" }), NOW)!);
    expect(eom).toContain("DTSTART;VALUE=DATE:20261130");
    expect(eom).toContain("DTEND;VALUE=DATE:20261201");
    const eoy = unfold(repairByIcs(caseFile, issue({ repairBy: "2026-12-31T15:00:00.000Z" }), NOW)!);
    expect(eoy).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("stamps DTSTAMP in UTC from `now` and keeps the UID stable per issue", () => {
    const a = unfold(repairByIcs(caseFile, issue(), NOW)!);
    const b = unfold(repairByIcs(caseFile, issue(), new Date("2026-12-01T00:00:00Z"))!);
    expect(a).toContain("\r\nDTSTAMP:20261025T163005Z\r\n");
    expect(a.match(/UID:.*/)![0]).toBe(b.match(/UID:.*/)![0]);
    const other = unfold(repairByIcs(caseFile, issue({ id: "zzz" }), NOW)!);
    expect(other.match(/UID:.*/)![0]).not.toBe(a.match(/UID:.*/)![0]);
  });

  it("names the problem and the home in the summary, and puts the class, window and citation in the description", () => {
    const text = unfold(repairByIcs(caseFile, issue(), NOW)!);
    expect(text).toContain("\r\nSUMMARY:Repair-by date: Leak — 618 West 136th Street 4B\r\n");
    expect(text).toContain("Class B · Hazardous · 30 days correction window");
    expect(text).toContain("NYC Admin. Code §27-2017.3");
    expect(text).toContain("7:42 AM");
  });

  it("escapes commas and semicolons in the summary", () => {
    const text = unfold(repairByIcs({ ...caseFile, unit: "4B, rear; left" }, issue(), NOW)!);
    expect(text).toContain("\r\nSUMMARY:Repair-by date: Leak — 618 West 136th Street 4B\\, rear\\; left\r\n");
  });

  it("adds a display alarm 15 hours before the all-day start: 9 AM the morning before", () => {
    const text = repairByIcs(caseFile, issue(), NOW)!;
    expect(text).toMatch(/BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:[^\r]+\r\nTRIGGER:-PT15H\r\nEND:VALARM/);
  });

  it("words an immediately-hazardous heat issue without a window length", () => {
    const heat = issue({
      outcome: {
        status: "classified",
        ruleId: "heat",
        issue: "heat_hot_water",
        hazardClass: "C",
        classLabel: "Immediately hazardous",
        window: { hours: 24, text: "No time — immediately" },
        citation: "NYC Admin. Code §27-2029",
        sourceUrl: "https://example.org/heat",
        plainEnglish: "",
      },
    });
    const text = unfold(repairByIcs(caseFile, heat, NOW)!);
    expect(text).toContain("Class C · Immediately hazardous · no time to correct");
    expect(text).toContain("Repair-by date: Heat / hot water");
  });

  it("returns null for an issue with no class or no repair-by date", () => {
    const note = issue({ outcome: { status: "not_applicable", ruleId: "x", issue: "leak", reason: "" }, repairBy: null });
    expect(repairByIcs(caseFile, note, NOW)).toBeNull();
    expect(repairByIcs(caseFile, issue({ repairBy: null }), NOW)).toBeNull();
  });
});

describe("repairByFileName", () => {
  it("is habitable-repair-by-<problem>-<New York date>.ics", () => {
    expect(repairByFileName(issue())).toBe("habitable-repair-by-leak-2026-11-14.ics");
    expect(repairByFileName(issue({ issue: "heat_hot_water", repairBy: "2026-11-15T03:30:00.000Z" }))).toBe("habitable-repair-by-heat-hot-water-2026-11-14.ics");
  });
});
