// Finds the law passages that best match a renter's question: BM25 over the verbatim corpus, with light
// stemming and a small table of renter words. Plain code, no model and no dependency. The index is built
// once, when this module loads.
import { PASSAGES, type Passage } from "./corpus";

const STOP = new Set(
  ("a an and are as at be been but by can could did do does doing for from had has have having he her his how i if " +
    "in into is it its me my no nor not of on or our out she so than that the their them then there these they this " +
    "those to too up us was we were what when where which while who why will with would you your am im ive just any " +
    "about also get got been being should").split(" "),
);

/** Irregular plurals, folded before stemming on both sides. */
const IRREGULAR: Record<string, string> = { mice: "mouse", children: "child", feet: "foot" };

/**
 * Renter words -> words the law uses. Query side only. An expansion counts half, or in full when the renter's
 * own word never appears in the corpus ("roach" means "cockroach") or is listed in SAME (the law's word for it).
 */
const SYNONYMS: Record<string, string[]> = {
  roach: ["cockroach"],
  roaches: ["cockroach"],
  mouse: ["rodent"],
  mice: ["rodent"],
  rat: ["rodent"],
  rats: ["rodent"],
  bedbug: ["pest", "insect"],
  bedbugs: ["pest", "insect"],
  bug: ["pest", "insect"],
  bugs: ["pest", "insect"],
  vermin: ["pest"],
  exterminator: ["pest", "pesticide"],
  landlord: ["owner"],
  landlords: ["owner"],
  super: ["owner", "agent"],
  superintendent: ["owner", "agent"],
  management: ["agent"],
  manager: ["agent"],
  radiator: ["heat"],
  radiators: ["heat"],
  boiler: ["heat"],
  heater: ["heat"],
  cold: ["heat", "temperature"],
  freezing: ["heat", "temperature"],
  chilly: ["heat", "temperature"],
  night: ["heat", "temperature"],
  overnight: ["heat", "temperature"],
  thermostat: ["temperature"],
  warm: ["heat", "temperature"],
  long: ["correct", "date", "period"],
  removal: ["remediate"],
  remove: ["remediate"],
  deadline: ["correct", "period", "date"],
  deadlines: ["correct", "period", "date"],
  fix: ["repair", "correct"],
  fixed: ["repair", "correct"],
  broken: ["repair", "defective"],
  mildew: ["mold", "allergen"],
  mould: ["mold", "allergen"],
  mold: ["allergen"],
  pests: ["allergen"],
  apartment: ["dwelling", "unit"],
  apt: ["dwelling", "unit"],
  building: ["dwelling"],
  home: ["dwelling"],
  leak: ["plumbing", "water"],
  leaking: ["plumbing", "water"],
  leaks: ["plumbing", "water"],
  inspector: ["inspection", "inspect"],
  complain: ["complaint"],
  lock: ["key"],
  locks: ["key"],
  harassing: ["harass"],
  harassment: ["harass"],
};

/** Renter words whose expansion is the law's own name for the same thing. */
const SAME = new Set(["landlord", "landlords", "roach", "roaches", "apartment", "apt", "mildew", "mould", "deadline", "deadlines"]);

/** Light suffix stripping, the same on both sides: heating -> heat, cockroaches -> cockroach, required -> requir. */
export function stem(word: string): string {
  let w = IRREGULAR[word] ?? word;
  if (w.length <= 3 || /^\d/.test(w)) return w;
  if (w.endsWith("ies") && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  if (w.endsWith("ment") && w.length > 7) w = w.slice(0, -4);
  if (w.endsWith("e") && w.length > 3) w = w.slice(0, -1);
  return w;
}

/** Lower-case words and numbers; curly apostrophes folded; stop words and single letters dropped. */
export function words(text: string): string[] {
  return (text.toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w));
}

const tokens = (text: string) => words(text).map(stem);

// ---- index (once) ----
const K1 = 1.2;
const B = 0.75;
const docs = PASSAGES.map((p) => {
  const t = tokens(`${p.section} ${p.title} ${p.text}`);
  const tf = new Map<string, number>();
  for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1);
  return { passage: p, tf, len: t.length };
});
const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length;
const df = new Map<string, number>();
for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);
const idf = (w: string) => {
  const n = df.get(w) ?? 0;
  return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
};

const LAW_BOOST = 1.2;
const SECTION_REF = /\b27-\d{4}(?:\.\d+)*\b/g;
/** "§27-2029(a)(1)" -> "27-2029". */
const baseSection = (section: string) => /^§(27-\d{4}(?:\.\d+)*)/.exec(section)?.[1];

export interface Hit {
  passage: Passage;
  score: number;
  /** Query stems found in this passage (for highlighting). */
  terms: string[];
}

/** Top `k` passages for a question, best first. Empty when no word of the question is in the corpus. */
export function retrieve(question: string, k = 6): Hit[] {
  const weights = new Map<string, number>();
  for (const w of words(question)) {
    weights.set(stem(w), 1);
    const weight = df.has(stem(w)) && !SAME.has(w) ? 0.5 : 1;
    for (const s of SYNONYMS[w] ?? []) if ((weights.get(stem(s)) ?? 0) < weight) weights.set(stem(s), weight);
  }
  // A section number in the question ("27-2029", "§27-2017.3") ranks that section's passages first.
  const sections = new Set(question.match(SECTION_REF) ?? []);

  const hits: Hit[] = [];
  for (const d of docs) {
    let score = 0;
    const terms: string[] = [];
    for (const [w, weight] of weights) {
      const f = d.tf.get(w);
      if (!f) continue;
      terms.push(w);
      score += weight * idf(w) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / avgLen)));
    }
    const base = baseSection(d.passage.section);
    // Prefer the law's own words to an agency's summary of them when both match.
    if (base) score *= LAW_BOOST;
    if (base && sections.has(base)) score += 100;
    if (score > 0) hits.push({ passage: d.passage, score, terms });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, k);
}

/** [start, end) spans of the words in `text` whose stem is one of `terms`. */
export function markTerms(text: string, terms: string[]): [number, number][] {
  const set = new Set(terms);
  const spans: [number, number][] = [];
  for (const m of text.matchAll(/[A-Za-z0-9]+/g)) {
    const w = m[0].toLowerCase();
    if (w.length > 1 && !STOP.has(w) && set.has(stem(w))) spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}
