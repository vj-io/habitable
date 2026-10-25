import { describe, expect, it } from "vitest";
import rules from "@/lib/rules.json";
import { PASSAGES, PASSAGE_BY_ID } from "./corpus";

describe("law corpus", () => {
  it("has 40-90 passages with unique ids", () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(40);
    expect(PASSAGES.length).toBeLessThanOrEqual(90);
    expect(PASSAGE_BY_ID.size).toBe(PASSAGES.length);
  });

  it("every passage has official https source, text, title and a retrieval date", () => {
    for (const p of PASSAGES) {
      const url = new URL(p.url);
      expect(url.protocol, p.id).toBe("https:");
      expect(url.hostname, p.id).toBe("www.nyc.gov");
      expect(p.text.trim().length, p.id).toBeGreaterThan(0);
      expect(p.title.trim().length, p.id).toBeGreaterThan(0);
      expect(p.source.trim().length, p.id).toBeGreaterThan(0);
      expect(p.retrieved, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.section, p.id).toMatch(/^§27-\d{4}(\.\d+)*(\([a-z0-9]+\))*$|^HPD guidance$/);
    }
  });

  it("holds no elided text: nothing is shortened with an ellipsis", () => {
    for (const p of PASSAGES) expect(p.text, p.id).not.toMatch(/…|\.\.\./);
  });

  it("has the current heat law (Local Law 86 of 2017: 68°F by day, 62°F at night)", () => {
    const text = PASSAGE_BY_ID.get("hmc-27-2029-a")!.text;
    expect(text).toContain("a temperature of at least sixty-eight degrees Fahrenheit whenever the outside temperature falls below fifty-five degrees");
    expect(text).toContain("between the hours of ten p.m. and six a.m., a temperature of at least sixty-two degrees Fahrenheit.");
  });

  it("has every NYC Admin Code section the rules table cites", () => {
    const citations = Object.values(rules.issues).flatMap((issue) =>
      (issue.variants as { citation?: string }[]).flatMap((v) => (v.citation ? [v.citation] : [])),
    );
    const cited = new Set(citations.flatMap((c) => [...c.matchAll(/§(27-\d{4}(?:\.\d+)*)((?:\([a-z0-9]+\))*)/g)].map((m) => `§${m[1]}${m[2]}`)));
    expect(cited.size).toBeGreaterThan(10);
    for (const ref of cited) {
      const found = PASSAGES.some((p) => p.section === ref || p.section.startsWith(`${ref}(`));
      expect(found, ref).toBe(true);
    }
  });
});
