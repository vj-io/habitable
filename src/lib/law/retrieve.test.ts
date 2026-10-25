import { describe, expect, it } from "vitest";
import { PASSAGE_BY_ID } from "./corpus";
import { markTerms, retrieve, stem, words } from "./retrieve";

/** True when one of the top `n` passages is `want` (an id) or sits under it (a section prefix like "§27-2029"). */
const inTop = (question: string, want: string, n = 3) =>
  retrieve(question, n).some((h) => h.passage.id === want || h.passage.section === want || h.passage.section.startsWith(`${want}(`));

describe("retrieve", () => {
  it.each([
    ["How cold is too cold at night?", "§27-2029"],
    ["How warm does my apartment have to be during the day?", "§27-2029"],
    ["No hot water since yesterday", "§27-2031"],
    ["I saw mice in my apartment", "§27-2017.4"],
    ["How many days does my landlord have to get rid of roaches?", "§27-2017.4"],
    ["Black mildew on the bathroom ceiling, about 12 square feet", "§27-2017.3"],
    ["My super won't fix the leak under the sink", "§27-2026"],
    ["My apartment door lock is broken", "§27-2043"],
    ["The hallway door doesn't close by itself", "§27-2041.1"],
    ["Peeling paint and I have a toddler, is it lead?", "§27-2056.6"],
    ["Who is the managing agent and where do I find them?", "§27-2098"],
    ["Is my landlord harassing me?", "§27-2005"],
    ["Does my landlord have to paint my apartment?", "hpd-painting"],
    ["What's the deadline for a class B violation?", "hpd-class-table"],
    ["How do I take my landlord to court to make repairs?", "hpd-hp-action"],
  ])("%s -> %s in the top 3", (question, want) => {
    expect(inTop(question, want)).toBe(true);
  });

  it("ranks an exact section number first, and only that section", () => {
    const hits = retrieve("What does 27-2029 say?", 2);
    expect(hits.map((h) => h.passage.section)).toEqual(["§27-2029(a)", "§27-2029(b)"]);
    expect(retrieve("§27-2017.3 please", 9).every((h) => h.passage.section.startsWith("§27-2017.3"))).toBe(true);
    // A repealed section still answers honestly.
    expect(retrieve("27-2018", 1)[0].passage.text).toContain("[Repealed]");
  });

  it("maps renter words to the law's words", () => {
    // "roach" -> cockroach, "mildew" -> mold, "landlord"/"super" -> owner/agent, "radiator" -> heat.
    expect(retrieve("roach", 6).some((h) => h.passage.id === "hmc-27-2017_4-b")).toBe(true);
    expect(retrieve("mildew", 1)[0].terms).toContain("mold");
    expect(retrieve("my super", 3).some((h) => h.terms.includes("agent") || h.terms.includes("owner"))).toBe(true);
    expect(inTop("radiator is ice cold", "§27-2029")).toBe(true);
  });

  it("returns nothing for a question the corpus has no words for", () => {
    expect(retrieve("What is the capital of France?")).toEqual([]);
    expect(retrieve("")).toEqual([]);
  });

  it("returns at most k hits, best first", () => {
    const hits = retrieve("mold in my apartment", 6);
    expect(hits).toHaveLength(6);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
  });
});

describe("stem and words", () => {
  it("folds plurals and endings the same way on both sides", () => {
    expect(stem("heating")).toBe(stem("heat"));
    expect(stem("cockroaches")).toBe(stem("cockroach"));
    expect(stem("mice")).toBe(stem("mouse"));
    expect(stem("required")).toBe(stem("require"));
    expect(stem("harassment")).toBe(stem("harass"));
    expect(stem("2029")).toBe("2029");
  });
  it("drops stop words and single letters", () => {
    expect(words("Is it a class B violation?")).toEqual(["class", "violation"]);
  });
});

describe("markTerms", () => {
  it("marks every word whose stem matched, at its exact place", () => {
    const text = PASSAGE_BY_ID.get("hmc-27-2029-a")!.text;
    const spans = markTerms(text, [stem("temperature")]);
    expect(spans.length).toBe(text.match(/temperature/gi)!.length);
    for (const [a, b] of spans) expect(text.slice(a, b).toLowerCase()).toBe("temperature");
  });
});
