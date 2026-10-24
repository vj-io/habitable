import { expect, test } from "@playwright/test";
import { addToLog, confirmProposal, expectRule, sheet, snapSample, startDemo } from "./helpers";

// The kernel's branches: the AI only proposes; the rules table (plus asked facts) sets class and window.
test.beforeEach(async ({ page }) => {
  await startDemo(page);
});

test("ambiguous photo: one clarifying question, then the mold-area fact -> Class C, 21 days", async ({ page }) => {
  await snapSample(page, "ambiguous-stain");
  await sheet(page).getByRole("button", { name: "Fuzzy spots" }).click();
  await expect(sheet(page).getByLabel("AI proposal").getByText("Mold", { exact: true })).toBeVisible();
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "30 sq ft or more" }).click();
  await expectRule(page, "C", "21-day correction window");
});

test("peeling paint: child-under-6 is asked once, then remembered", async ({ page }) => {
  await snapSample(page, "peeling-paint");
  await confirmProposal(page);
  await expect(sheet(page).getByRole("group", { name: /Does a child under 6/ })).toBeVisible();
  await sheet(page).getByRole("button", { name: "Yes", exact: true }).click();
  await expectRule(page, "C", "21-day correction window");
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();

  // Second paint issue: straight to the stamp, no question.
  await snapSample(page, "peeling-paint");
  await confirmProposal(page);
  await expectRule(page, "C", "21-day correction window");
  await expect(sheet(page).getByRole("group", { name: /Does a child under 6/ })).toHaveCount(0);
});

test("cold radiator in heat season: Heat -> Class C, no time to correct", async ({ page }) => {
  // Pin "now" inside Oct 1 - May 31 so this keeps passing in summer (the clock keeps running).
  await page.clock.install({ time: new Date("2027-01-15T15:00:00Z") });
  await page.reload();
  await snapSample(page, "cold-radiator");
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "Heat", exact: true }).click();
  await expectRule(page, "C", "No time to correct");
});

test("manual pick via 'Not right?': apartment door can't lock -> Class C, 24 hours", async ({ page }) => {
  await snapSample(page, "mice-kitchen");
  await sheet(page).getByRole("button", { name: /Not right\? Pick it myself/ }).click();
  await sheet(page).getByRole("button", { name: "Broken lock / door" }).click();
  await sheet(page).getByRole("button", { name: "My apartment door can't be locked" }).click();
  await expectRule(page, "C", "24-hour correction window");
});
