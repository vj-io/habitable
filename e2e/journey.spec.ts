import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { addToLog, confirmProposal, countdownDigits, expectRule, ruleCard, sheet, snapSample, startDemo } from "./helpers";

// Checklist slices 1-5, end to end, on the demo building (saved AI answers: no live model call).
test("demo journey: photo -> stamped rule -> log -> follow-up -> notice PDF (EN/ES)", async ({ page }) => {
  // Welcome -> case file with the demo building and its public record.
  await startDemo(page);
  await expect(page.getByText("618 West 136th Street").first()).toBeVisible();
  await expect(page.getByText(/\d[\d,]* open HPD violations/).first()).toBeVisible({ timeout: 20_000 });

  // Snap the ceiling-leak sample: EXIF capture time is read as New York time.
  await snapSample(page, "leak-ceiling");
  await expect(sheet(page).getByText("Taken Oct 15, 2026, 7:42 AM")).toBeVisible();

  // AI proposes (violet pencil), the renter confirms, the rule asks the one fact the photo can't show.
  const proposal = sheet(page).getByLabel("AI proposal");
  await expect(proposal.getByText("Leak / water damage")).toBeVisible();
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "No, it's a stain" }).click();

  // The code disposes: Class B, 30-day window, and a countdown that really ticks.
  await expectRule(page, "B", "30-day correction window");
  const digits = countdownDigits(ruleCard(page, "B"));
  const before = await digits.innerText();
  await expect.poll(() => digits.innerText(), { timeout: 2500 }).not.toBe(before);

  // Log it: it lands on the timeline and survives a reload (IndexedDB).
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();
  const entry = page.getByRole("article").filter({ hasText: "Leak" });
  await expect(entry).toHaveCount(1);
  await expect(entry.getByText("Class B")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("article").filter({ hasText: "Leak" })).toHaveCount(1);

  // Issue page: evidence + follow-up.
  await page.getByRole("article").filter({ hasText: "Leak" }).getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: /Leak/ })).toBeVisible();
  await page.getByLabel(/Add a follow-up/).fill("still dripping");
  await page.getByRole("button", { name: "Add follow-up" }).click();
  await expect(page.getByText("still dripping", { exact: true })).toBeVisible();

  // Notice: PDF download (non-empty %PDF) then the Spanish toggle.
  await page.goto("/notice");
  await expect(page.getByRole("heading", { name: "Notice of Conditions Requiring Repair" })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const pdf = readFileSync(await download.path());
  expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  expect(pdf.length).toBeGreaterThan(20 * 1024);

  await page.getByRole("button", { name: "Español" }).click();
  await expect(page.getByRole("heading", { name: "Aviso de condiciones que requieren reparación" })).toBeVisible();
});
