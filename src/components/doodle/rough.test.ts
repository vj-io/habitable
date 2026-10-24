import { expect, test } from "vitest";
import { rough } from "./rough";

const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

test("same seed gives the same path (no hydration mismatch), different seed differs", () => {
  const a = rough(7);
  const b = rough(7);
  expect(a.rect(2, 2, 300, 120)).toBe(b.rect(2, 2, 300, 120));
  expect(a.ellipse(50, 25, 46, 22)).toBe(b.ellipse(50, 25, 46, 22));
  expect(rough(8).rect(2, 2, 300, 120)).not.toBe(rough(7).rect(2, 2, 300, 120));
});

test("box outline stays within a few px of its box", () => {
  for (let seed = 1; seed < 50; seed++) {
    const v = nums(rough(seed).rect(2.25, 2.25, 371.5, 95.5));
    expect(Math.min(...v)).toBeGreaterThan(-4);
    expect(Math.max(...v)).toBeLessThan(380);
  }
});
