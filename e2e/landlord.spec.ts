import { expect, test, type Page } from "@playwright/test";
import { startDemo } from "./helpers";

// Landlord track record. The demo building answers from its saved snapshot (src/lib/demo/fixtures/1020020091-landlord.json,
// read live from NYC Open Data on Oct 25, 2026): 4 buildings under EDWIN SHIRAZ / COLUMBIA HEIGHTS 136 LLC / EDWIN SHIRAZIAN.
const card = (page: Page) => page.getByRole("region", { name: "This landlord's buildings" });

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test("building panel card -> /landlord: the portfolio's numbers, the links between buildings, method and sources", async ({ page }) => {
  await startDemo(page);
  await expect(card(page)).toContainText("4 buildings · 948 open violations · 17.8× the NYC rate per apartment", { timeout: 20_000 });
  await expect(card(page)).toContainText("Same head officer: 2 buildings · Same corporate owner: 2 buildings · Same managing agent: 4 buildings");
  await card(page).getByRole("link", { name: "See the landlord's record" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "This landlord's buildings" })).toBeVisible();
  const glance = page.getByRole("region", { name: "The record at a glance" });
  await expect(glance).toContainText("4 buildings · 84 apartments · 948 open violations");
  await expect(glance).toContainText("17.8× the New York City rate of open Class B and C violations per apartment");
  const rate = glance.getByRole("list", { name: "Open Class B and C violations per 100 apartments" }).getByRole("listitem");
  await expect(rate.nth(0)).toContainText("This landlord");
  await expect(rate.nth(0)).toContainText("940.5");
  await expect(rate.nth(1)).toContainText("New York City");
  await expect(rate.nth(1)).toContainText("52.9");

  const classes = page.getByRole("list", { name: "Open violations by class, all buildings" }).getByRole("listitem");
  await expect(classes).toHaveText([/Class C[\s\S]*324/, /Class B[\s\S]*466/, /Class A[\s\S]*154/]);

  const worst = page.getByRole("region", { name: "Most open Class C violations" }).getByRole("listitem");
  await expect(worst).toHaveCount(4);
  await expect(worst.first()).toContainText("234-240 WEST 135 STREET, Manhattan");
  await expect(worst.first()).toContainText("140 open Class C violations · 29 apartments");
  await expect(worst.nth(1)).toContainText("618-620 WEST 136 STREET, Manhattan");
  await expect(worst.nth(1)).toContainText("your building");

  const also = page.getByRole("region", { name: "Also on the record" });
  await expect(also).toContainText("94 heat and hot water complaints to 311 last heat season (Oct 1, 2025 – May 31, 2026)");
  await expect(also).toContainText("56 HPD litigation cases, all years");
  await expect(also).toContainText("3 of 4 buildings in HPD's Alternative Enforcement Program");

  const links = page.getByRole("region", { name: "How these buildings are connected" });
  await expect(links.locator("dt")).toHaveText(["Same head officer", "Same corporate owner", "Same managing agent"]);
  await expect(links.locator("dd")).toHaveText([/EDWIN SHIRAZ\b[\s\S]*2 buildings/, /COLUMBIA HEIGHTS 136 LLC[\s\S]*2 buildings/, /EDWIN SHIRAZIAN[\s\S]*4 buildings/]);

  const method = page.getByRole("region", { name: "How it's counted" });
  await expect(method).toContainText("1,974,942 ÷ 3,736,645, counted Oct 25, 2026");
  await expect(method.getByRole("link", { name: "HPD violations ↗" })).toHaveAttribute(
    "href",
    "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5",
  );
  await expect(method.getByRole("link", { name: "311 service requests ↗" })).toHaveAttribute("href", /erm2-nwe9$/);
  await expect(method.getByRole("link", { name: "PLUTO (residential units) ↗" })).toHaveAttribute("href", /64uk-42ks$/);
  await expect(method).toContainText("Saved snapshot for the demo · Oct 25, 2026");
  await expect(method).toContainText("HPD registration snapshot as of Jul 31, 2026");
  await expect(page.getByText("Not legal advice. Public records as published.")).toBeVisible();
  await noOverflow(page);

  // Dark theme, same page, still no sideways scroll.
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await noOverflow(page);
});

test("when the landlord lookup fails, the card and the page say so and offer a retry", async ({ page }) => {
  let fail = true;
  await page.route("**/api/landlord?*", (route) => (fail ? route.fulfill({ status: 502, json: { error: "unavailable" } }) : route.fallback()));
  await startDemo(page);
  await expect(card(page)).toContainText("The landlord's other buildings are unavailable right now.", { timeout: 20_000 });

  await page.goto("/landlord");
  await expect(page.getByText("The landlord's records are unavailable right now.")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("region", { name: "The record at a glance" })).toContainText("4 buildings");
});

test("/landlord without a case asks for one", async ({ page }) => {
  await page.goto("/landlord");
  await expect(page.getByRole("heading", { name: "Set up your case first" })).toBeVisible();
});
