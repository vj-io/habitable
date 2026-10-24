import { expect, test } from "@playwright/test";
import { startDemo } from "./helpers";

// Service workers are reliable in Chromium under Playwright; WebKit and Firefox skip this one.
test("the case opens with no connection once the app has been loaded", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "service worker test runs in Chromium");
  await startDemo(page);
  // wait until the service worker controls the page, then load once more so pages and code are cached
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Snap a problem" })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Snap a problem" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Offline" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("status").filter({ hasText: "Offline" })).toHaveCount(0);
});
