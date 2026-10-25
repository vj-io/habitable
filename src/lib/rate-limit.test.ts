import { describe, expect, it } from "vitest";
import { createLimiter } from "./rate-limit";

describe("createLimiter", () => {
  it("caps each visitor, then the whole instance, and forgets old hits", () => {
    const check = createLimiter({ perIp: { limit: 2, windowMs: 1000 }, global: { limit: 3, windowMs: 1000 } });
    expect(check("a", 0)).toBeNull();
    expect(check("a", 10)).toBeNull();
    expect(check("a", 20)).toBe("ip");
    expect(check("b", 30)).toBeNull();
    expect(check("c", 40)).toBe("global");
    expect(check("a", 1500)).toBeNull(); // window passed
  });
});
