// Message coach, the pure half. A model may write the WORDS of a text, email or call script; code owns every FACT.
// A draft refers to facts only through {{PLACEHOLDERS}}. validateDraft refuses digits, dates, unknown
// placeholders, banned content and wrong lengths; whatever it refuses is replaced by templateDraft, which is
// plain code and passes the same checks. No React, no server-only: the route and the UI share this file.
import { NY_TZ, daysSince, formatNY } from "./countdown";
import { issueLabel } from "./rules";
import type { CaseFile, CorrectionWindow, HazardClass, Issue, ProposalIssue } from "./types";

export type Channel = "text" | "email" | "call";
export type Tone = "polite" | "firm";
export type Lang = "en" | "es";

/** What the draft may say about the case. Built on the device from the renter's log; the model never edits it. */
export interface CoachFacts {
  /** Short lowercase noun phrase: "leak / water damage". */
  problem: string;
  hazardClass: HazardClass | null;
  /** "hazardous" (lowercase, in the draft's language); null when there is no class. */
  classLabel: string | null;
  /** HPD's correction window; `text` is already in the draft's language. */
  window: CorrectionWindow | null;
  /** First documented, formatted ("Oct 15, 2026"). */
  firstDate: string;
  /** Requested repair-by date, formatted; null when there is no class. */
  repairBy: string | null;
  citation: string | null;
  unit: string;
  address: string;
  /** "Day N" since first documented (the same counter the issue page shows). */
  days: number;
  followUps: number;
  /** The first photo plus any follow-up photos. */
  photos: number;
  fixed: boolean;
}

// ---- facts -----------------------------------------------------------------------------------------------

// Spanish wording for the few rule-table strings a message quotes. notice-text.ts keeps the same words
// privately (and is not ours to edit); keep the two in step.
const PROBLEM_ES: Record<ProposalIssue, string> = {
  leak: "filtración / daño por agua",
  mold: "moho",
  heat_hot_water: "sin calefacción / agua caliente",
  pests: "plagas",
  lock_door: "cerradura o puerta rota",
  peeling_paint: "pintura descascarada",
  not_covered: "otra condición",
};
const CLASS_WORD_ES: Record<HazardClass, string> = { A: "no peligrosa", B: "peligrosa", C: "inmediatamente peligrosa" };

const esDate = new Intl.DateTimeFormat("es-US", { timeZone: NY_TZ, year: "numeric", month: "long", day: "numeric" });

/** "Oct 15, 2026" / "15 de octubre de 2026", New York calendar. */
function dateOf(iso: string, lang: Lang): string {
  return lang === "en" ? formatNY(iso, "date") : esDate.format(new Date(iso)).replace(/[  ]/g, " ");
}

/** "30 days" -> "30 días"; "No time — immediately" -> "sin plazo — de inmediato". */
function windowText(text: string, lang: Lang): string {
  if (lang === "en") return text;
  const m = /^(\d+) (days?|hours?)$/.exec(text);
  if (m) {
    const n = Number(m[1]);
    return m[2].startsWith("day") ? `${n} ${n === 1 ? "día" : "días"}` : `${n} ${n === 1 ? "hora" : "horas"}`;
  }
  return /^No time/.test(text) ? "sin plazo — de inmediato" : text;
}

function citationText(citation: string, lang: Lang): string {
  if (lang === "en") return citation;
  return citation
    .replace("NYC Admin. Code", "Código Administrativo de NYC")
    .replace("NYC Housing Maintenance Code", "Código de Mantenimiento de Viviendas de NYC")
    .replace("as amended by", "modificado por la")
    .replace(/Local Law (\d+) of (\d{4})/g, "Ley Local $1 de $2")
    .replace("bedbugs also", "chinches, también");
}

