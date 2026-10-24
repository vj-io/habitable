import { describe, expect, it } from "vitest";
import { DEV_FALLBACK_SECRET, receiptSecret, signReceipt, verifyReceipt } from "./receipt";

const SHA = "a".repeat(64);
const AT = "2026-10-15T11:42:00.000Z";

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

});

describe("receiptSecret", () => {
  it("uses RECEIPT_SECRET when set, in any environment", () => {
    expect(receiptSecret({ RECEIPT_SECRET: "from-env", NODE_ENV: "production" })).toBe("from-env");
    expect(receiptSecret({ RECEIPT_SECRET: "from-env", NODE_ENV: "development" })).toBe("from-env");
  });

  it("falls back to the public dev secret only outside production", () => {
    expect(receiptSecret({ NODE_ENV: "development" })).toBe(DEV_FALLBACK_SECRET);
    expect(receiptSecret({ NODE_ENV: "test", RECEIPT_SECRET: "" })).toBe(DEV_FALLBACK_SECRET);
  });

  it("refuses (null) in production when RECEIPT_SECRET is missing or empty", () => {
    expect(receiptSecret({ NODE_ENV: "production" })).toBeNull();
    expect(receiptSecret({ NODE_ENV: "production", RECEIPT_SECRET: "" })).toBeNull();
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
