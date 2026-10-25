// Builds src/lib/law/corpus.json from official text fetched on 2026-10-25. Copies text only: no word is typed by hand.
// node build-corpus.mjs <dir with hmc-dob.txt, cert.txt, hpd-*.html> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { htmlToText } from "./html2text.mjs";

const [dir, out] = process.argv.slice(2);
const RETRIEVED = "2026-10-25";
const HMC_URL = "https://www.nyc.gov/assets/buildings/pdf/HousingMaintenanceCode.pdf";
const HMC_SOURCE = "NYC Housing Maintenance Code (Admin. Code Title 27, Ch. 2)";

// ---- Housing Maintenance Code (NYC Buildings PDF compilation, dated Apr 17, 2026) ----
const pages = readFileSync(join(dir, "hmc-dob.txt"), "utf8").split("\f");
const DROP = /^\d*TITLE 27 – CHAPTER 2$|^NEW YORK CITY HOUSING MAINTENANCE CODE$|^\d+$/;
const HEAD = /^§\s*27-\s*(\d+(?:\.\d+)*)\.?\s+(.*)$/;
const BREAK = /^(SUBCHAPTER \d+:|Article \d+:)/;
const lines = [];
pages.forEach((p, i) => {
  for (const raw of p.split("\n")) {
    const text = raw.trim();
    if (text && !DROP.test(text)) lines.push({ text, page: i + 1 });
  }
});
const sections = new Map();
let cur = null;
for (const l of lines) {
  const m = HEAD.exec(l.text);
  if (m) sections.set(`27-${m[1]}`, (cur = { raw: m[2], heading: m[2].replace(/\.$/, ""), page: l.page, lines: [] }));
  else if (BREAK.test(l.text)) cur = null;
  else if (cur) cur.lines.push(l);
}
// 27-2105's heading wraps onto two more lines.
{
  const s = sections.get("27-2105");
  s.heading = [s.heading, s.lines.shift().text, s.lines.shift().text].join(" ").replace(/\.$/, "");
}

/** Lines -> one paragraph. A line ending in "-" is a hyphenated word or number split at the margin. */
const joinLines = (ls) => ls.reduce((acc, l) => (acc === "" ? l.text : acc.endsWith("-") ? acc + l.text : `${acc} ${l.text}`), "");

/** Split lines into labelled blocks; lines before the first label are the "intro" block. */
function blocks(ls, label) {
  const out = [{ label: "intro", lines: [] }];
  for (const l of ls) {
    const m = label.exec(l.text);
    if (m) out.push({ label: m[1], lines: [{ ...l, text: l.text }] });
    else out.at(-1).lines.push(l);
  }
  return out;
}
const SUB_DOT = /^([a-z](?:-\d+)?)\.\s/;
const SUB_PAREN = /^\(([a-z])\)\s/;
const PARA = /^(?:\((\d+)\)|(\d+)\.)\s/;
const PARA_ONE = { exec: (t) => { const m = PARA.exec(t); return m ? [m[0], m[1] ?? m[2]] : null; } };

function hmc(sectionId, sub, para, { from, until } = {}) {
  const s = sections.get(sectionId);
  if (!s) throw new Error(`missing ${sectionId}`);
  let ls = s.lines;
  let label = `§${sectionId}`;
  if (sub) {
    const b = blocks(ls, sectionId === "27-2115" ? SUB_PAREN : SUB_DOT).find((x) => x.label === sub);
    if (!b) throw new Error(`missing ${sectionId}(${sub})`);
    ls = b.lines;
    label += `(${sub})`;
    if (para) {
      // "c. 1. The date..." / "(h) (1) Should...": the paragraph label can share the subdivision's first line.
      const first = ls[0].text.replace(sectionId === "27-2115" ? SUB_PAREN : SUB_DOT, "");
      const rest = [{ ...ls[0], text: first }, ...ls.slice(1)];
      const p = blocks(rest, PARA_ONE).find((x) => x.label === para);
      if (!p || !p.lines.length) throw new Error(`missing ${label}(${para})`);
      ls = p.lines;
      if (para !== "intro") label += `(${para})`;
    }
  }
  let text = joinLines(ls);
  if (from) text = text.slice(text.indexOf(from));
  if (until) text = text.slice(0, text.indexOf(until) + until.length);
  if ((from && text.indexOf(from) !== 0) || (until && !text.endsWith(until))) throw new Error(`bad cut ${label}`);
  const page = ls[0]?.page ?? s.page;
  const id = `hmc-${label.slice(1).replace(/[()]+/g, "-").replace(/-$/, "").replace(/\./g, "_")}`;
  return { id, source: HMC_SOURCE, section: label, title: s.heading, url: `${HMC_URL}#page=${page}`, text, retrieved: RETRIEVED };
}