export function buildFacts(c: Pick<CaseFile, "address" | "unit">, issue: Issue, lang: Lang, now: Date): CoachFacts {
  const o = issue.outcome;
  const k = o.status === "classified" ? o : null;
  const problem = lang === "es" ? PROBLEM_ES[issue.issue] : issue.issue === "not_covered" ? "other condition" : issueLabel(issue.issue).toLowerCase();
  return {
    problem,
    hazardClass: k?.hazardClass ?? null,
    classLabel: k ? (lang === "es" ? CLASS_WORD_ES[k.hazardClass] : k.classLabel.toLowerCase()) : null,
    window: k ? { ...k.window, text: windowText(k.window.text, lang) } : null,
    firstDate: dateOf(issue.createdAt, lang),
    repairBy: k && issue.repairBy ? dateOf(issue.repairBy, lang) : null,
    citation: k ? citationText(k.citation, lang) : null,
    unit: c.unit,
    address: c.address.label,
    days: daysSince(issue.createdAt, now),
    followUps: issue.followUps.length,
    photos: 1 + issue.followUps.filter((f) => f.photo).length,
    fixed: Boolean(issue.fixedAt),
  };
}

// ---- urgency (tone guidance is code, not the model's call) -------------------------------------------------

export type Urgency = "today" | "soon" | "calm";

const GUIDANCE: Record<Urgency, string> = {
  today: "Urgent. Say plainly that this cannot wait and ask for a reply and a repair visit today.",
  soon: "Pressing but courteous. Ask for a repair visit soon, and for the repair by the requested repair-by date.",
  calm: "Calm and friendly. A simple request for a repair visit; no urgency words.",
};

/**
 * Class C with a 24-hour or "no time" window is same-day (heat, hot water, active leaks...). Class B, and a
 * Class C that HPD gives days for (mold, mice, lead paint, self-closing doors), is "soon". Class A, or no class, is calm.
 */
export function urgency(hazardClass: HazardClass | null, window: CorrectionWindow | null): { level: Urgency; guidance: string } {
  const level: Urgency = hazardClass === "C" ? (window?.days ? "soon" : "today") : hazardClass === "B" ? "soon" : "calm";
  return { level, guidance: GUIDANCE[level] };
}

// ---- placeholders ------------------------------------------------------------------------------------------

export const PLACEHOLDERS = ["PROBLEM", "CLASS", "WINDOW", "FIRST_DATE", "REPAIR_BY", "CITATION", "UNIT", "ADDRESS", "DAYS"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];
/** What each placeholder becomes; null when this case has no such fact (a draft must not use it). */
export type Values = Record<Placeholder, string | null>;

const TOKEN = /\{\{([^{}]*)\}\}/g;

export function placeholderValues(f: CoachFacts, lang: Lang): Values {
  return {
    PROBLEM: f.problem,
    CLASS: f.hazardClass ? `${lang === "es" ? "Clase" : "Class"} ${f.hazardClass}${f.classLabel ? ` (${f.classLabel})` : ""}` : null,
    WINDOW: f.window?.text ?? null,
    FIRST_DATE: f.firstDate,
    REPAIR_BY: f.repairBy,
    CITATION: f.citation,
    UNIT: f.unit,
    ADDRESS: f.address,
    DAYS: String(f.days),
  };
}

const known = (values: Values, name: string): name is Placeholder => Object.hasOwn(values, name);

/** Fills every placeholder. Only call on a draft validateDraft accepted (or a template). */
export function substitute(s: string, values: Values): string {
  return s.replace(TOKEN, (_, name: string) => (known(values, name) ? values[name] : null) ?? "");
}

export type Segment = { text: string; fact: boolean };

/** The draft cut into the model's words and the facts code filled in, so the UI can mark which is which. */
export function segments(s: string, values: Values): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const m of s.matchAll(TOKEN)) {
    if (m.index > at) out.push({ text: s.slice(at, m.index), fact: false });
    out.push({ text: (known(values, m[1]) ? values[m[1]] : null) ?? "", fact: true });
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push({ text: s.slice(at), fact: false });
  return out;
}

