import { afterEach, describe, expect, it, vi } from "vitest";
import { DEV_FALLBACK_SECRET, signReceipt, verifyReceipt } from "./receipt";

const SHA = "a".repeat(64);
const AT = "2026-10-15T11:42:00.000Z";

afterEach(() => vi.unstubAllEnvs());

describe("signReceipt", () => {
  it("is the first 12 hex chars of HMAC-SHA256(secret, sha|receivedAt)", () => {
    // Vector from: printf '%s' "<sha>|<at>" | openssl dgst -sha256 -hmac test-secret
    expect(signReceipt(SHA, AT, "test-secret")).toBe("76ecf031e47a");
  });

  it("changes with the secret, hash and time", () => {
    const base = signReceipt(SHA, AT, "s1");
    expect(signReceipt(SHA, AT, "s2")).not.toBe(base);
    expect(signReceipt("b".repeat(64), AT, "s1")).not.toBe(base);
    expect(signReceipt(SHA, "2026-10-15T11:42:01.000Z", "s1")).not.toBe(base);
  });

  it("rejects a sha256 that is not 64 lowercase hex", () => {
    for (const bad of ["", "abc", "A".repeat(64), "g".repeat(64), "a".repeat(63), "a".repeat(65)]) {
      expect(() => signReceipt(bad, AT, "s")).toThrow();
    }
  });

  it("uses RECEIPT_SECRET from the environment, else the dev fallback", () => {
    vi.stubEnv("RECEIPT_SECRET", "from-env");
    expect(signReceipt(SHA, AT)).toBe(signReceipt(SHA, AT, "from-env"));
    vi.stubEnv("RECEIPT_SECRET", "");
    expect(signReceipt(SHA, AT)).toBe(signReceipt(SHA, AT, DEV_FALLBACK_SECRET));
  });

  it("warns once in production when RECEIPT_SECRET is missing, but still signs", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RECEIPT_SECRET", "");
    vi.resetModules(); // fresh module = fresh "warned" flag
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fresh = await import("./receipt");
    expect(fresh.signReceipt(SHA, AT)).toMatch(/^[0-9a-f]{12}$/);
    fresh.signReceipt(SHA, AT);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("verifyReceipt", () => {
  const good = signReceipt(SHA, AT, "s");

  it("accepts the genuine receipt", () => {
    expect(verifyReceipt(SHA, AT, good, "s")).toBe(true);
  });

  it("rejects tampered hash, time, receipt or secret", () => {
    expect(verifyReceipt("b".repeat(64), AT, good, "s")).toBe(false);
    expect(verifyReceipt(SHA, "2026-10-14T11:42:00.000Z", good, "s")).toBe(false);
    expect(verifyReceipt(SHA, AT, "0".repeat(12), "s")).toBe(false);
    expect(verifyReceipt(SHA, AT, good, "other")).toBe(false);
  });

  it("returns false (does not throw) for malformed input", () => {
    expect(verifyReceipt("nope", AT, good, "s")).toBe(false);
    expect(verifyReceipt(SHA, AT, "", "s")).toBe(false);
    expect(verifyReceipt(SHA, AT, good.toUpperCase(), "s")).toBe(false);
    expect(verifyReceipt(SHA, AT, good + "0", "s")).toBe(false);
  });
});
