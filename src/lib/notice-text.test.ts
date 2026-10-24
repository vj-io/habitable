import { describe, expect, it } from "vitest";
import { complaint311Text, complaintUrl, noticeFileName, noticeText } from "./notice-text";
import { repairByDate } from "./countdown";
import { evaluate } from "./rules";
import type { CaseFile, Facts, Issue, ProposalIssue } from "./types";

const NOW = new Date("2026-10-24T14:00:00Z"); // Oct 24 2026, 10:00 AM in New York
const ORIGIN = "https://habitable.example";

const CASE: CaseFile = {
  version: 1,
  address: { label: "618 West 136th Street, Manhattan, NY 10031", borough: "Manhattan", bbl: "1020020091" },
  unit: "4B",
  yearBuilt: 1905,
  childUnder6: null,
  demo: false,
  createdAt: "2026-10-12T12:00:00Z",
};

function issue(id: string, kind: ProposalIssue, facts: Facts, createdAt: string, over: Partial<Issue> = {}): Issue {
  const outcome = evaluate(kind, facts, { now: NOW, yearBuilt: 1905 });
  if (outcome.status === "needs_facts") throw new Error("fixture needs facts");
  return {
    id,
    createdAt,
    note: "",
    evidence: {
      sha256: "9f2c3a1b" + "0".repeat(52) + "e41a",
      capturedAt: createdAt,
      captureSource: "exif",
      addedAt: createdAt,
      receivedAt: createdAt,
      receipt: "738193f80d3a",
      photo: "data:image/jpeg;base64,/9j/4AAQ",
      width: 800,
      height: 600,
    },
    proposal: { issue: kind, confidence: 0.9, rationale: "test", source: "demo" },
    issue: kind,
    facts,
    outcome: outcome as Issue["outcome"],
    repairBy: outcome.status === "classified" ? repairByDate(createdAt, outcome.window) : null,
    followUps: [],
    fixedAt: null,
    ...over,
  };
}

// Mold (Class B) is older than the leak (Class C), and pests is fixed.
const mold = issue("m", "mold", { moldArea: "10to29" }, "2026-10-12T23:05:33Z", { note: "Black mold above the tub" });
const leak = issue("l", "leak", { activeLeak: "yes" }, "2026-10-15T11:42:10Z", {
  note: "Ceiling dripping since Tuesday",
  followUps: [
    { id: "f1", at: "2026-10-18T14:00:00Z", note: "still dripping" },
    { id: "f2", at: "2026-10-20T14:00:00Z", note: "worse, bucket fills daily" },
  ],
});
const pests = issue("p", "pests", { pest: "mice_roaches_rats" }, "2026-10-18T02:14:47Z", { fixedAt: "2026-10-22T12:00:00Z" });

describe("noticeText (en)", () => {
  const t = noticeText({ ...CASE, landlordName: "Acme Realty LLC", tenantName: "Sam Rivera" }, [mold, pests, leak], "en", NOW, ORIGIN);

  it("has the letter header", () => {
    expect(t.title).toBe("Notice of Conditions Requiring Repair");
    expect(t.dateLine).toBe("Date: Oct 24, 2026");
    expect(t.to).toBe("Acme Realty LLC");
    expect(t.from).toBe("Sam Rivera");
    expect(t.re).toBe("618 West 136th Street, Manhattan, NY 10031, Apt 4B");
    expect(t.signature).toBe("Sam Rivera");
  });

  it("lists open issues only, Class C first", () => {
    expect(t.items.map((i) => [i.n, i.label, i.hazardClass])).toEqual([
      [1, "Leak / water damage", "C"],
      [2, "Mold", "B"],
    ]);
    expect(t.fixedCount).toBe(1);
  });

  it("states class, window, citation and requested repair-by date", () => {
    const [l, m] = t.items;
    expect(l.classLine).toBe("HPD Class C — Immediately hazardous");
    expect(l.classBadge).toBe("Class C");
    expect(l.windowLine).toBe("HPD correction window: 24 hours");
    expect(l.citation).toContain("§27-2005(a)");
    expect(l.repairBy).toBe("Oct 16, 2026");
    expect(m.classLine).toBe("HPD Class B — Hazardous");
    expect(m.windowLine).toBe("HPD correction window: 30 days");
    expect(m.repairBy).toBe("Nov 11, 2026");
  });

  it("carries dates, day counter, note, follow-ups and the evidence line", () => {
    const [l, m] = t.items;
    expect(l.firstDocumented).toBe("Oct 15, 2026");
    expect(l.dayN).toBe(10);
    expect(m.dayN).toBe(13);
    expect(l.note).toBe("Ceiling dripping since Tuesday");
    expect(l.followUpCount).toBe(2);
    expect(l.latestFollowUp).toEqual({ date: "Oct 20, 2026", note: "worse, bucket fills daily" });
    expect(l.followUpLine).toBe("Followed up 2 times; most recent Oct 20, 2026 — worse, bucket fills daily.");
    expect(m.followUpLine).toBeNull();
    expect(l.evidenceLine).toBe("Photo taken Oct 15, 2026, 7:42 AM · fingerprint 9f2c3a1b…e41a · receipt 738193f80d3a");
    expect(l.photo).toMatch(/^data:image\/jpeg/);
  });

  it("asks for access and never suggests withholding rent or threatens", () => {
    expect(t.closing).toContain("arrange access");
    expect(t.closing).toContain("I may ask NYC 311 to request an HPD inspection");
    expect(t.closing + t.intro + t.footer.join(" ")).not.toMatch(/withhold|sue|court|lawsuit/i);
  });

  it("footer disclaims and links to /verify", () => {
    expect(t.footer[0]).toBe(
      "Prepared with Habitable on Oct 24, 2026. Classes and windows are those HPD publishes for these conditions; HPD's inspector assigns the actual class, and correction periods run from service of an HPD violation. Not legal advice.",
    );
    expect(t.footer[1]).toBe("Verify receipts at https://habitable.example/verify");
    expect(noticeText(CASE, [leak], "en", NOW, `${ORIGIN}/`).footer[1]).toBe("Verify receipts at https://habitable.example/verify");
  });

  it("falls back to generic names", () => {
    const d = noticeText(CASE, [leak], "en", NOW, ORIGIN);
    expect([d.to, d.from, d.signature]).toEqual(["Owner / Managing Agent", "Tenant", "Tenant"]);
  });
});

