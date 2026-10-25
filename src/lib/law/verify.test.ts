import { describe, expect, it } from "vitest";
import { PASSAGE_BY_ID } from "./corpus";
import { MAX_CLAIMS, MIN_QUOTE_CHARS, findQuote, normalize, verifyClaims } from "./verify";

const p = (id: string) => PASSAGE_BY_ID.get(id)!;
const heat = p("hmc-27-2029-a");
const pests = p("hmc-27-2017_4-c");
const lead = p("hpd-lead-class-c"); // has curly quotes: Class “C”
const NIGHT = "between the hours of ten p.m. and six a.m., a temperature of at least sixty-two degrees Fahrenheit";

describe("findQuote", () => {
  it("finds an exact quote and returns its place in the passage", () => {
    const span = findQuote(heat.text, NIGHT)!;
    expect(heat.text.slice(span.start, span.end)).toBe(NIGHT);
  });

  it("ignores whitespace, letter case, curly quotes and dash styles", () => {
    const messy = "BETWEEN the hours of ten p.m.\n and   six a.m., a temperature of at least sixty–two degrees Fahrenheit";
    expect(heat.text.slice(...Object.values(findQuote(heat.text, messy)!))).toBe(NIGHT);
    const straight = 'These violations are all Class "C" immediately hazardous violations';
    expect(findQuote(lead.text, straight)).not.toBeNull();
  });

  it("drops wrapping quotation marks and a closing period the model added", () => {
    expect(findQuote(heat.text, `“${NIGHT}.”`)).not.toBeNull();
  });

  it("rejects a quote shorter than the minimum", () => {
    expect(findQuote(heat.text, "sixty-two degrees")).toBeNull();
    expect("sixty-two degrees".length).toBeLessThan(MIN_QUOTE_CHARS);
  });

  it("rejects invented, altered or stitched-together text", () => {
    expect(findQuote(heat.text, "a temperature of at least sixty-five degrees Fahrenheit")).toBeNull();
    expect(findQuote(heat.text, "between the hours of ten p.m. ... sixty-two degrees Fahrenheit")).toBeNull();
    expect(findQuote(heat.text, "the landlord must keep the apartment at 68 degrees all night")).toBeNull();
  });
});

describe("normalize", () => {
  it("maps each folded character back to the original index", () => {
    const { norm, map } = normalize("  A’b \n\t c— ");
    expect(norm).toBe("a'b c-");
    expect(map).toEqual([2, 3, 4, 5, 9, 10]);
  });
});

describe("verifyClaims", () => {
  const shown = [heat, pests, lead];
  const good = { sentence: "At night the heat must keep it at 62°F or more.", quote: NIGHT, passageId: heat.id };

  it("keeps a claim whose quote is in the cited passage, with the passage's own text as the quote", () => {
    const r = verifyClaims([{ ...good, quote: NIGHT.toUpperCase() }], shown);
    expect(r).toMatchObject({ dropped: 0, blocked: 0 });
    expect(r.verified).toEqual([{ sentence: good.sentence, passageId: heat.id, quote: NIGHT, ...findQuote(heat.text, NIGHT)! }]);
  });

  it("drops a real quote cited to the wrong passage", () => {
    const r = verifyClaims([{ ...good, passageId: pests.id }], shown);
    expect(r).toEqual({ verified: [], dropped: 1, blocked: 0 });
  });

  it("drops a citation of a passage the model was not shown, even one in the corpus", () => {
    const r = verifyClaims([good], [pests, lead]);
    expect(r.dropped).toBe(1);
  });

  it("drops an invented quote and keeps the rest", () => {
    const fake = { sentence: "The owner has 3 days.", quote: "the owner shall correct cockroaches within three days", passageId: pests.id };
    const r = verifyClaims([good, fake], shown);
    expect(r.verified.map((c) => c.passageId)).toEqual([heat.id]);
    expect(r.dropped).toBe(1);
  });

  it("drops an empty sentence and blocks advice to withhold rent, whatever the quote", () => {
    const r = verifyClaims(
      [
        { ...good, sentence: "  " },
        { ...good, sentence: "You can withhold rent until the heat is fixed." },
        { ...good, sentence: "Stop paying rent." },
      ],
      shown,
    );
    expect(r).toEqual({ verified: [], dropped: 1, blocked: 2 });
  });

  it(`looks at no more than ${MAX_CLAIMS} claims`, () => {
    const r = verifyClaims(Array.from({ length: MAX_CLAIMS + 2 }, () => good), shown);
    expect(r.verified).toHaveLength(MAX_CLAIMS);
  });
});
