import { describe, expect, it } from "vitest";
import {
  FORBIDDEN,
  LIMITS,
  PLACEHOLDERS,
  buildFacts,
  callLines,
  describeCheck,
  placeholderValues,
  render,
  segments,
  substitute,
  templateDraft,
  urgency,
  validateDraft,
  type Channel,
  type CoachFacts,
  type Draft,
  type Lang,
  type Tone,
} from "./coach";
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

const classified = (over: Record<string, unknown>) => ({
  status: "classified" as const,
  ruleId: "r",
  issue: "leak" as const,
  hazardClass: "B" as const,
  classLabel: "Hazardous",
  window: { days: 30, text: "30 days" },
  citation: "NYC Admin. Code §27-2005(a), §27-2026",
  sourceUrl: "https://example.org/rule",
  plainEnglish: "",
  ...over,
});

const issue = (over: Partial<Issue> = {}): Issue => ({
  id: "abc-123",
  createdAt: "2026-10-15T11:42:00.000Z",
  note: "",
  evidence: { sha256: "a".repeat(64), capturedAt: null, captureSource: "added", addedAt: "2026-10-15T11:42:00.000Z", receivedAt: null, receipt: null, photo: "data:image/jpeg;base64,AA", width: 1, height: 1 },
  proposal: { issue: "leak", confidence: 0.9, rationale: "", source: "demo" },
  issue: "leak",
  facts: {},
  outcome: classified({}),
  repairBy: "2026-11-14T12:42:00.000Z", // Nov 14 in New York
  followUps: [],
  fixedAt: null,
  ...over,
});

const NOW = new Date("2026-10-25T16:30:05.123Z"); // day 11 of the leak above

// One case per hazard class and window kind the rules table can produce.
const CASES: Record<string, Issue> = {
  "B leak (30 days)": issue(),
  "C leak (24 hours)": issue({
    outcome: classified({ hazardClass: "C", classLabel: "Immediately hazardous", window: { hours: 24, text: "24 hours" } }),
    repairBy: "2026-10-16T11:42:00.000Z",
  }),
  "C heat (no time)": issue({
    issue: "heat_hot_water",
    outcome: classified({ issue: "heat_hot_water", hazardClass: "C", classLabel: "Immediately hazardous", window: { hours: 24, text: "No time — immediately" }, citation: "NYC Admin. Code §27-2029(a) (as amended by Local Law 86 of 2017)" }),
    repairBy: "2026-10-16T11:42:00.000Z",
  }),
  "C mold (21 days)": issue({
    issue: "mold",
    outcome: classified({ issue: "mold", hazardClass: "C", classLabel: "Immediately hazardous", window: { days: 21, text: "21 days" } }),
    repairBy: "2026-11-05T12:42:00.000Z",
  }),
  "A paint (90 days)": issue({
    issue: "peeling_paint",
    outcome: classified({ issue: "peeling_paint", hazardClass: "A", classLabel: "Non-hazardous", window: { days: 90, text: "90 days" } }),
    repairBy: "2027-01-13T12:42:00.000Z",
  }),
  "no class": issue({
    issue: "not_covered",
    note: "Something odd",
    outcome: { status: "not_applicable", ruleId: "not-covered", issue: "not_covered", reason: "" },
    repairBy: null,
  }),
};

const facts = (key: keyof typeof CASES, lang: Lang = "en") => buildFacts(caseFile, CASES[key], lang, NOW);
const base = facts("B leak (30 days)");