// ---- drafts and validation ---------------------------------------------------------------------------------

/** What /api/coach answers: the AI's draft, or the template with the reason the AI's words were not used. */
export type CoachResult =
  | { source: "ai"; draft: Draft; model: string }
  | { source: "template"; draft: Draft; reason: string };

/** One draft, with placeholders. A call script's body is its bullet lines, one per line. */
export interface Draft {
  subject?: string;
  body: string;
}

export const LIMITS = { text: 480, subject: 90, email: 1500, callLines: [4, 8] as const };

export const callLines = (body: string) => body.split("\n").map((l) => l.trim()).filter(Boolean);

/** Lowercase, no accents, straight apostrophes: what the banned-content rules read. */
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[‘’]/g, "'");

interface Rule {
  name: string;
  re: RegExp;
  /** A sentence the rule must catch (the tests check every rule against its example). */
  example: string;
}

// Banned in any draft, English and Spanish, read on the draft's own words (placeholders removed, so a street
// called "Court Street" is fine). Over-blocking is safe: the renter just gets the template.
export const FORBIDDEN: Rule[] = [
  { name: "withholding rent", re: /withhold|retener (?:el |mi |la )?(?:alquiler|renta)|\b(?:hold|holding|keep|keeping) (?:back |off )?(?:on )?(?:my |the |our )?rent\b/, example: "I will withhold the rent until it is fixed." },
  { name: "not paying rent", re: /\b(?:stop|stopped|stopping|refuse|refusing|not|never|won't|cease) (?:to )?pay(?:ing)? (?:my |the |our )?rent\b|(?:no (?:voy a )?pagar|dejar de pagar|dejare de pagar|me negare a pagar) (?:el |mi |la )?(?:alquiler|renta)/, example: "I will not pay the rent this month." },
  { name: "rent strike", re: /\bstrike\b|\bhuelga\b/, example: "The building is going on a rent strike." },
  { name: "deducting or escrow", re: /\bescrow\b|\bdeduc\w*|\babat\w*|fideicomiso/, example: "I will deduct the repair from my rent." },
  { name: "threat", re: /\bthreat\w*|\bor else\b|consequence|regret|be sorry|make you pay|in trouble|report you|no choice but|otherwise i\b|amenaz\w*|\bo si no\b|consecuencia|me arrepent|denunciar\w*/, example: "Fix it or else." },
  { name: "lawsuit", re: /\b(?:lawsuit|sue|sued|suing|litigat\w*|attorney|lawyer|court|legal action|hp action)\b|\bdemand(?:a|as|ar|o)\b|abogad[oa]|tribunal|\bcorte\b|accion legal/, example: "I will sue you if this is not fixed." },
  { name: "legal advice", re: /\b(?:illegal|unlawful|legally|breach\w*|warranty of habitability|violat\w*|entitled)\b|ilegal|ilicit[oa]|legalmente|garantia de habitabilidad|violacion/, example: "This is illegal and you are legally required to fix it." },
  { name: "insult", re: /\b(?:idiot\w*|stupid|incompeten\w*|liars?|slumlord|scam\w*|crooks?|greedy|useless|pathetic|disgusting|lazy|scum\w*|jerk|fools?|shame on you)\b|idiota|estupid[oa]|incompetente|mentiros[oa]|ladron|sinverguenza|inutil|asquerosa?|perezos[oa]/, example: "You are an incompetent, lazy slumlord." },
  { name: "profanity", re: /\b(?:damn|hell|crap|shit\w*|fuck\w*|ass|asshole|bitch\w*|bastard)\b|mierda|carajo|\bputa\b|joder|cabron|pendejo/, example: "This is a damn disgrace." },
];

// Numbers written out, weekdays and months are invented dates and deadlines wearing words instead of digits.
// "may" is left out on purpose: it is also a verb ("I may ask").
const TIME_WORDS =
  /\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|dozen|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|noventa|cien|ciento)[ -](?:hours?|days?|weeks?|months?|years?|horas?|dias?|semanas?|meses|mes|anos?)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december|lunes|martes|miercoles|jueves|viernes|sabado|domingo|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/;

export type CheckCode = "empty" | "placeholder" | "forbidden" | "digits" | "time-words" | "links" | "length" | "lines";
export type Check = { ok: true } | { ok: false; code: CheckCode; detail?: string };

const fail = (code: CheckCode, detail?: string): Check => ({ ok: false, code, detail });

/**
 * The gate every draft passes before anyone sees it. Rules run on the draft as written (placeholders
 * removed), lengths on what it becomes once code has filled the facts in.
 */
export function validateDraft(draft: Draft, facts: CoachFacts, lang: Lang, channel: Channel): Check {
  const values = placeholderValues(facts, lang);
  const subject = channel === "email" ? (draft.subject ?? "").trim() : "";
  const body = draft.body.trim();
  if (!body || (channel === "email" && !subject)) return fail("empty");

  const written = `${subject}\n${body}`;
  for (const m of written.matchAll(TOKEN)) {
    if (!known(values, m[1])) return fail("placeholder", `unknown {{${m[1].slice(0, 24)}}}`);
    if (values[m[1]] === null) return fail("placeholder", `{{${m[1]}}} has no value in this case`);
  }
  const words = written.replace(TOKEN, " ");
  if (/[{}]/.test(words)) return fail("placeholder", "stray brace");

  const said = plain(words);
  for (const r of FORBIDDEN) if (r.re.test(said)) return fail("forbidden", r.name);
  if (/\p{Nd}/u.test(words)) return fail("digits");
  if (TIME_WORDS.test(said)) return fail("time-words");
  if (/https?:|www\.|@|\.com\b/.test(said)) return fail("links");

  if (channel === "text" && substitute(body, values).length > LIMITS.text) return fail("length", "text");
  if (channel === "email") {
    if (/\n/.test(subject) || substitute(subject, values).length > LIMITS.subject) return fail("length", "subject");
    if (substitute(body, values).length > LIMITS.email) return fail("length", "body");
  }
  if (channel === "call") {
    const n = callLines(body).length;
    if (n < LIMITS.callLines[0] || n > LIMITS.callLines[1]) return fail("lines", String(n));
  }
  return { ok: true };
}

/** Why a draft was refused, for the one line that tells the renter they got the template. */
export function describeCheck(c: Extract<Check, { ok: false }>): string {
  const why: Record<CheckCode, string> = {
    empty: "it was empty",
    placeholder: "it used a fact placeholder wrongly",
    forbidden: "it used wording we don't allow",
    digits: "it wrote a number or date itself",
    "time-words": "it wrote a date or time itself",
    links: "it added a link or address",
    length: "it was too long for a message like this",
    lines: "a call script needs a few short lines",
  };
  return why[c.code] + (c.code === "forbidden" && c.detail ? ` (${c.detail})` : "");
}

// ---- rendering ---------------------------------------------------------------------------------------------

/** The draft with every fact filled in: what the renter reads, copies and sends. */
export function render(draft: Draft, channel: Channel, values: Values): { subject?: string; body: string; copy: string } {
  const subject = channel === "email" ? substitute((draft.subject ?? "").trim(), values) : undefined;
  const text = substitute(draft.body.trim(), values);
  const body = channel === "call" ? callLines(text).map((l) => `• ${l}`).join("\n") : text;
  return { subject, body, copy: subject ? `Subject: ${subject}\n\n${body}` : body };
}

// ---- templates: deterministic, every channel, class level, tone and language ---------------------------------

const COPY = {
  en: {
    textHi: "Hi, this is the tenant in {{UNIT}} at {{ADDRESS}}.",
    issue: "The problem: {{PROBLEM}}, first documented {{FIRST_DATE}} (day {{DAYS}}).",
    rule: "HPD's published rules put it in {{CLASS}}; correction window: {{WINDOW}}.",
    before: "I've raised this before.",
    thanks: "Thank you.",
    ask: {
      today: {
        polite: "It can't wait, so could you or the super reply today and tell me when someone can come?",
        firm: "This can't wait. I need a reply today with a time someone will come.",
      },
      soon: {
        polite: "Could someone come and fix it by {{REPAIR_BY}}?",
        firm: "I'm asking for it to be fixed by {{REPAIR_BY}}. Please confirm the day someone will come.",
      },
      calm: {
        polite: "When you get a chance, could someone take a look? Fixing it by {{REPAIR_BY}} would be great.",
        firm: "Please arrange the repair by {{REPAIR_BY}} and tell me the day someone will come.",
      },
      plain: {
        polite: "Could someone take a look and let me know when they can come?",
        firm: "Please arrange a repair and tell me the day someone will come.",
      },
    },
    email: {
      subject: { today: "Urgent repair: {{PROBLEM}}, {{UNIT}}", other: "Repair request: {{PROBLEM}}, {{UNIT}}" },
      hello: "Hello,",
      intro: "I'm the tenant in apartment {{UNIT}} at {{ADDRESS}}. I'm writing about a problem that needs repair: {{PROBLEM}}.",
      documented: "I first documented it on {{FIRST_DATE}} with dated photos, and today is day {{DAYS}}.",
      before: "I've also raised it with you before.",
      rule: "HPD's published rules put this kind of problem in {{CLASS}}, with a correction window of {{WINDOW}} ({{CITATION}}). These are HPD's rules for the kind of problem, not a ruling on my apartment: HPD's inspector decides the actual class, and its correction periods start when HPD itself serves a notice, not from my message.",
      access: "I can give access to the apartment. Please tell me which days and times work.",
      sign: { polite: "Thank you for your help,", firm: "Thank you," },
      who: "The tenant in {{UNIT}}",
    },
    call: {
      hi: "Hi, this is the tenant in apartment {{UNIT}} at {{ADDRESS}}.",
      about: "I'm calling about a repair: {{PROBLEM}}. I first documented it on {{FIRST_DATE}}, so today is day {{DAYS}}.",
      photos: "I have dated photos and can send them to you.",
      rule: "HPD's published rules put this kind of problem in {{CLASS}}, with a correction window of {{WINDOW}}.",
      when: "Who will come, and on what day and time? Could you confirm by text or email?",
      bye: "Thank you. I'll write down this call and follow up in writing.",
    },
  },
  es: {
    textHi: "Hola, soy inquilino/a de {{UNIT}} en {{ADDRESS}}.",
    issue: "El problema: {{PROBLEM}}, documentado por primera vez el {{FIRST_DATE}} (día {{DAYS}}).",
    rule: "Las reglas que publica HPD lo ubican en {{CLASS}}; plazo de corrección: {{WINDOW}}.",
    before: "Ya lo he mencionado antes.",
    thanks: "Gracias.",
    ask: {
      today: {
        polite: "No puede esperar, así que ¿podría usted o el encargado responder hoy y decirme cuándo puede venir alguien?",
        firm: "No puede esperar. Necesito una respuesta hoy con la hora en que vendrá alguien.",
      },
      soon: {
        polite: "¿Podría venir alguien a repararlo antes del {{REPAIR_BY}}?",
        firm: "Pido que se repare antes del {{REPAIR_BY}}. Por favor, confirme el día en que vendrá alguien.",
      },
      calm: {
        polite: "Cuando pueda, ¿podría alguien venir a verlo? Repararlo antes del {{REPAIR_BY}} sería ideal.",
        firm: "Por favor, programe la reparación antes del {{REPAIR_BY}} y dígame el día en que vendrá alguien.",
      },
      plain: {
        polite: "¿Podría alguien venir a verlo y avisarme cuándo puede venir?",
        firm: "Por favor, programe una reparación y dígame el día en que vendrá alguien.",
      },
    },
    email: {
      subject: { today: "Reparación urgente: {{PROBLEM}}, {{UNIT}}", other: "Solicitud de reparación: {{PROBLEM}}, {{UNIT}}" },
      hello: "Hola,",
      intro: "Soy inquilino/a del apartamento {{UNIT}} en {{ADDRESS}}. Les escribo por un problema que necesita reparación: {{PROBLEM}}.",
      documented: "Lo documenté por primera vez el {{FIRST_DATE}} con fotos con fecha; hoy es el día {{DAYS}}.",
      before: "También se lo he mencionado antes.",
      rule: "Las reglas que publica HPD para este tipo de problema lo ubican en {{CLASS}}, con un plazo de corrección de {{WINDOW}} ({{CITATION}}). Son las reglas de HPD para este tipo de problema, no una decisión sobre mi apartamento: el inspector de HPD decide la clase real, y sus plazos de corrección empiezan cuando HPD mismo emite un aviso, no con mi mensaje.",
      access: "Puedo dar acceso al apartamento. Por favor, dígame qué días y horas le convienen.",
      sign: { polite: "Gracias por su ayuda,", firm: "Gracias," },
      who: "Inquilino/a del apartamento {{UNIT}}",
    },
    call: {
      hi: "Hola, soy inquilino/a del apartamento {{UNIT}} en {{ADDRESS}}.",
      about: "Llamo por una reparación: {{PROBLEM}}. La documenté por primera vez el {{FIRST_DATE}}, así que hoy es el día {{DAYS}}.",
      photos: "Tengo fotos con fecha y puedo enviárselas.",
      rule: "Las reglas que publica HPD ubican este tipo de problema en {{CLASS}}, con un plazo de corrección de {{WINDOW}}.",
      when: "¿Quién vendrá, y qué día y a qué hora? ¿Puede confirmarlo por mensaje o correo?",
      bye: "Gracias. Voy a anotar esta llamada y le daré seguimiento por escrito.",
    },
  },
};

/** The same words every time for the same case: the fallback when the AI is off, busy or refused. */
export function templateDraft(channel: Channel, facts: CoachFacts, lang: Lang, tone: Tone): Draft {
  const c = COPY[lang];
  const { level } = urgency(facts.hazardClass, facts.window);
  const classed = facts.hazardClass !== null;
  const again = facts.followUps > 0;
  // "today" needs no date; otherwise a date exists exactly when the case has a class.
  const ask = c.ask[level === "today" ? "today" : facts.repairBy ? level : "plain"][tone];

  if (channel === "email") {
    const paragraphs = [
      c.email.hello,
      c.email.intro,
      `${c.email.documented}${again ? ` ${c.email.before}` : ""}`,
      ...(classed ? [c.email.rule] : []),
      ask,
      c.email.access,
      `${c.email.sign[tone]}\n${c.email.who}`,
    ];
    return { subject: c.email.subject[level === "today" ? "today" : "other"], body: paragraphs.join("\n\n") };
  }
  if (channel === "call") {
    const lines = [c.call.hi, c.call.about, c.call.photos, ...(classed ? [c.call.rule] : []), ...(again ? [c.before] : []), ask, c.call.when, c.call.bye];
    return { body: lines.join("\n") };
  }
  // Text: shed the optional sentences (class line, then "raised before") until it fits the limit.
  const values = placeholderValues(facts, lang);
  const parts = [c.textHi, c.issue, ...(classed ? [c.rule] : []), ...(again ? [c.before] : []), tone === "polite" ? `${ask} ${c.thanks}` : ask];
  let text = parts.join(" ");
  for (let i = parts.length - 2; i >= 2 && substitute(text, values).length > LIMITS.text; i--) {
    parts.splice(i, 1);
    text = parts.join(" ");
  }
  return { body: text };
}