const passages = [
  hmc("27-2005", "a"),
  hmc("27-2005", "b"),
  hmc("27-2005", "d"),
  hmc("27-2005", "e", "1"),
  hmc("27-2005", "g"),
  hmc("27-2013", "a"),
  hmc("27-2013", "b"),
  hmc("27-2013", "c"),
  hmc("27-2017.1"),
  hmc("27-2017.2", "a"),
  hmc("27-2017.2", "b"),
  hmc("27-2017.3", "a", "intro"),
  hmc("27-2017.3", "a", "1"),
  hmc("27-2017.3", "a", "2"),
  hmc("27-2017.3", "a", "3"),
  hmc("27-2017.3", "a", "4"),
  hmc("27-2017.3", "a", "5"),
  hmc("27-2017.3", "b"),
  hmc("27-2017.3", "c", "1"),
  hmc("27-2017.3", "c", "2"),
  hmc("27-2017.3", "c", "3"),
  hmc("27-2017.4", "a"),
  hmc("27-2017.4", "b"),
  hmc("27-2017.4", "c"),
  hmc("27-2017.4", "d"),
  hmc("27-2017.5", "a"),
  hmc("27-2017.8", "a"),
  hmc("27-2026"),
  hmc("27-2028"),
  hmc("27-2029", "a"),
  hmc("27-2029", "b"),
  hmc("27-2031"),
  hmc("27-2041.1", "a"),
  hmc("27-2041.1", "b"),
  hmc("27-2041.1", "c"),
  hmc("27-2043", "a"),
  hmc("27-2043", "b"),
  hmc("27-2056.3"),
  hmc("27-2056.4", "a"),
  hmc("27-2056.5", "a"),
  hmc("27-2056.6"),
  hmc("27-2098", "a", "3"),
  hmc("27-2105", "a"),
  hmc("27-2105", "b"),
  { ...hmc("27-2115", "c", undefined, { until: "Service of the notice shall be deemed completed five days from the date of mailing." }) },
  {
    ...hmc("27-2115", "c", undefined, {
      from: "The department may postpone",
      until: "following the period set for correction.",
    }),
    id: "hmc-27-2115-c-postpone",
  },
  hmc("27-2115", "h", "1"),
];
// §27-2018 is repealed: keep its heading so a question naming it gets the honest answer.
{
  const s = sections.get("27-2018");
  passages.splice(passages.findIndex((p) => p.section.startsWith("§27-2026")), 0, {
    id: "hmc-27-2018",
    source: HMC_SOURCE,
    section: "§27-2018",
    title: s.heading,
    url: `${HMC_URL}#page=${s.page}`,
    text: `§ 27-2018 ${s.raw}`,
    retrieved: RETRIEVED,
  });
}

