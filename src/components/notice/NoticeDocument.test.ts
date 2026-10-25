import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { Font } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { repairByDate } from "@/lib/countdown";
import { sampleHeatReadings } from "@/lib/demo/heat";
import { noticeText } from "@/lib/notice-text";
import { evaluate } from "@/lib/rules";
import type { CaseFile, Facts, HeatReading, Issue, ProposalIssue } from "@/lib/types";
import { renderNoticeBlob } from "./NoticeDocument";

// The browser fetches the fonts from /fonts/…; in Node, read the same files from public/.
for (const family of Object.values(Font.getRegisteredFonts()))
  for (const source of family.sources) if (source.src.startsWith("/fonts/")) source.src = `public${source.src}`;

const NOW = new Date("2026-10-24T14:00:00Z");
const PHOTO = `data:image/jpeg;base64,${readFileSync("public/samples/leak-ceiling.jpg").toString("base64")}`;

// The demo building's registration: a two-line To block and a copied owner, as on the live notice.
const CASE: CaseFile = {
  version: 1,
  address: { label: "618 West 136th Street, Manhattan, NY 10031", borough: "Manhattan", bbl: "1020020091" },
  unit: "4B",
  yearBuilt: 1905,
  childUnder6: null,
  demo: true,
  createdAt: "2026-10-12T12:00:00Z",
  tenantName: "Sam Rivera",
  landlordName: "EDWIN SHIRAZIAN",
  landlordAddress: "579 5th ave, 2nd fl, New York, NY 10017",
  landlordCc: "COLUMBIA HEIGHTS 136 LLC, 579 5th ave, 2nd fl, New York, NY 10017",
};

function issue(id: string, kind: ProposalIssue, facts: Facts, createdAt: string, over: Partial<Issue> = {}): Issue {
  const outcome = evaluate(kind, facts, { now: NOW, yearBuilt: 1905 });
  if (outcome.status === "needs_facts") throw new Error("fixture needs facts");
  return {
    id,
    createdAt,
    note: "",
    evidence: { sha256: "9f2c3a1b" + "0".repeat(52) + "e41a", capturedAt: createdAt, captureSource: "exif", addedAt: createdAt, receivedAt: createdAt, receipt: "738193f80d3a", photo: PHOTO, width: 1280, height: 960 },
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

// The leak carries a note and two follow-ups: a heavier one-issue notice than the demo journey makes.
const leak = issue("l", "leak", { activeLeak: "yes" }, "2026-10-15T11:42:10Z", {
  note: "Ceiling dripping since Tuesday, first noticed it in the kitchen",
  followUps: [
    { id: "f1", at: "2026-10-18T14:00:00Z", note: "still dripping" },
    { id: "f2", at: "2026-10-20T14:00:00Z", note: "worse, bucket fills daily" },
  ],
});
const mold = issue("m", "mold", { moldArea: "10to29" }, "2026-10-12T23:05:33Z", { note: "Black mold above the tub" });
const pests = issue("p", "pests", { pest: "mice_roaches_rats" }, "2026-10-18T02:14:47Z");
const HEAT = sampleHeatReadings(NOW); // 4 of the 5 sample readings are below the minimum

// --- A small PDF reader: enough of the format to read what react-pdf writes (pdfkit, uncompressed object table). ---

interface ParsedPdf {
  /** Text per page, one entry per text-showing operator (a line or a styled run), decoded through ToUnicode. */
  pages: string[][];
  /** Every ToUnicode destination string, as written (hex, spaces kept). */
  toUnicodeEntries: string[];
}

function parsePdf(bytes: Buffer): ParsedPdf {
  const src = bytes.toString("latin1");
  const objects = new Map<number, string>();
  const streams = new Map<number, string>();
  for (const m of src.matchAll(/(?:^|\n)(\d+) 0 obj\n/g)) {
    const start = m.index + m[0].length;
    const n = Number(m[1]);
    const dict = src.slice(start, src.indexOf("\nendobj", start));
    objects.set(n, dict);
    const length = /\/Length (\d+)/.exec(dict);
    const at = src.indexOf("stream\n", start);
    if (length && at !== -1 && at < start + dict.length) {
      const raw = bytes.subarray(at + 7, at + 7 + Number(length[1]));
      streams.set(n, (/\/FlateDecode/.test(dict) ? inflateSync(raw) : raw).toString("latin1"));
    }
  }
  const hexToText = (hex: string) => {
    const units = hex.replace(/\s/g, "").match(/.{4}/g) ?? [];
    return String.fromCharCode(...units.map((u) => parseInt(u, 16)));
  };
  // Font resource name -> glyph id -> text, from each font's ToUnicode CMap (bfrange with an array, as pdfkit writes).
  const toUnicodeEntries: string[] = [];
  const fonts = new Map<string, Map<number, string>>();
  for (const dict of objects.values()) {
    const fontDict = /\/Font <<([\s\S]*?)>>/.exec(dict)?.[1];
    for (const [, name, ref] of fontDict?.matchAll(/\/(\S+) (\d+) 0 R/g) ?? []) {
      const cmapRef = /\/ToUnicode (\d+) 0 R/.exec(objects.get(Number(ref)) ?? "")?.[1];
      const map = new Map<number, string>();
      for (const [, lo, body] of streams.get(Number(cmapRef))?.matchAll(/<([0-9a-f]+)> <[0-9a-f]+> \[([^\]]*)\]/g) ?? []) {
        [...body.matchAll(/<([^>]*)>/g)].forEach(([, dst], i) => {
          toUnicodeEntries.push(dst);
          map.set(parseInt(lo, 16) + i, hexToText(dst));
        });
      }
      fonts.set(name, map);
    }
  }
  const pages: string[][] = [];
  for (const dict of objects.values()) {
    if (!/\/Type \/Page\n/.test(dict)) continue;
    const content = streams.get(Number(/\/Contents (\d+) 0 R/.exec(dict)?.[1])) ?? "";
    let font = new Map<number, string>();
    const runs: string[] = [];
    for (const [, name, array] of content.matchAll(/\/(\S+) [\d.]+ Tf|\[([^\]]*)\] TJ/g)) {
      if (name) font = fonts.get(name) ?? new Map();
      else {
        const glyphs = [...array.matchAll(/<([0-9a-f]+)>/g)].flatMap(([, hex]) => hex.match(/.{4}/g) ?? []);
        runs.push(glyphs.map((g) => font.get(parseInt(g, 16)) ?? "�").join(""));
      }
    }
    pages.push(runs);
  }
  return { pages, toUnicodeEntries };
}

