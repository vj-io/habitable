import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { addToLog, confirmProposal, snapSample, sheet, startDemo } from "./helpers";

// Landlord on record (HPD registration), the notice's "To:" block, the next-steps page and the case-file card.
// The demo building answers from saved fixtures: its registered agent is Edwin Shirazian (HPD snapshot of Jul 31, 2026).
const AGENT = "EDWIN SHIRAZIAN";
const AGENT_ADDRESS = "579 5th ave, 2nd fl, New York, NY 10017";

/** Snap the ceiling-leak sample (Class B, 30-day window) and log it. */
async function logLeak(page: Page) {
  await snapSample(page, "leak-ceiling");
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "No, it's a stain" }).click();
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();
}

const nextCard = (page: Page) => page.getByRole("region", { name: "What you can do next" });

test("demo building shows who it is registered with at HPD, managing agent first", async ({ page }) => {
  await startDemo(page);
  const panel = page.getByRole("region", { name: "Registered with HPD" });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  const labels = await panel.locator("dt").allInnerTexts();
  expect(labels.map((l) => l.toLowerCase())).toEqual(["managing agent", "owner", "head officer"]);
  await expect(panel.locator("dd").first()).toContainText(AGENT);
  await expect(panel.locator("dd").first()).toContainText(AGENT_ADDRESS);
  await expect(panel.locator("dd").nth(1)).toContainText("COLUMBIA HEIGHTS 136 LLC");
  await expect(panel).toContainText("Registration 109944");
  await expect(panel).toContainText("HPD registration snapshot as of Jul 31, 2026");
  await expect(panel.getByRole("link", { name: "Verify on HPD Online" })).toHaveAttribute("href", "https://hpdonline.nyc.gov/hpdonline/");
  await expect(panel).not.toContainText(/expired/i);
});

