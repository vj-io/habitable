import { expect, test, type Locator, type Page } from "@playwright/test";
import corpus from "../src/lib/law/corpus.json";
import { addToLog, confirmProposal, sheet, snapSample, startDemo } from "./helpers";

// Desktop layouts: from lg (1024px) the inner pages open into two columns inside the header's 1100px column;
// below lg they stay one column in the same order. The phone project runs this file; widths are set per check.
const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };

const box = async (loc: Locator) => (await loc.boundingBox())!;
const right = async (loc: Locator) => {
  const b = await box(loc);
  return b.x + b.width;
};

async function noOverflow(page: Page) {
  // scrollWidth vs clientWidth: innerWidth hides overflow under mobile emulation.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
}

/** A page's content starts where the wordmark starts, and (wide) reaches the header's right edge. */
async function alignedWithWordmark(page: Page, first: Locator) {
  const wordmark = await box(page.getByRole("link", { name: "Habitable", exact: true }).first());
  expect(Math.abs((await box(first)).x - wordmark.x)).toBeLessThanOrEqual(1);
}

async function logLeak(page: Page) {
  await snapSample(page, "leak-ceiling");
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "No, it's a stain" }).click();
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();
}

/** `a` is in a column to the left of `b` (when wide) or above it (on a phone). */
async function sideBySide(a: Locator, b: Locator) {
  expect(await right(a)).toBeLessThanOrEqual((await box(b)).x);
}
async function stacked(a: Locator, b: Locator) {
  const [ba, bb] = [await box(a), await box(b)];
  expect(ba.y + ba.height).toBeLessThanOrEqual(bb.y + 1);
}
/** Two columns start on the same line. */
async function sameTop(a: Locator, b: Locator) {
  expect(Math.abs((await box(a)).y - (await box(b)).y)).toBeLessThanOrEqual(1);
}

test("/notice: the form beside the preview from lg, the preview under the form on a phone", async ({ page }) => {
  await startDemo(page);
  await logLeak(page);
  await page.goto("/notice");
  const preview = page.getByRole("region", { name: "Notice preview" });
  const form = page.getByRole("group", { name: "Notice language" });
  await expect(preview).toBeVisible();

  await page.setViewportSize(PHONE);
  await stacked(form, preview);
  await noOverflow(page);

  await page.setViewportSize(WIDE);
  await sideBySide(form, preview);
  await alignedWithWordmark(page, page.getByRole("heading", { level: 1 }));
  expect(await right(preview)).toBeGreaterThan(WIDE.width - 200); // the preview reaches the header's right edge
  // Download sits under the preview, in the same column.
  const download = page.getByRole("button", { name: "Download PDF" });
  expect((await box(download)).y).toBeGreaterThan((await box(preview)).y + (await box(preview)).height - 1);
  expect(Math.abs((await box(download)).x - (await box(preview)).x)).toBeLessThan(2);
  await noOverflow(page);
});

test("/notice: the preview column is pinned only when it fits the viewport", async ({ page }) => {
  await startDemo(page);
  await logLeak(page);
  await page.goto("/notice");
  const column = page.getByRole("region", { name: "Notice preview" }).locator("xpath=..");
  const position = () => column.evaluate((el) => getComputedStyle(el).position);

  await page.setViewportSize(WIDE); // the preview (one problem with a photo) is taller than 900px
  await expect.poll(position).toBe("static");
  await page.setViewportSize({ width: 1440, height: 2400 });
  await expect.poll(position).toBe("sticky");
  await page.setViewportSize(PHONE);
  await expect.poll(position).toBe("static");
});

test("/landlord: the record on the left, how it's connected and counted on the right", async ({ page }) => {
  await startDemo(page);
  await page.goto("/landlord");
  const glance = page.getByRole("region", { name: "The record at a glance" });
  const links = page.getByRole("region", { name: "How these buildings are connected" });
  const method = page.getByRole("region", { name: "How it's counted" });
  await expect(method).toBeVisible({ timeout: 20_000 });

  await page.setViewportSize(PHONE);
  await stacked(glance, links);
  await stacked(links, method);
  await noOverflow(page);

  await page.setViewportSize(WIDE);
  await sideBySide(glance, links);
  await sameTop(glance, links);
  await stacked(links, method);
  await alignedWithWordmark(page, page.getByRole("heading", { level: 1 }));
  expect(await right(links)).toBeGreaterThan(WIDE.width - 200);
  // "Also on the record" stays in the left column, under the other record sections.
  await stacked(page.getByRole("region", { name: "Most open Class C violations" }), page.getByRole("region", { name: "Also on the record" }));
  expect(await right(page.getByRole("region", { name: "Also on the record" }))).toBeLessThanOrEqual((await box(links)).x);
  await noOverflow(page);
});

