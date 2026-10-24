// The repair notice as plain structured text, in English or Spanish. Pure: no DOM, no React.
// Both the on-screen preview and the PDF render exactly this, so what you see is what gets sent.
import { NY_TZ, daysSince, formatNY } from "./countdown";
import { shortHash } from "./evidence";
import { RULES, issueLabel } from "./rules";
import type { CaseFile, HazardClass, Issue, ProposalIssue } from "./types";

export type NoticeLang = "en" | "es";

export interface NoticeItem {
  /** 1-based position in the notice. */
  n: number;
  issueId: string;
  label: string;
  /** Formatted date the issue was first documented. */
  firstDocumented: string;
  /** "Day N" counter on the New York calendar. */
  dayN: number;
  hazardClass: HazardClass | null;
  /** "Class B" / "Clase B" (stamp text); null when unclassified. */
  classBadge: string | null;
  /** "Hazardous" / "Peligrosa"; null when unclassified. */
  classWord: string | null;
  /** "Class under HPD's published rules: B — Hazardous"; null when unclassified. */
  classLine: string | null;
  /** "HPD correction window: 30 days"; null when unclassified. */
  windowLine: string | null;
  citation: string | null;
  /** Formatted requested repair-by date; null when unclassified. */
  repairBy: string | null;
  /** The renter's own words, trimmed ("" when none). */
  note: string;
  followUpCount: number;
  latestFollowUp: { date: string; note: string } | null;
  /** Ready-to-print follow-up sentence; null when there are none. */
  followUpLine: string | null;
  /** "Photo taken Oct 15, 2026, 7:42 AM · fingerprint 9f2c…e41a · receipt 738193f80d3a" */
  evidenceLine: string;
  /** Link that checks this photo's server receipt; null when the photo has no receipt. */
  verifyUrl: string | null;
  /** Metadata-free JPEG data URL, with its pixel size. */
  photo: string;
  photoWidth: number;
  photoHeight: number;
}

/** Fixed UI strings the preview and the PDF share. */
export interface NoticeLabels {
  to: string;
  from: string;
  re: string;
  firstDocumented: string;
  day: string;
  repairBy: string;
  signoff: string;
  page: string;
  of: string;
  verifyReceipt: string;
}

export interface NoticeText {
  lang: NoticeLang;
  title: string;
  dateLine: string;
  to: string;
  from: string;
  re: string;
  intro: string;
  items: NoticeItem[];
  closing: string;
  signature: string;
  /** Disclaimer, then the receipt-verification line. */
  footer: string[];
  /** Fixed issues left out of the notice. */
  fixedCount: number;
  labels: NoticeLabels;
}

const STRINGS = {
  en: {
    title: "Notice of Conditions Requiring Repair",
    date: "Date",
    toDefault: "Owner / Managing Agent",
    fromDefault: "Tenant",
    apt: "Apt",
    intro:
      "I am the tenant of the apartment named above. The conditions below need repair. Each one is documented with a dated photo. The repair-by date is the end of the correction period HPD publishes for that kind of condition, counted from the day I first documented it.",
    closing:
      "Please contact me to arrange access to my apartment so the repairs can be made. I am keeping a dated record of these conditions. If they are not corrected, I may ask NYC 311 to request an HPD inspection.",
    disclaimer: (date: string) =>
      `Prepared with Habitable on ${date}. Classes and windows are those HPD publishes for these conditions; HPD's inspector assigns the actual class, and correction periods run from service of an HPD violation. Not legal advice.`,
    verify: (origin: string) => `Each photo's server receipt can be checked with the link beside it, at ${origin}/verify.`,
    classLine: (cls: HazardClass, word: string) => `Class under HPD's published rules: ${cls} — ${word}`,
    classBadge: (cls: HazardClass) => `Class ${cls}`,
    windowLine: (w: string) => `HPD correction window: ${w}`,
    photoTaken: "Photo taken",
    photoAdded: "Photo added",
    fingerprint: "fingerprint",
    receipt: "receipt",
    followUp: (n: number, date: string, note: string) =>
      `Followed up ${n} ${n === 1 ? "time" : "times"}; most recent ${date}${note ? ` — ${note}` : ""}.`,
    labels: {
      to: "To",
      from: "From",
      re: "Re",
      firstDocumented: "First documented",
      day: "Day",
      repairBy: "Please repair by",
      signoff: "Sincerely,",
      page: "Page",
      of: "of",
      verifyReceipt: "Check this photo's receipt",
    },
  },
  es: {
    title: "Aviso de condiciones que requieren reparación",
    date: "Fecha",
    toDefault: "Propietario / Agente administrador",
    fromDefault: "Inquilino/a",
    apt: "Apto.",
    intro:
      "Soy inquilino/a del apartamento indicado arriba. Las condiciones que se enumeran a continuación necesitan reparación. Cada una está documentada con una foto con fecha. La fecha de reparación solicitada es el final del plazo de corrección que HPD publica para ese tipo de condición, contado desde el día en que la documenté por primera vez.",
    closing:
      "Por favor, comuníquese conmigo para coordinar el acceso a mi apartamento y que se realicen las reparaciones. Llevo un registro con fechas de estas condiciones. Si no se corrigen, es posible que me comunique con el 311 de Nueva York para solicitar una inspección de HPD.",
    disclaimer: (date: string) =>
      `Preparado con Habitable el ${date}. Las clases y los plazos son los que HPD publica para estas condiciones; el inspector de HPD asigna la clase real, y los plazos de corrección cuentan a partir de la notificación de una infracción por parte de HPD. No es asesoría legal.`,
    verify: (origin: string) => `El recibo del servidor de cada foto se puede comprobar con el enlace junto a ella, en ${origin}/verify.`,
    classLine: (cls: HazardClass, word: string) => `Clase según las reglas que publica HPD: ${cls} — ${word}`,
    classBadge: (cls: HazardClass) => `Clase ${cls}`,
    windowLine: (w: string) => `Plazo de corrección de HPD: ${w}`,
    photoTaken: "Foto tomada el",
    photoAdded: "Foto agregada el",
    fingerprint: "huella digital",
    receipt: "recibo",
    followUp: (n: number, date: string, note: string) =>
      `Di seguimiento ${n} ${n === 1 ? "vez" : "veces"}; el más reciente fue el ${date}${note ? ` — ${note}` : ""}.`,
    labels: {
      to: "Para",
      from: "De",
      re: "Asunto",
      firstDocumented: "Documentado por primera vez",
      day: "Día",
      repairBy: "Se solicita la reparación a más tardar el",
      signoff: "Atentamente,",
      page: "Página",
      of: "de",
      verifyReceipt: "Comprobar el recibo de esta foto",
    },
  },
} as const;

