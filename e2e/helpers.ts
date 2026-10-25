import { expect, type Locator, type Page } from "@playwright/test";

/** Button label of each demo sample photo (src/lib/demo/samples.ts), keyed by sample id. */
export const SAMPLE = {
  "leak-ceiling": "Water-stained ceiling tile",
  "mold-bathroom": "Black mold along the tub's edge",
  "cold-radiator": "Old cast-iron radiator, no heat",
  "mice-kitchen": "Mouse caught in a snap trap",
  "broken-lock": "Door with the lock torn out",
  "peeling-paint": "Cracked, peeling paint",
  "ambiguous-stain": "Faint stain where wall meets ceiling",
} as const;
export type SampleId = keyof typeof SAMPLE;

export const sheet = (page: Page) => page.getByRole("dialog", { name: "Snap a problem" });

/** Welcome screen -> demo case file. */
export async function startDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo building", exact: true }).click();
  await expect(page.getByRole("button", { name: "Snap a problem" })).toBeVisible();
}

/** Open the snap sheet and pick a demo sample; resolves once the photo is read (the sheet shows its evidence). */
export async function snapSample(page: Page, id: SampleId) {
  await page.getByRole("button", { name: "Snap a problem" }).click();
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByRole("button", { name: SAMPLE[id] }).click();
}

export const confirmProposal = (page: Page) => sheet(page).getByRole("button", { name: "Yes, that's it" }).click();

/** The rules card (aria-label "Rules table result: Class X"). */
export const ruleCard = (page: Page, cls: "A" | "B" | "C") => sheet(page).getByLabel(`Rules table result: Class ${cls}`);

/** Stamp and window phrase on the rules card. Scrolls first: the stamp animates in on scroll-into-view. */
export async function expectRule(page: Page, cls: "A" | "B" | "C", windowPhrase: string) {
  const card = ruleCard(page, cls);
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByText(`Class ${cls}`).first()).toBeVisible();
  await expect(card.getByText(windowPhrase, { exact: true })).toBeVisible();
}

/** The big mono d/h/m/s digits of a rules card (aria-hidden: the spoken summary only changes each minute). */
export const countdownDigits = (card: Locator) => card.locator('p[aria-hidden="true"].font-mono').first();

export const addToLog = (page: Page) => sheet(page).getByRole("button", { name: "Add to my log" }).click();
