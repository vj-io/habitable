import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { addToLog, confirmProposal, sheet, snapSample, startDemo } from "./helpers";

// Pin "now" inside heat season (10:00 AM EST, Jan 15 2027; the clock keeps running) and keep the weather station
// out of it: /api/outdoor answers "unavailable", so no test depends on the network or today's weather.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2027-01-15T15:00:00Z") });
  await page.route("**/api/outdoor", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
  await startDemo(page);
});

async function openWithSamples(page: Page) {
  await page.getByRole("link", { name: "Start a heat log" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Heat log/ })).toBeVisible();
  await page.getByRole("button", { name: "Add sample readings" }).click();
  await expect(page.getByRole("article")).toHaveCount(5);
}

test("heat log: sample readings -> stamps -> a typed reading -> the notice's heat section (EN/ES, PDF)", async ({ page }) => {
  await openWithSamples(page);
  const readings = page.getByRole("article");
  await expect(page.getByText("4 of 5 readings below the minimum since Jan 3")).toBeVisible();
  const morning = readings.filter({ hasText: "7:15 AM" });
  await expect(morning.getByText("Below legal minimum 68°F")).toBeVisible();
  await expect(morning.getByText("DEMO")).toBeVisible();
  await expect(readings.filter({ hasText: "11:30 PM" }).getByText("Below legal minimum 62°F")).toBeVisible();
  await expect(readings.filter({ hasText: "2:00 PM" }).getByText("Meets the minimum")).toBeVisible();
  await expect(readings.filter({ hasText: "Hot water" }).getByText("Below legal minimum 120°F")).toBeVisible();

  // A reading now (10 AM). The station is unavailable, so the outdoor field asks to be typed.
  await expect(page.getByText(/The weather station isn't answering right now/)).toBeVisible();
  await page.getByLabel("Temperature inside (°F)").fill("63");
  await expect(page.getByText("Needs the outdoor temperature")).toBeVisible(); // daytime: 68°F applies only below 55°F outside
  await page.getByLabel(/Temperature outside/).fill("30");
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByText(/Saved: 63°F at Jan 15, 2027, 10:0\d AM/)).toBeVisible();
  await expect(readings).toHaveCount(6);
  await expect(page.getByText("5 of 6 readings below the minimum since Jan 3")).toBeVisible();
  await expect(readings.filter({ hasText: "30°F outside (typed)" }).getByText("Below legal minimum 68°F")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  // The notice lists the readings below the minimum (the demo case has no photographed issue: the log alone is enough).
  await page.getByRole("link", { name: "Make the notice" }).click();
  const heat = page.getByRole("region", { name: "Heat and hot water log" });
  await expect(heat).toBeVisible();
  await expect(heat.getByText("5 of 6 readings I logged since Jan 3, 2027 were below the legal minimum:")).toBeVisible();
  await expect(heat.getByRole("listitem")).toHaveCount(5);
  await expect(heat.getByRole("listitem").last()).toContainText(/Jan 15, 2027, 10:0\d AM · Heat/);
  await expect(heat.getByRole("listitem").last()).toContainText("Outside 30°F · Minimum 68°F · §27-2029(a)");
  await expect(heat.getByText(/Hot water, NYC Admin\. Code §27-2031: year-round, at least 120°F at the tap\./)).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  const pdf = readFileSync(await download.path());
  expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");

  await page.getByRole("button", { name: "Español" }).click();
  await expect(page.getByRole("region", { name: "Registro de calefacción y agua caliente" })).toBeVisible();
});

test("delete a reading; the case file shows the latest; a heat issue links to the log", async ({ page }) => {
  await openWithSamples(page);
  await page.getByRole("button", { name: "Delete the Jan 3, 2027, 7:15 AM reading" }).click();
  await page.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(page.getByText("3 of 4 readings below the minimum since Jan 3")).toBeVisible();

  await page.getByRole("link", { name: "Back to your case file" }).click();
  const card = page.getByRole("region", { name: "Your heat log" });
  await expect(card.getByText("Latest: Jan 5, 2027, 8:00 PM")).toBeVisible();
  await expect(card.getByText("Below legal minimum 68°F")).toBeVisible();

  await snapSample(page, "cold-radiator");
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "Heat", exact: true }).click();
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();
  await page.getByRole("article").filter({ hasText: "Heat" }).getByRole("link").click();
  await page.getByRole("link", { name: "Keep a heat log" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Heat log/ })).toBeVisible();
});