test("demo building shows recent HPD complaints by category, litigation, and the AEP flag", async ({ page }) => {
  await startDemo(page);
  // On phones the longer lists are folded behind one button; desktop shows them (the button is hidden there).
  const more = page.getByRole("button", { name: "Show the full public record" });
  await more.waitFor({ state: "attached", timeout: 20_000 });
  if (await more.isVisible()) {
    await expect(page.getByText("By problem")).toBeHidden();
    await more.click();
    await expect(page.getByRole("button", { name: "Show less of the public record" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("By problem")).toBeVisible();
  }
  const panel = page.getByRole("region", { name: "Also on HPD's record" });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  await expect(panel).toContainText("In HPD's Alternative Enforcement Program");
  await expect(panel).toContainText("problems reported to HPD since Oct 25, 2025");
  await expect(panel.getByRole("list", { name: "Problems reported to HPD by category" })).toContainText("Unsanitary condition");
  await expect(panel).toContainText("16 HPD litigation cases on record");
  // Categories and counts only: every list row is "<number> <category>".
  const rows = await panel.getByRole("list", { name: "Problems reported to HPD by category" }).getByRole("listitem").allInnerTexts();
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(row).toMatch(/^\d+\s+[A-Za-z/ ]+$/);
});

test("a building missing from HPD's file, or a failed lookup, says so plainly", async ({ page }) => {
  // Same demo record, with the registration part swapped.
  let registration: unknown = { asOf: "2026-07-31", current: null };
  await page.route("**/api/building?*", async (route) => {
    const body = (await (await route.fetch()).json()) as Record<string, unknown>;
    await route.fulfill({ json: { ...body, registration } });
  });
  await startDemo(page);
  const panel = page.getByRole("region", { name: "Registered with HPD" });
  await expect(panel.getByText("No HPD registration found for this building.")).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText(/Many small buildings aren't registered/)).toBeVisible();

  registration = undefined;
  await page.reload();
  await expect(page.getByRole("region", { name: "Registered with HPD" }).getByText("The registered contacts are unavailable right now.")).toBeVisible({ timeout: 20_000 });
});

test("notice: To block is prefilled from the registration, editable, and remembered after a reload", async ({ page }) => {
  await startDemo(page);
  await logLeak(page);
  await page.goto("/notice");

  const to = page.getByLabel("Landlord or managing agent");
  const address = page.getByLabel("Their mailing address");
  const cc = page.getByLabel("Copy to the owner");
  await expect(to).toHaveValue(AGENT, { timeout: 20_000 });
  await expect(address).toHaveValue(AGENT_ADDRESS);
  await expect(cc).toHaveValue("COLUMBIA HEIGHTS 136 LLC, 579 5th ave, 2nd fl, New York, NY 10017");
  await expect(page.getByText(/Filled in from HPD's registration/)).toBeVisible();
  await expect(page.getByText("HPD registration snapshot as of Jul 31, 2026")).toBeVisible();

  // The preview carries the same block: name, address, then Cc.
  const preview = page.getByRole("article", { name: "Notice of Conditions Requiring Repair" });
  await expect(preview.locator("dt", { hasText: /^To$/i })).toBeVisible();
  await expect(preview).toContainText(AGENT);
  await expect(preview).toContainText(AGENT_ADDRESS);
  await expect(preview.locator("dt", { hasText: /^Cc$/i })).toBeVisible();
  await expect(preview).toContainText("Not legal advice");

  // Edit: the renter's own words win, and survive a reload instead of snapping back to HPD's names.
  await page.getByLabel("Your name").fill("Sam Rivera");
  await to.fill("Pat Landlord");
  await address.fill("1 Main St, New York, NY 10001");
  await cc.fill("");
  await cc.blur();
  await expect(preview).toContainText("Pat Landlord");
  await expect(preview).not.toContainText(AGENT);
  await page.reload();
  await expect(page.getByLabel("Landlord or managing agent")).toHaveValue("Pat Landlord", { timeout: 20_000 });
  await expect(page.getByLabel("Their mailing address")).toHaveValue("1 Main St, New York, NY 10001");
  await expect(page.getByLabel("Copy to the owner")).toHaveValue("");
  await expect(page.getByLabel("Your name")).toHaveValue("Sam Rivera");
  await expect(page.getByText(/Filled in from HPD's registration/)).toBeHidden();

  // Spanish keeps the block, with its own labels.
  await page.getByRole("button", { name: "Español" }).click();
  const es = page.getByRole("article", { name: "Aviso de condiciones que requieren reparación" });
  await expect(es.locator("dt", { hasText: /^Para$/i })).toBeVisible();
  await expect(es).toContainText("Pat Landlord");
  await expect(es).toContainText("1 Main St, New York, NY 10001");
});

test("notice: nothing to prefill when HPD has no registration, and the renter can still type one", async ({ page }) => {
  await page.route("**/api/building?*", async (route) => {
    const body = (await (await route.fetch()).json()) as Record<string, unknown>;
    await route.fulfill({ json: { ...body, registration: { asOf: "2026-07-31", current: null } } });
  });
  await startDemo(page);
  await logLeak(page);
  await page.goto("/notice");
  await expect(page.getByText(/HPD has no registration on file for this building/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Landlord or managing agent")).toHaveValue("");
  const preview = page.getByRole("article", { name: "Notice of Conditions Requiring Repair" });
  await expect(preview).toContainText("Owner / Managing Agent"); // the generic line, not a made-up name
  await page.getByLabel("Landlord or managing agent").fill("Mr. Gold");
  await expect(preview).toContainText("Mr. Gold");
});

test("making the notice moves the case file on and points to next steps", async ({ page }) => {
  await startDemo(page);

  // No issues yet: start with a photo.
  await expect(nextCard(page)).toContainText("Start with a photo");
  await expect(nextCard(page).getByRole("link", { name: "Make the notice" })).toHaveCount(0);
  await expect(nextCard(page).getByRole("link", { name: /Next steps and your rights/ })).toHaveAttribute("href", "/next-steps");

  // An open issue and no notice: make the notice.
  await logLeak(page);
  await expect(nextCard(page)).toContainText("Tell your landlord in writing");
  await expect(nextCard(page).getByRole("link", { name: "Make the notice" })).toHaveAttribute("href", "/notice");

  // Download the PDF: the notice screen offers the way on, and the case file remembers it.
  await page.goto("/notice");
  await expect(page.getByRole("region", { name: /Your notice is made/ })).toHaveCount(0);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(readFileSync(await download.path()).subarray(0, 4).toString("latin1")).toBe("%PDF");
  const after = page.getByRole("region", { name: /Your notice is made/ });
  await expect(after).toBeVisible();
  await expect(after.getByRole("link", { name: "Next steps and your rights" })).toHaveAttribute("href", "/next-steps");
  await expect(after.getByRole("link", { name: /HPD: tenants' rights/ })).toHaveAttribute("href", /nyc\.gov\/site\/hpd\//);

  await page.goto("/");
  await expect(nextCard(page)).toContainText("You made your notice on");
  await expect(nextCard(page).getByRole("link", { name: "Make the notice" })).toHaveCount(0);
  await expect(nextCard(page).getByRole("link", { name: /File with 311/ })).toHaveCount(0);

  // The repair-by date passes (edit the saved issue, as a month of waiting would): file with 311 and see the HP Action.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("keyval-store");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction("keyval", "readwrite");
    const store = tx.objectStore("keyval");
    const issues = await new Promise<{ repairBy: string | null }[]>((resolve) => {
      const get = store.get("habitable:issues");
      get.onsuccess = () => resolve(get.result);
    });
    for (const i of issues) i.repairBy = "2026-01-01T12:00:00.000Z";
    store.put(issues, "habitable:issues");
    await new Promise((resolve) => (tx.oncomplete = resolve));
  });
  await page.reload();
  await expect(nextCard(page)).toContainText("The repair-by date has passed on one problem");
  const file311 = nextCard(page).getByRole("link", { name: /File with 311/ });
  await expect(file311).toHaveAttribute("href", "https://portal.311.nyc.gov/");
  await expect(file311).toHaveAttribute("target", "_blank");
  await expect(nextCard(page)).toContainText("HP Action in Housing Court");
});

test("/next-steps: the ladder, the side cards, working links, and the not-legal-advice line", async ({ page }) => {
  await page.goto("/next-steps");
  await expect(page.getByRole("heading", { level: 1, name: /Next steps & your rights/ })).toBeVisible();
  await expect(page.getByText("Not legal advice").first()).toBeVisible();

  for (const name of [
    "Tell the landlord in writing",
    "File with 311 for an HPD inspection",
    "HP Action in Housing Court",
    "Free legal help",
    "If your apartment is rent-stabilized",
    "Warranty of habitability",
    "Protection from retaliation",
  ]) {
    await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
  }

  // Phone numbers dial; the notice is one tap away.
  const hrefs = async (selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute("href")));
  const tel = await hrefs('a[href^="tel:"]');
  for (const n of ["tel:311", "tel:+12125044115", "tel:+12129790611", "tel:+12129624795", "tel:+18334990343"]) expect(tel).toContain(n);
  await expect(page.getByRole("link", { name: "Make the notice" })).toHaveAttribute("href", "/notice");

  // Every outside link opens in a new tab without a referrer, and the cited official pages are all there (no clicking out).
  const external = await hrefs('main a[href^="http"]');
  expect(external.length).toBeGreaterThan(20);
  await expect(page.locator('main a[href^="http"]:not([target="_blank"])')).toHaveCount(0);
  await expect(page.locator('main a[href^="http"]:not([rel~="noreferrer"])')).toHaveCount(0);
  for (const url of [
    "https://www.nyc.gov/site/hpd/services-and-information/tenants-rights-and-responsibilities.page",
    "https://www.nyc.gov/site/hpd/services-and-information/report-a-maintenance-issue.page",
    "https://www.nyc.gov/site/hpd/services-and-information/heat-and-hot-water-information.page",
    "https://portal.311.nyc.gov/",
    "https://portal.311.nyc.gov/article/?kanumber=KA-01025",
    "https://www.nyc.gov/site/hpd/services-and-information/housing-court.page",
    "https://www.nycourts.gov/new-york-city-housing-court/starting-hp-proceeding-obtain-repairs",
    "https://www.justfix.org/en/learn/guide-to-hp-actions/",
    "https://www.nyc.gov/site/mayorspeu/programs/tenant-support-unit.page",
    "https://www.nyc.gov/site/hra/help/legal-services-for-tenants.page",
    "https://www.nyc.gov/site/mayorspeu/resources/right-to-counsel.page",
    "https://nyc.gov/tenantresourceportal",
    "https://www.metcouncilonhousing.org/",
    "https://housingcourtanswers.org/contact-us/",
    "https://hcr.ny.gov/form-ra-84",
    "https://hcr.ny.gov/form-ra-81",
    "https://hcr.ny.gov/form-hhw-1",
    "https://hcr.ny.gov/living-conditions-and-essential-services",
    "https://rent.hcr.ny.gov/RentConnect/Tenant/Overview",
    "https://portal.hcr.ny.gov/app/ask",
    "https://www.nysenate.gov/legislation/laws/RPP/235-B",
    "https://www.nysenate.gov/legislation/laws/RPP/223-B",
  ]) {
    expect(external, url).toContain(url);
  }

  // Nothing here tells anyone to withhold rent.
  expect(await page.locator("main").innerText()).not.toMatch(/withhold/i);

  // No sideways scroll on a phone.
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("next steps is linked from the footer, the case-file menu, how-it-works and the notice screen", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("link", { name: "Next steps & rights" }).first()).toHaveAttribute("href", "/next-steps");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Next steps & rights" })).toHaveAttribute("href", "/next-steps");

  await page.goto("/how-it-works");
  const limits = page.locator('section[aria-labelledby="limits"]');
  await expect(limits.getByRole("link", { name: "next steps & your rights" })).toHaveAttribute("href", "/next-steps");
  await expect(limits).toContainText("doesn't give legal advice");
  await expect(limits).not.toContainText("doesn't advise on rent");

  await page.goto("/notice");
  await expect(page.getByRole("link", { name: /What happens next/ })).toHaveAttribute("href", "/next-steps");
});