describe("buildFacts", () => {
  it("Class B: every fact comes from the log and the rules table", () => {
    expect(base).toEqual({
      problem: "leak / water damage",
      hazardClass: "B",
      classLabel: "hazardous",
      window: { days: 30, text: "30 days" },
      firstDate: "Oct 15, 2026",
      repairBy: "Nov 14, 2026",
      citation: "NYC Admin. Code §27-2005(a), §27-2026",
      unit: "4B",
      address: "618 West 136th Street, Manhattan, NY 10031",
      days: 11,
      followUps: 0,
      photos: 1,
      fixed: false,
    });
  });

  it("Class C 24-hour, Class C 'no time', Class A: class, label and window text", () => {
    expect(facts("C leak (24 hours)")).toMatchObject({ hazardClass: "C", classLabel: "immediately hazardous", window: { hours: 24, text: "24 hours" } });
    expect(facts("C heat (no time)")).toMatchObject({ problem: "no heat / hot water", window: { text: "No time — immediately" } });
    expect(facts("A paint (90 days)")).toMatchObject({ problem: "peeling paint", hazardClass: "A", classLabel: "non-hazardous", window: { days: 90, text: "90 days" } });
  });

  it("an issue with no class has no class, window, citation or repair-by date", () => {
    expect(facts("no class")).toMatchObject({ problem: "other condition", hazardClass: null, classLabel: null, window: null, repairBy: null, citation: null });
  });

  it("counts follow-ups and photos (first photo plus follow-up photos) and notes a fix", () => {
    const f = buildFacts(
      caseFile,
      issue({
        followUps: [
          { id: "1", at: "2026-10-18T12:00:00.000Z", note: "still broken" },
          { id: "2", at: "2026-10-20T12:00:00.000Z", note: "worse", photo: "data:image/jpeg;base64,AA" },
        ],
        fixedAt: "2026-10-24T12:00:00.000Z",
      }),
      "en",
      NOW,
    );
    expect(f).toMatchObject({ followUps: 2, photos: 2, fixed: true });
  });

  it("Spanish: label, class word, window, citation and dates are in Spanish", () => {
    expect(facts("B leak (30 days)", "es")).toMatchObject({
      problem: "filtración / daño por agua",
      classLabel: "peligrosa",
      window: { days: 30, text: "30 días" },
      firstDate: "15 de octubre de 2026",
      repairBy: "14 de noviembre de 2026",
      citation: "Código Administrativo de NYC §27-2005(a), §27-2026",
    });
    expect(facts("C heat (no time)", "es").window).toEqual({ hours: 24, text: "sin plazo — de inmediato" });
  });
});

describe("urgency", () => {
  const w = (o: object) => ({ text: "x", ...o });
  it("Class C with a 24-hour or 'no time' window is same-day", () => {
    expect(urgency("C", w({ hours: 24 })).level).toBe("today");
    expect(urgency("C", null).level).toBe("today");
    expect(urgency("C", w({ hours: 24 })).guidance).toMatch(/today/i);
  });
  it("Class B, and a Class C that HPD gives days for, is soon", () => {
    expect(urgency("B", w({ days: 30 })).level).toBe("soon");
    expect(urgency("C", w({ days: 21 })).level).toBe("soon");
    expect(urgency("C", w({ days: 14 })).level).toBe("soon");
  });
  it("Class A, or no class, is calm", () => {
    expect(urgency("A", w({ days: 90 })).level).toBe("calm");
    expect(urgency(null, null)).toMatchObject({ level: "calm", guidance: expect.stringMatching(/calm/i) });
  });
});

describe("placeholders", () => {
  it("fill from the facts, with the class and its label", () => {
    expect(placeholderValues(base, "en")).toEqual({
      PROBLEM: "leak / water damage",
      CLASS: "Class B (hazardous)",
      WINDOW: "30 days",
      FIRST_DATE: "Oct 15, 2026",
      REPAIR_BY: "Nov 14, 2026",
      CITATION: "NYC Admin. Code §27-2005(a), §27-2026",
      UNIT: "4B",
      ADDRESS: "618 West 136th Street, Manhattan, NY 10031",
      DAYS: "11",
    });
    expect(placeholderValues(facts("B leak (30 days)", "es"), "es").CLASS).toBe("Clase B (peligrosa)");
    expect(PLACEHOLDERS).toHaveLength(9);
  });

  it("have no value when the case has no class", () => {
    const v = placeholderValues(facts("no class"), "en");
    expect([v.CLASS, v.WINDOW, v.REPAIR_BY, v.CITATION]).toEqual([null, null, null, null]);
  });

  it("substitute fills every placeholder; segments mark which parts are facts", () => {
    const v = placeholderValues(base, "en");
    expect(substitute("Apt {{UNIT}}, day {{DAYS}}.", v)).toBe("Apt 4B, day 11.");
    expect(segments("Hi {{UNIT}}, day {{DAYS}}!", v)).toEqual([
      { text: "Hi ", fact: false },
      { text: "4B", fact: true },
      { text: ", day ", fact: false },
      { text: "11", fact: true },
      { text: "!", fact: false },
    ]);
    expect(segments("no facts", v)).toEqual([{ text: "no facts", fact: false }]);
  });
});