// ---- HPD pages: whole lines of the page text, copied as they appear ----
const hpdText = new Map();
/** `start` picks the first line starting with it and the `count - 1` lines after it; an array picks one line per entry. */
function hpd(id, page, title, start, count = 1, { url } = {}) {
  if (!hpdText.has(page)) hpdText.set(page, htmlToText(readFileSync(join(dir, `hpd-${page}.html`), "utf8")).split("\n"));
  const ls = hpdText.get(page);
  const find = (s) => {
    const i = ls.findIndex((l) => l.startsWith(s));
    if (i < 0) throw new Error(`missing ${id}: ${s}`);
    return i;
  };
  const picked = Array.isArray(start) ? start.map((s) => ls[find(s)]) : ls.slice(find(start), find(start) + count);
  return {
    id,
    source: `NYC HPD: ${title}`,
    section: "HPD guidance",
    title,
    url: url ?? `https://www.nyc.gov/site/hpd/services-and-information/${page}.page`,
    text: picked.join("\n"),
    retrieved: RETRIEVED,
  };
}
const HEAT = "Heat and Hot Water Information";
passages.push(
  hpd("hpd-heat-rules", "heat-and-hot-water-information", HEAT, "Building owners are legally required to provide heat", 5),
  hpd("hpd-heat-complaint", "heat-and-hot-water-information", HEAT, "If you are a tenant without heat or hot water", 4),
  hpd("hpd-class-table", "clear-violations", "Clear Violations", "Timeline for Violation Correction", 22),
  hpd("hpd-nov-mailed", "clear-violations", "Clear Violations", "Newly issued violations are generated as Notices of Violation", 1),
  hpd("hpd-report-first", "report-a-maintenance-issue", "Report a Maintenance Issue", ["Before filing a compliant", "After you file a complaint"]),
  hpd("hpd-report-times", "report-a-maintenance-issue", "Report a Maintenance Issue", "If the Inspector writes a violation", 8),
  hpd("hpd-report-certified", "report-a-maintenance-issue", "Report a Maintenance Issue", "If the owner certifies that the condition was corrected", 2),
  hpd("hpd-repair-steps", "tenants-rights-and-responsibilities", "Tenants' Rights and Responsibilities", "My landlord refuses to make repairs", 6),
  hpd("hpd-painting", "tenants-rights-and-responsibilities", "Tenants' Rights and Responsibilities", "Am I entitled to have my apartment painted?", 2),
  hpd("hpd-dhcr", "tenants-rights-and-responsibilities", "Tenants' Rights and Responsibilities", "In addition to filing a complaint with HPD or filing an action in Housing Court", 1),
  hpd("hpd-free-legal", "tenants-rights-and-responsibilities", "Tenants' Rights and Responsibilities", "Free legal advice and counsel is available", 1),
  hpd("hpd-hp-action", "housing-court", "Housing Court", "A tenant can bring a case against a property owner in Housing Court", 2),
  hpd("hpd-ll55-owners", "indoor-allergen-hazards-mold-and-pests", "Indoor Allergen Hazards (Mold, Mice, Roaches and Rats)", [
    "Owners of residential buildings with three or more units are required by Local Law 55",
    "Annually inspect units for indoor allergen hazards",
    "Make sure vacant apartments are thoroughly cleaned",
    "Provide the What Tenants and Landlords Should Know",
  ]),
  hpd("hpd-ll55-tenants", "indoor-allergen-hazards-mold-and-pests", "Indoor Allergen Hazards (Mold, Mice, Roaches and Rats)", "If you observe a leak, signs of mold growth", 1),
  hpd("hpd-self-closing", "self-closing-doors", "Self-Closing Doors", "Apartment doors and hallway doors are required by law", 1),
  hpd("hpd-lead-class-c", "lead-based-paint-violations-correct-certify-corrections", "Lead-Based Paint Violations", "These violations are all Class", 1),
);

// ---- HPD report to the Council (PDF): the class C correction table ----
{
  const ls = readFileSync(join(dir, "cert.txt"), "utf8").split("\n").map((l) => l.trim());
  const i = ls.findIndex((l) => l.startsWith("In all cases, except related to heat"));
  const j = ls.findIndex((l) => l === "24 hours");
  const prose = joinLines(ls.slice(i, ls.indexOf("Correction periods for the various class C violations are listed in the table below.") + 1).map((text) => ({ text })));
  passages.push({
    id: "hpd-class-c-report",
    source: "NYC HPD: Report to City Council on the Certification of Correction Process (CY25)",
    section: "HPD guidance",
    title: "Certification of Correction Process for class C violations",
    url: "https://www.nyc.gov/assets/hpd/downloads/pdfs/services/certification-of-corrections-cy25.pdf#page=2",
    text: [prose, ...ls.slice(ls.indexOf("Correction periods for the various class C violations are listed in the table below.") + 1, j + 1)].join("\n"),
    retrieved: RETRIEVED,
  });
}

const ids = new Set();
for (const p of passages) {
  if (ids.has(p.id)) throw new Error(`duplicate ${p.id}`);
  ids.add(p.id);
}
writeFileSync(out, JSON.stringify(passages, null, 2) + "\n");
console.log(`${passages.length} passages -> ${out}`);
