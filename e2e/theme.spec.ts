import { expect, test } from "@playwright/test";
import { startDemo } from "./helpers";

const theme = (page: import("@playwright/test").Page) => page.locator("html").getAttribute("data-theme");

test("theme follows the system setting, then the toggle wins and survives a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("/");
  expect(await theme(page)).toBe("dark");

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  expect(await theme(page)).toBe("light");
  // the paper really changed colour, not just the attribute
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(243, 238, 229)");

  await page.reload();
  expect(await theme(page)).toBe("light");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("case menu opens over the page without pushing the header down", async ({ page }) => {
  await startDemo(page);
  const header = page.locator("header").first();
  const before = (await header.boundingBox())!.height;

  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const deleteItem = page.getByRole("button", { name: "Delete my case" });
  await expect(deleteItem).toBeVisible();
  expect((await header.boundingBox())!.height).toBe(before);

  // the popover sits fully inside the viewport (it used to be clipped at 390 px)
  const box = (await deleteItem.boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
});