/** Validate a one-line text draft. */
const text = (body: string, f: CoachFacts = base) => validateDraft({ body }, f, "en", "text");
const GOOD = "Hi, I'm in {{UNIT}} at {{ADDRESS}}. The {{PROBLEM}} needs a look. Could someone come by {{REPAIR_BY}}? Thank you.";

describe("validateDraft: accepted", () => {
  it("a clean text, email, call script and Spanish text pass", () => {
    expect(text(GOOD)).toEqual({ ok: true });
    expect(validateDraft({ subject: "Repair: {{PROBLEM}}", body: GOOD }, base, "en", "email")).toEqual({ ok: true });
    const lines = ["Hi, this is {{UNIT}}.", "The {{PROBLEM}} is the issue.", "Who can come?", "Thank you."].join("\n");
    expect(validateDraft({ body: lines }, base, "en", "call")).toEqual({ ok: true });
    const es = facts("B leak (30 days)", "es");
    expect(validateDraft({ body: "Hola, soy de {{UNIT}}. ¿Podría venir alguien antes del {{REPAIR_BY}}? Gracias." }, es, "es", "text")).toEqual({ ok: true });
  });

  it("reads the draft's words, not the facts: a street called Court Street, with digits, is fine", () => {
    const f = { ...base, address: "12 Court Street, Brooklyn, NY 11201" };
    expect(text("Hi, I'm at {{ADDRESS}}. Please send someone.", f)).toEqual({ ok: true });
  });

  it("'may' as a verb is fine", () => {
    expect(text("I may ask again if I don't hear back.")).toEqual({ ok: true });
  });
});

describe("validateDraft: placeholders", () => {
  it.each([
    ["an unknown placeholder", "Call me on {{PHONE}}."],
    ["a lowercase placeholder", "The {{problem}} is bad."],
    ["a placeholder with spaces", "The {{ PROBLEM }} is bad."],
    ["a single-brace placeholder", "The {PROBLEM} is bad."],
    ["an unclosed placeholder", "The {{PROBLEM is bad."],
    ["an inherited property name", "The {{constructor}} is bad."],
  ])("rejects %s", (_, body) => {
    expect(text(body)).toMatchObject({ ok: false, code: "placeholder" });
  });

  it("rejects a placeholder this case has no value for", () => {
    expect(text("It is {{CLASS}}.", facts("no class"))).toMatchObject({ ok: false, code: "placeholder", detail: expect.stringContaining("CLASS") });
    expect(text("Fix it by {{REPAIR_BY}}.", facts("no class"))).toMatchObject({ ok: false, code: "placeholder" });
  });
});

describe("validateDraft: no number, date or link of its own", () => {
  it.each([
    ["a stray digit", "Please fix it by 5pm."],
    ["a date", "I first noticed it on October 3, so it is overdue."],
    ["a fullwidth digit", "Please come at ５."],
    ["an Arabic-Indic digit", "Please come at ٣."],
    ["a section number", "Section 27-2005 says so."],
  ])("rejects %s", (_, body) => {
    expect(text(body)).toMatchObject({ ok: false });
  });

  it("a digit is code 'digits'", () => {
    expect(text("Please fix it by 5pm.")).toEqual({ ok: false, code: "digits" });
  });

  it.each([
    "Please come within three days.",
    "Please come by Friday.",
    "It started in September.",
    "Venga dentro de tres días.",
    "Por favor venga el lunes.",
    "Empezó en octubre.",
    "Please fix it within twenty-four hours.",
  ])("rejects an invented time in words: %s", (body) => {
    expect(text(body)).toEqual({ ok: false, code: "time-words" });
  });

  it.each(["See www.example.org for details.", "Write to me at tenant@example.org.", "Visit https://example.org."])("rejects a link or address: %s", (body) => {
    expect(text(body)).toMatchObject({ ok: false, code: "links" });
  });
});

