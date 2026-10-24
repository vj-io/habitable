import { expect, test } from "@playwright/test";

const SHA = "cd".repeat(32);

test("/api/classify: a demo sample returns a saved leak proposal", async ({ request }) => {
  const res = await request.post("/api/classify", { data: { sampleId: "leak-ceiling" } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("proposal");
  expect(body.proposal.issue).toBe("leak");
  expect(body.proposal.source).toBe("demo");
});

test("/api/classify: bad bodies are 400", async ({ request }) => {
  expect((await request.post("/api/classify", { data: {} })).status()).toBe(400);
  expect((await request.post("/api/classify", { data: { sampleId: "no-such-sample" } })).status()).toBe(400);
  expect(
    (await request.post("/api/classify", { headers: { "content-type": "application/json" }, data: "not json" })).status(),
  ).toBe(400);
});

test("/api/receipt: sign, verify, and reject a tampered receipt", async ({ request }) => {
  const post = await request.post("/api/receipt", { data: { sha256: SHA } });
  expect(post.status()).toBe(200);
  const { receivedAt, receipt } = (await post.json()) as { receivedAt: string; receipt: string };
  expect(receipt).toMatch(/^[0-9a-f]{12}$/);

  const verify = (params: Record<string, string>) => request.get(`/api/receipt?${new URLSearchParams(params)}`);
  expect(await (await verify({ sha256: SHA, receivedAt, receipt })).json()).toEqual({ valid: true });

  const other = receipt.endsWith("0") ? "1" : "0";
  expect(await (await verify({ sha256: SHA, receivedAt, receipt: receipt.slice(0, -1) + other })).json()).toEqual({ valid: false });
  expect(await (await verify({ sha256: "ef".repeat(32), receivedAt, receipt })).json()).toEqual({ valid: false });

  expect((await request.post("/api/receipt", { data: { sha256: "nope" } })).status()).toBe(400);
});

test("/api/building: demo fixture for the demo BBL, 400 for a malformed BBL", async ({ request }) => {
  const res = await request.get("/api/building?bbl=1020020091&demo=1");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.openTotal).toBeGreaterThan(0);
  expect(body.source).toBe("demo-fixture");

  expect((await request.get("/api/building?bbl=abc")).status()).toBe(400);
});
