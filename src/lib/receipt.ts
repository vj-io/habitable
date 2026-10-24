// Server only (Node crypto). A receipt proves Habitable's server saw a photo fingerprint at a given time.
import { createHmac, timingSafeEqual } from "node:crypto";

/** Used only when RECEIPT_SECRET is unset. Public in the repo, so receipts made with it prove nothing. */
export const DEV_FALLBACK_SECRET = "habitable-dev-only-secret-do-not-use-in-production";

const SHA256_RE = /^[0-9a-f]{64}$/;
const RECEIPT_RE = /^[0-9a-f]{12}$/;

let warned = false;

function defaultSecret(): string {
  const secret = process.env.RECEIPT_SECRET;
  if (secret) return secret;
  if (process.env.VERCEL_ENV === "production" && !warned) {
    warned = true;
    console.warn("RECEIPT_SECRET is not set in production; receipts are signed with the public dev fallback.");
  }
  return DEV_FALLBACK_SECRET;
}

export function isSha256(value: string): boolean {
  return SHA256_RE.test(value);
}

/** First 12 hex chars of HMAC-SHA256(secret, `${sha256}|${receivedAt}`). Throws on a malformed sha256. */
export function signReceipt(sha256: string, receivedAt: string, secret: string = defaultSecret()): string {
  if (!isSha256(sha256)) throw new Error("sha256 must be 64 lowercase hex characters");
  return createHmac("sha256", secret).update(`${sha256}|${receivedAt}`).digest("hex").slice(0, 12);
}

/** Constant-time check; false (never throws) for malformed input. */
export function verifyReceipt(sha256: string, receivedAt: string, receipt: string, secret?: string): boolean {
  if (!isSha256(sha256) || !RECEIPT_RE.test(receipt)) return false;
  const expected = signReceipt(sha256, receivedAt, secret);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(receipt));
}