describe("validateDraft: forbidden content", () => {
  it("every rule catches its own example, and the example fails validation by that rule", () => {
    for (const r of FORBIDDEN) {
      expect(text(r.example), r.name).toEqual({ ok: false, code: "forbidden", detail: r.name });
    }
  });

  it.each([
    ["Voy a retener el alquiler hasta que lo arreglen.", "withholding rent"],
    ["No voy a pagar la renta este mes.", "not paying rent"],
    ["Vamos a hacer una huelga de alquiler.", "rent strike"],
    ["Voy a deducir la reparación del pago.", "deducting or escrow"],
    ["Arréglelo o si no habrá consecuencias.", "threat"],
    ["Voy a llamar a mi abogado.", "lawsuit"],
    ["Esto es ilegal.", "legal advice"],
    ["Usted es un sinvergüenza.", "insult"],
  ])("Spanish: %s", (body, name) => {
    const f = facts("B leak (30 days)", "es");
    expect(validateDraft({ body }, f, "es", "text")).toEqual({ ok: false, code: "forbidden", detail: name });
  });

  it.each([
    "I'm going to stop paying rent.",
    "I will keep back the rent until then.",
    "We refuse to pay our rent.",
    "Please fix this or you'll regret it.",
    "I'm contacting a lawyer.",
    "I will see you in court.",
    "You are legally required to repair this.",
    "This is a breach of the warranty of habitability.",
    "You are useless.",
    "I will report you to the city.",
  ])("also catches: %s", (body) => {
    expect(text(body)).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("reads curly apostrophes and accents the same", () => {
    expect(text("I won’t pay the rent.")).toMatchObject({ ok: false, code: "forbidden" });
    expect(validateDraft({ body: "Voy a retener el alquiler." }, base, "es", "text")).toMatchObject({ ok: false });
  });

  it("describeCheck says why, and names the rule only for banned wording", () => {
    expect(describeCheck({ ok: false, code: "digits" })).toMatch(/number or date/);
    expect(describeCheck({ ok: false, code: "forbidden", detail: "rent strike" })).toMatch(/rent strike/);
  });
});

describe("validateDraft: fits the channel", () => {
  const filler = (n: number) => "x".repeat(n);

  it("text: at most 480 characters after the facts are filled in", () => {
    expect(text(filler(480))).toEqual({ ok: true });
    expect(text(filler(481))).toEqual({ ok: false, code: "length", detail: "text" });
    // 12 characters raw, but {{ADDRESS}} becomes 42 more
    expect(text(`${filler(450)} {{ADDRESS}}`)).toEqual({ ok: false, code: "length", detail: "text" });
  });

  it("email: subject at most 90 (one line), body at most 1,500", () => {
    const email = (d: Draft) => validateDraft(d, base, "en", "email");
    expect(email({ subject: filler(90), body: "Hello." })).toEqual({ ok: true });
    expect(email({ subject: filler(91), body: "Hello." })).toEqual({ ok: false, code: "length", detail: "subject" });
    expect(email({ subject: "Two\nlines", body: "Hello." })).toEqual({ ok: false, code: "length", detail: "subject" });
    expect(email({ subject: "Hi", body: filler(1500) })).toEqual({ ok: true });
    expect(email({ subject: "Hi", body: filler(1501) })).toEqual({ ok: false, code: "length", detail: "body" });
    expect(email({ body: "Hello." })).toEqual({ ok: false, code: "empty" });
  });

  it("call script: 4 to 8 lines", () => {
    const call = (n: number) => validateDraft({ body: Array.from({ length: n }, () => "A short line.").join("\n") }, base, "en", "call");
    expect(call(3)).toEqual({ ok: false, code: "lines", detail: "3" });
    expect(call(4)).toEqual({ ok: true });
    expect(call(8)).toEqual({ ok: true });
    expect(call(9)).toEqual({ ok: false, code: "lines", detail: "9" });
    expect(callLines("a\n\n  b  \nc")).toEqual(["a", "b", "c"]);
    expect(LIMITS).toMatchObject({ text: 480, subject: 90, email: 1500, callLines: [4, 8] });
  });

  it("an empty draft is refused", () => {
    expect(text("  ")).toEqual({ ok: false, code: "empty" });
  });
});

describe("render", () => {
  const v = placeholderValues(base, "en");
  it("text: facts filled in; email: subject too, copy has a Subject line; call: bullets", () => {
    expect(render({ body: "Day {{DAYS}}." }, "text", v)).toEqual({ subject: undefined, body: "Day 11.", copy: "Day 11." });
    const mail = render({ subject: "Apt {{UNIT}}", body: "Hello" }, "email", v);
    expect(mail).toEqual({ subject: "Apt 4B", body: "Hello", copy: "Subject: Apt 4B\n\nHello" });
    expect(render({ body: "One.\nTwo {{UNIT}}." }, "call", v).body).toBe("• One.\n• Two 4B.");
  });
});

describe("templateDraft", () => {
  const CHANNELS: Channel[] = ["text", "email", "call"];
  const TONES: Tone[] = ["polite", "firm"];
  const LANGS: Lang[] = ["en", "es"];

  it("every channel, case, tone and language passes the same validator and fits its limits", () => {
    for (const key of Object.keys(CASES)) {
      for (const lang of LANGS) {
        const f = { ...facts(key, lang), followUps: 0 };
        for (const withFollowUps of [false, true]) {
          const fx = { ...f, followUps: withFollowUps ? 2 : 0 };
          for (const channel of CHANNELS) {
            for (const tone of TONES) {
              const d = templateDraft(channel, fx, lang, tone);
              const label = `${key} ${lang} ${channel} ${tone} followUps=${fx.followUps}`;
              expect(validateDraft(d, fx, lang, channel), label).toEqual({ ok: true });
              const out = render(d, channel, placeholderValues(fx, lang));
              expect(out.body, label).not.toContain("{{");
              expect(out.body, label).toContain(fx.address);
            }
          }
        }
      }
    }
  });

  it("still fits with a long address, a long unit and the longest problem name", () => {
    const long = { ...facts("C heat (no time)"), address: "1234 Grand Concourse (near East 170th Street), The Bronx, NY 10457", unit: "Apt 12C rear", problem: "no heat / hot water" };
    for (const lang of LANGS) {
      const f = lang === "en" ? long : { ...long, ...facts("C heat (no time)", "es"), address: long.address, unit: long.unit };
      for (const tone of TONES) {
        const d = templateDraft("text", f, lang, tone);
        expect(render(d, "text", placeholderValues(f, lang)).body.length).toBeLessThanOrEqual(480);
      }
    }
  });

  it("is tailored to the hazard class: same-day for 24 hours, a repair-by date for B, calm for A", () => {
    const t = (key: string, tone: Tone = "polite", lang: Lang = "en") => templateDraft("text", facts(key, lang), lang, tone).body;
    expect(t("C leak (24 hours)")).toMatch(/reply today/);
    expect(t("C leak (24 hours)")).not.toContain("{{REPAIR_BY}}");
    expect(t("C heat (no time)", "firm")).toMatch(/reply today/);
    expect(t("B leak (30 days)")).toContain("{{REPAIR_BY}}");
    expect(t("C mold (21 days)")).toContain("{{REPAIR_BY}}"); // Class C, but HPD gives days
    expect(t("A paint (90 days)")).toMatch(/When you get a chance/);
    expect(t("A paint (90 days)", "firm")).toMatch(/Please arrange the repair by/);
    expect(t("B leak (30 days)", "firm")).not.toBe(t("B leak (30 days)"));
    expect(t("C leak (24 hours)", "polite", "es")).toMatch(/responder hoy/);
  });

  it("an issue with no class says nothing about class, window, citation or a repair-by date", () => {
    for (const channel of CHANNELS) {
      const body = templateDraft(channel, facts("no class"), "en", "polite");
      const all = `${body.subject ?? ""}${body.body}`;
      for (const p of ["CLASS", "WINDOW", "CITATION", "REPAIR_BY"]) expect(all).not.toContain(`{{${p}}}`);
    }
  });

  it("mentions a follow-up only when there is one", () => {
    const body = (n: number) => templateDraft("text", { ...base, followUps: n }, "en", "polite").body;
    expect(body(0)).not.toContain("raised this before");
    expect(body(1)).toContain("raised this before");
  });

  it("email has a subject, call script has 6 to 8 lines, text has no subject", () => {
    expect(templateDraft("email", base, "en", "polite").subject).toBe("Repair request: {{PROBLEM}}, {{UNIT}}");
    expect(templateDraft("email", facts("C leak (24 hours)"), "en", "polite").subject).toMatch(/^Urgent repair/);
    const n = callLines(templateDraft("call", { ...base, followUps: 1 }, "en", "polite").body).length;
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(8);
    expect(templateDraft("text", base, "en", "polite").subject).toBeUndefined();
  });

  it("is deterministic", () => {
    expect(templateDraft("email", base, "en", "firm")).toEqual(templateDraft("email", base, "en", "firm"));
  });
});