async function render(issues: Issue[], lang: "en" | "es", heat: HeatReading[] = []): Promise<ParsedPdf> {
  const text = noticeText(CASE, issues, lang, NOW, "https://habitable.example", heat);
  return parsePdf(Buffer.from(await (await renderNoticeBlob(text)).arrayBuffer()));
}

describe("notice PDF", () => {
  const pdfs: Record<string, ParsedPdf> = {};

  // One after another in one process, English first: the order in which a second PDF used to copy out garbled.
  beforeAll(async () => {
    for (const lang of ["en", "es"] as const) {
      pdfs[`${lang}-one`] = await render([leak], lang);
      pdfs[`${lang}-heat`] = await render([leak], lang, HEAT);
      pdfs[`${lang}-three`] = await render([leak, mold, pests], lang);
    }
  }, 60_000);

  it.each(["en-one", "es-one", "en-heat", "es-heat"])("fits a one-issue notice on one page (%s)", (key) => {
    expect(pdfs[key].pages).toHaveLength(1);
  });

  it.each(["en-three", "es-three"])("never leaves the closing and signature alone on a page (%s)", (key) => {
    const pages = pdfs[key].pages;
    expect(pages.length).toBeGreaterThan(1);
    const last = pages.at(-1)!.join("\n");
    expect(last).toContain("Sam Rivera");
    expect(last).toMatch(/Photo taken|Foto tomada/); // an issue shares the page with the closing
  });

  it("copies out the same text it shows, ligatures and monospace included (en)", () => {
    const text = pdfs["en-heat"].pages.flat().join("\n");
    for (const s of ["579 5th ave, 2nd fl, New York", "the day I first documented it.", "first noticed it in the kitchen", "Photo taken Oct 15, 2026, 7:42 AM", "fingerprint 9f2c3a1b…e41a · receipt 738193f80d3a", "Page 1 of 1"])
      expect(text).toContain(s);
  });

  it("copies out the same text it shows, ligatures and monospace included (es)", () => {
    const text = pdfs["es-heat"].pages.flat().join("\n");
    for (const s of ["579 5th ave, 2nd fl, New York", "el día en que la documenté", "first noticed it in the kitchen", "Foto tomada el 15 de octubre de 2026 a las 7:42 a.m.", "huella digital 9f2c3a1b…e41a · recibo 738193f80d3a", "Fecha: 24 de octubre de 2026", "Página 1 de 1"])
      expect(text).toContain(s);
  });

  // `<>` (an empty entry) and `<0066 006c>` (a ligature) are valid PDF, but some readers shift or cut text on them.
  it("maps every glyph to exactly one character in the ToUnicode tables", () => {
    for (const [key, pdf] of Object.entries(pdfs)) {
      expect(pdf.toUnicodeEntries.length, key).toBeGreaterThan(0);
      expect(pdf.toUnicodeEntries.filter((dst) => !/^[0-9a-f]{4}$/.test(dst)), key).toEqual([]);
    }
  });
});