describe("noticeText (es)", () => {
  const t = noticeText(CASE, [mold, pests, leak], "es", NOW, ORIGIN);

  it("translates the letter", () => {
    expect(t.title).toBe("Aviso de condiciones que requieren reparación");
    expect(t.dateLine).toBe("Fecha: 24 de octubre de 2026");
    expect(t.to).toBe("Propietario / Agente administrador");
    expect(t.from).toBe("Inquilino/a");
    expect(t.re).toBe("618 West 136th Street, Manhattan, NY 10031, Apto. 4B");
    expect(t.labels.repairBy).toBe("Se solicita reparar antes del");
    expect(t.footer[1]).toBe("Verifique los recibos en https://habitable.example/verify");
    expect(t.footer[0]).toMatch(/^Preparado con Habitable el 24 de octubre de 2026\./);
    expect(t.footer[0]).toMatch(/No es asesoría legal\.$/);
  });

  it("translates labels, classes, windows, citations and dates", () => {
    const [l, m] = t.items;
    expect(l.label).toBe("Filtración / daño por agua");
    expect(m.label).toBe("Moho");
    expect(l.classLine).toBe("Clase C de HPD — Inmediatamente peligrosa");
    expect(m.classLine).toBe("Clase B de HPD — Peligrosa");
    expect(l.windowLine).toBe("Plazo de corrección de HPD: 24 horas");
    expect(m.windowLine).toBe("Plazo de corrección de HPD: 30 días");
    expect(m.citation).toContain("Código Administrativo de NYC");
    expect(m.citation).toContain("Ley Local 55 de 2018");
    expect(l.firstDocumented).toBe("15 de octubre de 2026");
    expect(l.repairBy).toBe("16 de octubre de 2026");
    expect(l.evidenceLine).toBe("Foto tomada el 15 de octubre de 2026 a las 7:42 a.m. · huella digital 9f2c3a1b…e41a · recibo 738193f80d3a");
    expect(l.followUpLine).toBe("Di seguimiento 2 veces; el más reciente fue el 20 de octubre de 2026 — worse, bucket fills daily.");
  });

  it("maps every issue label", () => {
    const more = [
      issue("h", "heat_hot_water", { problem: "no_heat" }, "2026-10-20T10:58:02Z"),
      issue("k", "lock_door", { door: "apartment_cannot_lock" }, "2026-10-21T03:31:09Z", { note: "x" }),
      issue("pp", "peeling_paint", { childUnder6: "no", plasterDamage: "no" }, "2026-10-10T12:00:00Z", { note: "x" }),
      issue("nc", "not_covered", {}, "2026-10-11T12:00:00Z", { note: "Loud pipes" }),
    ];
    const labels = noticeText(CASE, more, "es", NOW, ORIGIN).items.map((i) => i.label);
    expect(labels).toContain("Otra condición");
    expect(labels.every((l) => !/[a-z]+ \/ [a-z]+ (damage|water)/i.test(l))).toBe(true);
  });
});