test("/heat: the form on the left, the readings on the right, the rules under the form", async ({ page }) => {
  await startDemo(page);
  await page.goto("/heat");
  await page.getByRole("button", { name: "Add sample readings" }).click();
  await expect(page.getByRole("article")).toHaveCount(5);
  const form = page.getByRole("region", { name: "Log a reading" });
  const readings = page.getByRole("region", { name: "Your readings" });
  const rules = page.getByRole("region", { name: /The rules/ });

  await page.setViewportSize(PHONE);
  await stacked(form, readings);
  await stacked(readings, rules);
  await noOverflow(page);

  await page.setViewportSize(WIDE);
  await sideBySide(form, readings);
  await sameTop(form, readings);
  await stacked(form, rules);
  expect(await right(rules)).toBeLessThanOrEqual((await box(readings)).x);
  await alignedWithWordmark(page, page.getByRole("heading", { level: 1 }));
  await noOverflow(page);
});

const heat = corpus.find((p) => p.id === "hmc-27-2029-a")!;
const quote = "During the period from October first through May thirty-first";
const start = heat.text.indexOf(quote);

test("/ask: question and answer on the left, the passages used and the law-text note on the right", async ({ page }) => {
  await page.route("**/api/ask", (route) =>
    route.fulfill({
      json: {
        mode: "answer",
        model: "mock",
        dropped: 0,
        blocked: 0,
        passages: [{ ...heat, marks: [] }],
        claims: [{ sentence: "This applies from October 1 through May 31.", passageId: heat.id, quote, start, end: start + quote.length }],
      },
    }),
  );
  await page.goto("/ask");
  await page.getByRole("textbox", { name: "Your question" }).fill("When does heat season run?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  const answer = page.getByRole("region", { name: "What the law text says" });
  await expect(answer).toBeVisible();
  const passages = page.locator("details");
  const note = page.getByRole("heading", { name: "What the law text is" });

  // Phone: the passages fold out under the answer, closed; the note comes last.
  await page.setViewportSize(PHONE);
  await expect(page.getByText("Show the 1 passage the AI was given")).toBeVisible();
  expect(await passages.evaluate((d: HTMLDetailsElement) => d.open)).toBe(false);
  await stacked(answer, passages);
  await stacked(passages, note);
  await noOverflow(page);

  // Wide: the passages are open beside the answer, with their own heading; the note is under them.
  await page.setViewportSize(WIDE);
  await expect(page.getByRole("heading", { name: "The passages the AI was given" })).toBeVisible();
  await expect(page.getByText("Show the 1 passage the AI was given")).toBeHidden();
  await expect(passages.locator("mark", { hasText: quote })).toBeVisible();
  await sideBySide(answer, passages);
  await stacked(passages, note);
  await alignedWithWordmark(page, page.getByRole("heading", { level: 1 }));
  await noOverflow(page);
});

test("the issue page: evidence left, the rule beside it, message and manage under the evidence", async ({ page }) => {
  await startDemo(page);
  await logLeak(page);
  await page.getByRole("article").filter({ hasText: "Leak" }).getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: /Leak/ })).toBeVisible();
  const photo = page.getByRole("img", { name: /Photo of the problem/ });
  const rule = page.getByRole("main").getByLabel("Rules table result: Class B");
  const followUps = page.getByRole("heading", { name: "Follow-ups" });
  const manage = page.getByRole("region", { name: "Manage this issue" });

  await page.setViewportSize(PHONE);
  await stacked(photo, rule);
  await stacked(rule, manage);
  await noOverflow(page);

  await page.setViewportSize(WIDE);
  await sideBySide(photo, rule);
  expect(await right(manage)).toBeLessThanOrEqual((await box(rule)).x); // under the evidence, not under the rule
  expect((await box(followUps)).x).toBeGreaterThanOrEqual((await box(rule)).x - 1); // follow-ups stay with the rule
  await alignedWithWordmark(page, page.getByRole("heading", { level: 1, name: /Leak/ }));
  await noOverflow(page);
});
