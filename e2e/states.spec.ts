import path from "node:path";
import { expect, test } from "@playwright/test";
import { sheet, startDemo } from "./helpers";

const REAL_PHOTO = path.join(__dirname, "..", "public", "samples", "mold-bathroom.jpg");

/** Pick a file through the sheet's "Choose from library" button (a real file-chooser round trip). */
async function chooseFile(page: import("@playwright/test").Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    sheet(page).getByRole("button", { name: "Choose from library" }).click(),
  ]);
  await chooser.setFiles(file);
}

test("upload states: non-image error, then a real photo falls back to the manual picker", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("button", { name: "Snap a problem" }).click();

  await chooseFile(page, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo") });
  await expect(sheet(page).getByText("That file isn't a photo")).toBeVisible();

  // A real (non-sample) photo takes the live route; with the keys blanked it answers "unavailable".
  await chooseFile(page, REAL_PHOTO);
  await expect(sheet(page).getByText("Pick what it is — the rules still apply.")).toBeVisible();
  await expect(sheet(page).getByRole("button", { name: "Broken lock / door" })).toBeVisible();

  // "Something else" -> not covered -> log it as a note.
  await sheet(page).getByRole("button", { name: "Something else" }).click();
  await sheet(page).getByRole("button", { name: "Log it anyway as a note" }).click();
  await expect(sheet(page)).toBeHidden();
  const note = page.getByRole("article").filter({ hasText: "General note" });
  await expect(note).toHaveCount(1);
  await expect(note.getByText("note", { exact: true })).toBeVisible();
});

test("delete my case returns to the welcome screen", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Delete my case" }).click();
  await page.getByRole("button", { name: "Delete it all" }).click();
  await expect(page.getByRole("heading", { name: "Start your case" })).toBeVisible();
});

test("/notice with no case shows the set-up prompt", async ({ page }) => {
  await page.goto("/notice");
  await expect(page.getByRole("heading", { name: "Set up your case first" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Set up my case" })).toHaveAttribute("href", "/");
});

test("/verify: a signed receipt is valid, a tampered one is NOT VALID", async ({ page, request }) => {
  const sha256 = "ab".repeat(32);
  const res = await request.post("/api/receipt", { data: { sha256 } });
  const { receivedAt, receipt } = (await res.json()) as { receivedAt: string; receipt: string };
  const q = (code: string) => `/verify?${new URLSearchParams({ sha256, receivedAt, receipt: code })}`;

  await page.goto(q(receipt));
  await expect(page.getByText("Valid", { exact: true })).toBeVisible();

  const tampered = receipt.slice(0, -1) + (receipt.endsWith("0") ? "1" : "0");
  await page.goto(q(tampered));
  await expect(page.getByText("Not valid", { exact: true })).toBeVisible();
});

test("/how-it-works renders the cited rules table", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("§27-2017.3").first()).toBeAttached();
});

test("unknown route shows the 404 page", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page isn't on file." })).toBeVisible();
});
