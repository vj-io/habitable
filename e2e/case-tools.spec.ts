import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { addToLog, confirmProposal, sheet, snapSample, startDemo } from "./helpers";

/** Demo building -> the leaking-ceiling sample logged as a Class B issue (30-day window). */
async function logLeak(page: Page) {
  await startDemo(page);
  await snapSample(page, "leak-ceiling");
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "No, it's a stain" }).click();
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole("article").filter({ hasText: "Leak" })).toHaveCount(1);
}

const menu = (page: Page) => page.getByRole("button", { name: "Menu" });
const leakEntry = (page: Page) => page.getByRole("article").filter({ hasText: "Leak" });

/** Menu -> "Back up my case" (then closes the menu); returns the downloaded file's name and path. */
async function backUp(page: Page) {
  await menu(page).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Back up my case" }).click()]);
  await expect(page.getByRole("status").filter({ hasText: /^Saved habitable-case-/ })).toBeVisible();
  await page.keyboard.press("Escape");
  return { name: download.suggestedFilename(), path: await download.path() };
}

test("back up the case, delete it, restore it from the Welcome screen", async ({ page }) => {
  await logLeak(page);
  const file = await backUp(page);
  expect(file.name).toMatch(/^habitable-case-\d{4}-\d{2}-\d{2}\.json$/);
  const saved = JSON.parse(readFileSync(file.path, "utf8"));
  expect(saved).toMatchObject({ app: "habitable", kind: "case-backup", version: 1 });
  expect(saved.issues).toHaveLength(1);
  expect(saved.issues[0].evidence.photo).toMatch(/^data:image\/jpeg;base64,/); // the photo travels inside the file

  // Delete the case: back to the Welcome screen.
  await menu(page).click();
  await page.getByRole("button", { name: "Delete my case" }).click();
  await page.getByRole("button", { name: "Delete it all" }).click();
  await expect(page.getByRole("heading", { name: "Start your case" })).toBeVisible();

  // A file that isn't a backup says so and changes nothing.
  await page.getByLabel(/Have a backup file/).setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from('{"hello":"world"}') });
  await expect(page.getByRole("alert").filter({ hasText: "doesn't look like a Habitable backup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start your case" })).toBeVisible();

  // The real backup brings the case and the issue back, and they survive a reload.
  await page.getByLabel(/Have a backup file/).setInputFiles(file.path);
  await expect(page.getByRole("button", { name: "Snap a problem" })).toBeVisible();
  await expect(leakEntry(page)).toHaveCount(1);
  await expect(leakEntry(page).getByText("Class B")).toBeVisible();
  await page.reload();
  await expect(leakEntry(page)).toHaveCount(1);

  // The restored issue still opens with its photo and evidence.
  await leakEntry(page).getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: /Leak/ })).toBeVisible();
  await expect(page.getByAltText(/Photo of the problem/)).toBeVisible();
});

test("restoring over an existing case asks first", async ({ page }) => {
  await logLeak(page);
  const file = await backUp(page);

  // Log a second problem so the current case differs from the backup.
  await snapSample(page, "mold-bathroom");
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: /Less than 10 sq ft/ }).click();
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole("article")).toHaveCount(2);

  // A broken file is refused inside the menu.
  await menu(page).click();
  await page.getByLabel("Restore from a backup").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("not json at all") });
  await expect(page.getByRole("alert").filter({ hasText: "doesn't look like a Habitable backup" })).toBeVisible();

  // A good one asks; "Keep my case" leaves both issues.
  await page.getByLabel("Restore from a backup").setInputFiles(file.path);
  await expect(page.getByText("Replace your case with this backup?")).toBeVisible();
  await expect(page.getByText(/1 issue/)).toBeVisible();
  await page.getByRole("button", { name: "Keep my case" }).click();
  await expect(page.getByText("Replace your case with this backup?")).toBeHidden();
  await expect(page.getByRole("article")).toHaveCount(2);

  // Yes replaces: only the backed-up issue is left.
  await page.getByLabel("Restore from a backup").setInputFiles(file.path);
  await page.getByRole("button", { name: "Yes, replace it" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(leakEntry(page)).toHaveCount(1);
});

test("calendar reminder: .ics with the right name and summary, only while the issue is open", async ({ page }) => {
  await logLeak(page);
  await leakEntry(page).getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: /Leak/ })).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Add to my calendar" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^habitable-repair-by-leak-\d{4}-\d{2}-\d{2}\.ics$/);
  const ics = readFileSync(await download.path(), "utf8");
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  const text = ics.replace(/\r\n /g, "");
  expect(text).toContain("\r\nSUMMARY:Repair-by date: Leak — 618 West 136th Street 4B (demo)\r\n");
  expect(text).toMatch(/\r\nDTSTART;VALUE=DATE:\d{8}\r\n/);
  expect(text).toContain("TRIGGER:-PT15H");
  expect(text).toContain("Class B");

  // Fixed issues have no countdown, so no reminder.
  await page.getByRole("button", { name: "Mark fixed" }).click();
  await page.getByRole("button", { name: "Yes, it's fixed" }).click();
  await expect(page.getByRole("button", { name: "Add to my calendar" })).toHaveCount(0);
});

test("/verify: one tap checks a real receipt, one changed character breaks it", async ({ page }) => {
  await page.goto("/verify");
  const fingerprint = page.getByLabel("Photo fingerprint (SHA-256)");
  await expect(fingerprint).toHaveValue("");
  await expect(page.getByRole("button", { name: "Change one character" })).toHaveCount(0);

  await page.getByRole("button", { name: "Try a real receipt" }).click();
  await expect(page.getByText("Valid", { exact: true })).toBeVisible();
  await expect(fingerprint).toHaveValue(/^[0-9a-f]{64}$/);
  await expect(page.getByLabel("Received at")).toHaveValue(/^\d{4}-\d{2}-\d{2}T/);
  await expect(page.getByLabel("Receipt code")).toHaveValue(/^[0-9a-f]{12}$/);
  const before = await fingerprint.inputValue();

  await page.getByRole("button", { name: "Change one character" }).click();
  await expect(page.getByText("Not valid", { exact: true })).toBeVisible();
  const after = await fingerprint.inputValue();
  expect(after).toHaveLength(64);
  expect([...after].filter((c, i) => c !== before[i])).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Change one character" })).toHaveCount(0);
});

test("/notice warms the PDF fonts before anyone taps Download", async ({ page }) => {
  await logLeak(page);
  const fontRequest = page.waitForRequest((r) => r.url().includes("/fonts/archivo-latin-800-normal.woff"), { timeout: 15_000 });
  await page.goto("/notice");
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  await fontRequest;
});
