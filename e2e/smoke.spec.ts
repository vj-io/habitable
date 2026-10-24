import { expect, test } from "@playwright/test";

// Runs in both the phone and desktop projects.
const ROUTES = ["/", "/how-it-works", "/verify", "/notice", "/manifest.webmanifest", "/icon.svg", "/opengraph-image"];

for (const route of ROUTES) {
  test(`GET ${route} responds 200`, async ({ request }) => {
    const res = await request.get(route);
    expect(res.status()).toBe(200);
  });
}

for (const route of ["/", "/how-it-works"]) {
  test(`no console errors on ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("no horizontal scroll at 375px on /", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("security headers and a fresh service worker", async ({ request }) => {
  const page = await request.get("/");
  expect(page.headers()["x-content-type-options"]).toBe("nosniff");
  expect(page.headers()["x-frame-options"]).toBe("DENY");
  expect(page.headers()["permissions-policy"]).toContain("camera=(self)");
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});
