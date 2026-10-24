// Server only (Node crypto). A receipt proves Habitable's server saw a photo fingerprint at a given time.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Used only outside production when RECEIPT_SECRET is unset. Public in the repo, so receipts made with it prove nothing. */
export const DEV_FALLBACK_SECRET = "habitable-dev-only-secret-do-not-use-in-production";

const SHA256_RE = /^[0-9a-f]{64}$/;
const RECEIPT_RE = /^[0-9a-f]{12}$/;

/**
 * RECEIPT_SECRET, else the public dev fallback in development and tests. A production build without
 * RECEIPT_SECRET gets null: anyone could forge receipts signed with a public secret, so we don't sign.
 */
export function receiptSecret(env: Record<string, string | undefined> = process.env): string | null {
  if (env.RECEIPT_SECRET) return env.RECEIPT_SECRET;
  return env.NODE_ENV === "production" ? null : DEV_FALLBACK_SECRET;
}

export function isSha256(value: string): boolean {
  return SHA256_RE.test(value);
}

/** First 12 hex chars of HMAC-SHA256(secret, `${sha256}|${receivedAt}`). Throws on a malformed sha256. */
export function signReceipt(sha256: string, receivedAt: string, secret: string): string {
  if (!isSha256(sha256)) throw new Error("sha256 must be 64 lowercase hex characters");
  return createHmac("sha256", secret).update(`${sha256}|${receivedAt}`).digest("hex").slice(0, 12);
}

/** Constant-time check; false (never throws) for malformed input. */
export function verifyReceipt(sha256: string, receivedAt: string, receipt: string, secret: string): boolean {
  if (!isSha256(sha256) || !RECEIPT_RE.test(receipt)) return false;
  const expected = signReceipt(sha256, receivedAt, secret);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(receipt));
}
