import { z } from "zod";
import { signReceipt, verifyReceipt } from "@/lib/receipt";
import type { ReceiptResponse } from "@/lib/types";

// POST is never cached; GET reads request.url, which opts it into request-time rendering under Cache Components.
const NO_STORE = { "Cache-Control": "no-store" };

const sha256 = z.string().regex(/^[0-9a-f]{64}$/, "sha256 must be 64 lowercase hex characters");

const PostBody = z.object({ sha256 });

const VerifyQuery = z.object({
  sha256,
  receivedAt: z.string().min(1).max(64),
  receipt: z.string().regex(/^[0-9a-f]{12}$/),
});

/** Stamp a photo fingerprint: `{ sha256 }` -> `{ receivedAt, receipt }`. */
export async function POST(request: Request) {
  const body = PostBody.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: body.error.issues[0]?.message ?? "Invalid request" }, { status: 400, headers: NO_STORE });
  }
  const receivedAt = new Date().toISOString();
  const res: ReceiptResponse = { receivedAt, receipt: signReceipt(body.data.sha256, receivedAt) };
  return Response.json(res, { headers: NO_STORE });
}

/** Check a receipt: `?sha256&receivedAt&receipt` -> `{ valid }`. Malformed input is simply not valid. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const q = VerifyQuery.safeParse(params);
  const valid = q.success && verifyReceipt(q.data.sha256, q.data.receivedAt, q.data.receipt);
  return Response.json({ valid }, { headers: NO_STORE });
}