const ISSUE_LABELS_ES: Record<ProposalIssue, string> = {
  leak: "Filtración / daño por agua",
  mold: "Moho",
  heat_hot_water: "Sin calefacción / agua caliente",
  pests: "Plagas",
  lock_door: "Cerradura o puerta rota",
  peeling_paint: "Pintura descascarada",
  not_covered: "Otra condición",
};

const CLASS_WORDS_ES: Record<HazardClass, string> = {
  A: "No peligrosa",
  B: "Peligrosa",
  C: "Inmediatamente peligrosa",
};

const CLASS_RANK: Record<HazardClass, number> = { C: 0, B: 1, A: 2 };

const esDate = new Intl.DateTimeFormat("es-US", { timeZone: NY_TZ, year: "numeric", month: "long", day: "numeric" });
const esDateTime = new Intl.DateTimeFormat("es-US", {
  timeZone: NY_TZ,
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Oct 15, 2026" / "15 de octubre de 2026" — always New York time. */
function dateOf(iso: string, lang: NoticeLang): string {
  if (lang === "en") return formatNY(iso, "date");
  return esDate.format(new Date(iso)).replace(/[\u202f\u00a0]/g, " ");
}

/** "Oct 15, 2026, 7:42 AM" / "15 de octubre de 2026 a las 7:42 a.m." */
function dateTimeOf(iso: string, lang: NoticeLang): string {
  if (lang === "en") return formatNY(iso, "datetime");
  return esDateTime.format(new Date(iso)).replace(/[\u202f\u00a0]/g, " ");
}

function labelOf(issue: ProposalIssue, lang: NoticeLang): string {
  if (lang === "es") return ISSUE_LABELS_ES[issue];
  return issue === "not_covered" ? "Other condition" : issueLabel(issue);
}

/** The Spanish reading of an HPD window ("30 days", "24 hours", "No time — immediately"). */
function windowOf(text: string, lang: NoticeLang): string {
  if (lang === "en") return text;
  const m = /^(\d+) (days?|hours?)$/.exec(text);
  if (m) {
    const n = Number(m[1]);
    return m[2].startsWith("day") ? `${n} ${n === 1 ? "día" : "días"}` : `${n} ${n === 1 ? "hora" : "horas"}`;
  }
  if (/^No time/.test(text)) return "sin plazo — de inmediato";
  return text;
}

/** The Spanish reading of a citation: only the fixed English wrapper words change. */
function citationOf(citation: string, lang: NoticeLang): string {
  if (lang === "en") return citation;
  return citation
    .replace("NYC Admin. Code", "Código Administrativo de NYC")
    .replace("NYC Housing Maintenance Code", "Código de Mantenimiento de Viviendas de NYC")
    .replace(/Local Law (\d+) of (\d{4})/g, "Ley Local $1 de $2")
    .replace("bedbugs also", "chinches, también");
}

function evidenceLineOf(issue: Issue, lang: NoticeLang): string {
  const s = STRINGS[lang];
  const e = issue.evidence;
  const when = e.capturedAt
    ? `${s.photoTaken} ${dateTimeOf(e.capturedAt, lang)}`
    : `${s.photoAdded} ${dateTimeOf(e.addedAt, lang)}`;
  const parts = [when, `${s.fingerprint} ${shortHash(e.sha256)}`];
  if (e.receipt) parts.push(`${s.receipt} ${e.receipt}`);
  return parts.join(" · ");
}

function verifyUrlOf(issue: Issue, origin: string): string | null {
  const e = issue.evidence;
  if (!e.receipt || !e.receivedAt) return null;
  const q = new URLSearchParams({ sha256: e.sha256, receivedAt: e.receivedAt, receipt: e.receipt });
  return `${origin}/verify?${q}`;
}

function itemOf(issue: Issue, n: number, lang: NoticeLang, now: Date, origin: string): NoticeItem {
  const s = STRINGS[lang];
  const o = issue.outcome;
  const classified = o.status === "classified" ? o : null;
  const followUps = [...issue.followUps].sort((a, b) => a.at.localeCompare(b.at));
  const last = followUps.at(-1);
  const latestFollowUp = last ? { date: dateOf(last.at, lang), note: last.note.trim() } : null;
  const word = classified ? (lang === "es" ? CLASS_WORDS_ES[classified.hazardClass] : classified.classLabel) : null;
  return {
    n,
    issueId: issue.id,
    label: labelOf(issue.issue, lang),
    firstDocumented: dateOf(issue.createdAt, lang),
    dayN: daysSince(issue.createdAt, now),
    hazardClass: classified?.hazardClass ?? null,
    classBadge: classified ? s.classBadge(classified.hazardClass) : null,
    classWord: word,
    classLine: classified && word ? s.classLine(classified.hazardClass, word) : null,
    windowLine: classified ? s.windowLine(windowOf(classified.window.text, lang)) : null,
    citation: classified ? citationOf(classified.citation, lang) : null,
    repairBy: classified && issue.repairBy ? dateOf(issue.repairBy, lang) : null,
    note: issue.note.trim(),
    followUpCount: followUps.length,
    latestFollowUp,
    followUpLine: latestFollowUp ? s.followUp(followUps.length, latestFollowUp.date, latestFollowUp.note) : null,
    evidenceLine: evidenceLineOf(issue, lang),
    verifyUrl: verifyUrlOf(issue, origin),
    photo: issue.evidence.photo,
    photoWidth: issue.evidence.width,
    photoHeight: issue.evidence.height,
  };
}

/** Open issues that say something: a class from the rules table, or at least the renter's own note. */
function listable(i: Issue): boolean {
  return !i.fixedAt && (i.outcome.status === "classified" || i.note.trim() !== "");
}

/** Classified first (Class C, B, A), then unclassified; ties by first documented, oldest first. */
function byUrgency(a: Issue, b: Issue): number {
  const rank = (i: Issue) => (i.outcome.status === "classified" ? CLASS_RANK[i.outcome.hazardClass] : 3);
  return rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt);
}

export function noticeText(c: CaseFile, issues: Issue[], lang: NoticeLang, now: Date, origin: string): NoticeText {
  const s = STRINGS[lang];
  const today = dateOf(now.toISOString(), lang);
  const tenant = c.tenantName?.trim();
  const base = origin.replace(/\/+$/, "");
  return {
    lang,
    title: s.title,
    dateLine: `${s.date}: ${today}`,
    to: c.landlordName?.trim() || s.toDefault,
    from: tenant || s.fromDefault,
    re: `${c.address.label}, ${s.apt} ${c.unit}`,
    intro: s.intro,
    items: issues
      .filter(listable)
      .sort(byUrgency)
      .map((issue, i) => itemOf(issue, i + 1, lang, now, base)),
    closing: s.closing,
    signature: tenant || s.fromDefault,
    footer: [s.disclaimer(today), s.verify(base)],
    fixedCount: issues.filter((i) => i.fixedAt).length,
    labels: s.labels,
  };
}

const GENERIC_311_URL = "https://portal.311.nyc.gov/";

/** NYC 311's own page for this kind of complaint. */
export function complaintUrl(issue: Issue): string {
  return issue.issue === "not_covered" ? GENERIC_311_URL : RULES[issue.issue].complaintUrl;
}

const MAX_311 = 600;

/** Plain-English text to paste into a 311 complaint, 600 characters at most. */
export function complaint311Text(c: CaseFile, issue: Issue, now: Date): string {
  const head =
    `Condition: ${labelOf(issue.issue, "en")}. ` +
    `Location: ${c.address.label}, Apt ${c.unit}. ` +
    `First documented ${dateOf(issue.createdAt, "en")}; still present as of ${dateOf(now.toISOString(), "en")}. `;
  const build = (note: string) => `${head}${note ? `Tenant's note: "${note}". ` : ""}Dated photos available.`;
  let note = issue.note.trim().replace(/\s+/g, " ");
  let text = build(note);
  // The note is the only unbounded part: trim it until the whole text fits.
  if (text.length > MAX_311) {
    note = `${note.slice(0, Math.max(0, note.length - (text.length - MAX_311) - 1)).trimEnd()}…`;
    text = build(note);
  }
  return text;
}

/** habitable-notice-<street-slug>-<yyyy-mm-dd>.pdf, the date on the New York calendar. */
export function noticeFileName(c: CaseFile, now: Date): string {
  const street = c.address.label.split(",")[0];
  const slug =
    street
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "home";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: NY_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return `habitable-notice-${slug}-${day}.pdf`;
}