describe("which issues appear", () => {
  // A rules-table "not applicable" outcome: no class, no window, no repair-by date.
  const classless = (note: string): Issue => ({
    ...issue("u", "peeling_paint", { childUnder6: "no", plasterDamage: "no" }, "2026-10-10T12:00:00Z", { note }),
    outcome: { status: "not_applicable", ruleId: "x", issue: "peeling_paint", reason: "r" },
    repairBy: null,
  });

  it("keeps a classless issue only when it has a note, after the classified ones", () => {
    const t = noticeText(CASE, [classless("Paint flaking by the window"), leak], "en", NOW, ORIGIN);
    expect(t.items.map((i) => i.issueId)).toEqual(["l", "u"]);
    const last = t.items[1];
    expect([last.classLine, last.windowLine, last.citation, last.repairBy]).toEqual([null, null, null, null]);
    expect(last.note).toBe("Paint flaking by the window");

    expect(noticeText(CASE, [classless("  "), leak], "en", NOW, ORIGIN).items.map((i) => i.issueId)).toEqual(["l"]);
  });

  it("orders equal classes by first documented, oldest first", () => {
    const early = issue("e", "mold", { moldArea: "10to29" }, "2026-10-01T12:00:00Z");
    const late = issue("z", "mold", { moldArea: "10to29" }, "2026-10-05T12:00:00Z");
    expect(noticeText(CASE, [late, early], "en", NOW, ORIGIN).items.map((i) => i.issueId)).toEqual(["e", "z"]);
  });

  it("says when the photo has no EXIF capture time", () => {
    const noExif = issue("n", "leak", { activeLeak: "no" }, "2026-10-15T11:42:10Z", {
      evidence: { ...leak.evidence, capturedAt: null, captureSource: "added", receipt: null },
    });
    expect(noticeText(CASE, [noExif], "en", NOW, ORIGIN).items[0].evidenceLine).toBe("Photo added Oct 15, 2026, 7:42 AM · fingerprint 9f2c3a1b…e41a");
  });
});

describe("complaint311Text", () => {
  it("covers condition, location, first date, still present, note and photos", () => {
    const s = complaint311Text(CASE, leak, NOW);
    expect(s).toBe(
      'Condition: Leak / water damage. Location: 618 West 136th Street, Manhattan, NY 10031, Apt 4B. First documented Oct 15, 2026; still present as of Oct 24, 2026. Tenant\'s note: "Ceiling dripping since Tuesday". Dated photos available.',
    );
    expect(s.length).toBeLessThanOrEqual(600);
  });

  it("omits the note when there is none", () => {
    expect(complaint311Text(CASE, pests, NOW)).not.toContain("note");
  });

  it("stays within 600 characters for a very long note, keeping the closing line", () => {
    const long = issue("x", "leak", { activeLeak: "no" }, "2026-10-15T11:42:10Z", { note: "drip ".repeat(400) });
    const s = complaint311Text(CASE, long, NOW);
    expect(s.length).toBeLessThanOrEqual(600);
    expect(s.endsWith("Dated photos available.")).toBe(true);
    expect(s).toContain("…");
  });
});

describe("complaintUrl", () => {
  it("uses the rules table link, with a generic fallback", () => {
    expect(complaintUrl(leak)).toBe("https://portal.311.nyc.gov/article/?kanumber=KA-01074");
    expect(complaintUrl({ ...leak, issue: "not_covered" })).toBe("https://portal.311.nyc.gov/");
  });
});

describe("noticeFileName", () => {
  it("is habitable-notice-<street>-<date>.pdf on the New York calendar", () => {
    expect(noticeFileName(CASE, NOW)).toBe("habitable-notice-618-west-136th-street-2026-10-24.pdf");
    // 02:00 UTC on Oct 25 is still Oct 24 evening in New York
    expect(noticeFileName(CASE, new Date("2026-10-25T02:00:00Z"))).toBe("habitable-notice-618-west-136th-street-2026-10-24.pdf");
  });

  it("slugs accents and falls back when there is no street", () => {
    const c = { ...CASE, address: { ...CASE.address, label: "45 Avenida Ñandú, Bronx, NY" } };
    expect(noticeFileName(c, NOW)).toBe("habitable-notice-45-avenida-nandu-2026-10-24.pdf");
    expect(noticeFileName({ ...CASE, address: { ...CASE.address, label: "" } }, NOW)).toBe("habitable-notice-home-2026-10-24.pdf");
  });
});
