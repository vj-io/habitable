import { expect, test, type Page, type Route } from "@playwright/test";
import { SAMPLE, addToLog, confirmProposal, sheet, startDemo } from "./helpers";

// Message coach on the issue page. The e2e server has every AI key blanked, so the real route answers with the
// template; the AI path is exercised by mocking /api/coach (the browser re-checks whatever comes back).

type Cls = "B" | "C";

/** Demo building -> the leaking-ceiling sample logged (B: a stain, 30 days; C: dripping, 24 hours) -> its issue page. */
async function openLeak(page: Page, cls: Cls, note?: string) {
  await startDemo(page);
  await page.getByRole("button", { name: "Snap a problem" }).click();
  await expect(sheet(page)).toBeVisible();
  if (note) await sheet(page).getByLabel(/One line about it/).fill(note);
  await sheet(page).getByRole("button", { name: SAMPLE["leak-ceiling"] }).click();
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: cls === "B" ? "No, it's a stain" : "Yes, it's dripping or flowing" }).click();
  await addToLog(page);
  await expect(sheet(page)).toBeHidden();
  await page.getByRole("article").filter({ hasText: "Leak" }).getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: /Leak/ })).toBeVisible();
}

const coachOf = (page: Page) => page.getByRole("region", { name: "Draft a message to your landlord or super" });
const draftOf = (page: Page) => coachOf(page).getByTestId("coach-draft");
const write = (page: Page) => coachOf(page).getByRole("button", { name: /^(Write my message|Draft again)$/ }).click();

const DATE = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("template path: facts from the log in marker, three channels, tone and language", async ({ page }) => {
  await openLeak(page, "B");
  const coach = coachOf(page);
  await expect(coach).toBeVisible();
  await expect(coach.getByText("Nothing written yet")).toBeVisible();

  await write(page);
  await expect(draftOf(page)).toHaveAttribute("data-source", "template");
  await expect(coach.getByText("Template · no AI")).toBeVisible();
  await expect(coach.getByText(/No AI is set up here/)).toBeVisible();
  await expect(coach.getByText("Facts from your log")).toBeVisible();
  const marked = await draftOf(page).locator("mark").allInnerTexts();
  expect(marked).toEqual(
    expect.arrayContaining(["4B (demo)", "618 West 136th Street, Manhattan, NY 10031", "leak / water damage", "Class B (hazardous)", "30 days", "1"]),
  );
  expect(marked.filter((m) => DATE.test(m))).toHaveLength(2); // first documented, repair-by
  const text = await draftOf(page).innerText();
  expect(text).toContain("HPD's published rules put it in Class B (hazardous)");
  expect(text).not.toContain("{{");
  expect(await noOverflow(page)).toBe(true);

  // Email: a subject and paragraphs.
  await coach.getByRole("tab", { name: "Email" }).click();
  await expect(coach.getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "true");
  await expect(coach.getByText("Nothing written yet")).toBeVisible();
  await write(page);
  await expect(draftOf(page)).toContainText("Subject");
  await expect(draftOf(page)).toContainText("Repair request: leak / water damage, 4B (demo)");
  await expect(draftOf(page)).toContainText("NYC Admin. Code §27-2005(a), §27-2026");
  await expect(coach.getByRole("link", { name: "Open in Mail" })).toBeVisible();

  // Call script: 6 to 8 bullet lines.
  await coach.getByRole("tab", { name: "Call script" }).click();
  await write(page);
  await expect(draftOf(page).getByRole("listitem").first()).toBeVisible();
  const lines = await draftOf(page).getByRole("listitem").count();
  expect(lines).toBeGreaterThanOrEqual(6);
  expect(lines).toBeLessThanOrEqual(8);
  await expect(coach.getByRole("link", { name: /Open in/ })).toHaveCount(0);

  // Firm and Spanish are their own drafts; the earlier ones are still there when you go back.
  await coach.getByRole("tab", { name: "Text" }).click();
  await expect(draftOf(page)).toContainText("Hi, this is the tenant in");
  await coach.getByText("Firm", { exact: true }).click();
  await write(page);
  await expect(draftOf(page)).toContainText("I'm asking for it to be fixed by");
  await coach.getByText("Español", { exact: true }).click();
  await write(page);
  await expect(draftOf(page)).toContainText("Hola, soy inquilino/a de");
  await expect(draftOf(page)).toContainText("Clase B (peligrosa)");
  await expect(draftOf(page)).toContainText("30 días");
  await expect(draftOf(page)).toHaveAttribute("lang", "es");
  await coach.getByText("Polite", { exact: true }).click();
  await coach.getByText("English", { exact: true }).click();
  await expect(draftOf(page)).toContainText("Hi, this is the tenant in");
  expect(await noOverflow(page)).toBe(true);
});

test("a Class C 24-hour problem gets a same-day ask and no repair-by date", async ({ page }) => {
  await openLeak(page, "C");
  await write(page);
  const text = await draftOf(page).innerText();
  expect(text).toContain("Class C (immediately hazardous)");
  expect(text).toContain("24 hours");
  expect(text).toContain("It can't wait, so could you or the super reply today");
  // Only the first-documented date is a fact here; there is no repair-by date to ask for.
  expect((await draftOf(page).locator("mark").allInnerTexts()).filter((m) => DATE.test(m))).toHaveLength(1);
});

test("tabs work from the keyboard, targets are 44px, dark theme fits", async ({ page }) => {
  await openLeak(page, "B");
  const coach = coachOf(page);
  await coach.getByRole("tab", { name: "Text" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(coach.getByRole("tab", { name: "Email" })).toBeFocused();
  await expect(coach.getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(coach.getByRole("tab", { name: "Call script" })).toBeFocused();

  await write(page);
  const targets = [...(await coach.getByRole("tab").all()), ...(await coach.getByRole("radio").all()), coach.getByRole("button", { name: "Draft again" }), coach.getByRole("button", { name: "Copy" })];
  for (const t of targets) {
    const box = await t.evaluate((el) => {
      const r = (el.closest("label") ?? el).getBoundingClientRect();
      return { h: r.height };
    });
    expect(box.h).toBeGreaterThanOrEqual(43.5);
  }

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(draftOf(page)).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

/** Answers /api/coach like the real route would when the AI wrote `draft` (a text, email subject+body, or call lines). */
async function mockAi(page: Page, answer: (channel: string) => { subject?: string; body: string }, seen: unknown[] = []) {
  await page.route("**/api/coach", async (route: Route) => {
    const body = route.request().postDataJSON() as { channel: string };
    seen.push(body);
    await route.fulfill({ json: { source: "ai", model: "mock-model", draft: answer(body.channel) } });
  });
}

const AI_TEXT = "Hi, I'm in {{UNIT}}. The {{PROBLEM}} needs fixing and it is day {{DAYS}}. Could someone come by {{REPAIR_BY}}?";

test("AI path: the AI's words in violet pencil, the code's facts in marker; the AI is never sent more than the facts; Copy and sms/mailto", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const seen: { facts: Record<string, unknown>; channel: string; tone: string; lang: string; note?: string }[] = [];
  await mockAi(
    page,
    (channel) =>
      channel === "email"
        ? { subject: "Repair needed: {{PROBLEM}}", body: "Hello,\n\nThe {{PROBLEM}} in {{UNIT}} needs fixing." }
        : { body: AI_TEXT },
    seen,
  );
  await openLeak(page, "B");
  const coach = coachOf(page);
  await write(page);

  await expect(draftOf(page)).toHaveAttribute("data-source", "ai");
  await expect(coach.getByText("AI wrote the words")).toBeVisible();
  await expect(coach.getByText(/Violet pencil = the AI's words \(mock-model\)/)).toBeVisible();
  await expect(draftOf(page).locator("span.text-violet-ink").first()).toContainText("Hi, I'm in");
  expect(await draftOf(page).locator("mark").allInnerTexts()).toEqual(["4B (demo)", "leak / water damage", "1", expect.stringMatching(DATE)]);
  expect(seen).toHaveLength(1);
  expect(seen[0]).toMatchObject({ channel: "text", tone: "polite", lang: "en", facts: { unit: "4B (demo)", hazardClass: "B", days: 1, followUps: 0, photos: 1, fixed: false } });
  expect("note" in seen[0]).toBe(false); // the demo issue has no note

  // Copy puts the finished text, facts filled in, on the clipboard.
  await coach.getByRole("button", { name: "Copy" }).click();
  await expect(coach.getByRole("button", { name: "Copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/^Hi, I'm in 4B \(demo\)\. The leak \/ water damage needs fixing and it is day 1\. Could someone come by [A-Z][a-z]{2} \d{1,2}, \d{4}\?$/);

  // "Open in Messages" hands the same text to the phone's own app.
  const sms = await coach.getByRole("link", { name: "Open in Messages" }).getAttribute("href");
  expect(sms).toMatch(/^sms:\?&body=/);
  expect(decodeURIComponent(sms!.replace("sms:?&body=", ""))).toBe(copied);

  // Email: subject and body go to Mail separately.
  await coach.getByRole("tab", { name: "Email" }).click();
  await write(page);
  await expect(draftOf(page)).toContainText("Repair needed: leak / water damage");
  const mail = new URL((await coach.getByRole("link", { name: "Open in Mail" }).getAttribute("href"))!.replace("mailto:?", "http://x/?"));
  expect(mail.searchParams.get("subject")).toBe("Repair needed: leak / water damage");
  expect(mail.searchParams.get("body")).toBe("Hello,\n\nThe leak / water damage in 4B (demo) needs fixing.");
});

test("the renter's note goes to the route as a note, not as a fact; the facts are exactly the case's facts", async ({ page }) => {
  const seen: { note?: string; facts: Record<string, unknown> }[] = [];
  await mockAi(page, () => ({ body: AI_TEXT }), seen);
  await openLeak(page, "B", "ceiling dripping in the kitchen");
  await write(page);
  expect(seen[0].note).toBe("ceiling dripping in the kitchen");
  expect(Object.keys(seen[0].facts).sort()).toEqual(
    ["address", "citation", "classLabel", "days", "firstDate", "fixed", "followUps", "hazardClass", "photos", "problem", "repairBy", "unit", "window"].sort(),
  );
});

test("a draft with a date the AI invented is never shown: the template is, and says so", async ({ page }) => {
  await mockAi(page, () => ({ body: "The {{PROBLEM}} must be fixed by October 30, or else." }));
  await openLeak(page, "B");
  await write(page);
  await expect(draftOf(page)).toHaveAttribute("data-source", "template");
  await expect(coachOf(page).getByText(/didn't pass our checks/)).toBeVisible();
  await expect(draftOf(page)).not.toContainText("October 30");
});

test("if /api/coach can't be reached the template still appears", async ({ page }) => {
  await page.route("**/api/coach", (route) => route.abort());
  await openLeak(page, "B");
  await write(page);
  await expect(draftOf(page)).toHaveAttribute("data-source", "template");
  await expect(coachOf(page).getByText(/Couldn't reach Habitable/)).toBeVisible();
});

test("a fixed issue has no coach", async ({ page }) => {
  await openLeak(page, "B");
  await expect(coachOf(page)).toBeVisible();
  await page.getByRole("button", { name: "Mark fixed" }).click();
  await page.getByRole("button", { name: "Yes, it's fixed" }).click();
  await expect(coachOf(page)).toHaveCount(0);
});

const FACTS = {
  problem: "leak / water damage",
  hazardClass: "B",
  classLabel: "hazardous",
  window: { days: 30, text: "30 days" },
  firstDate: "Oct 15, 2026",
  repairBy: "Nov 14, 2026",
  citation: "NYC Admin. Code §27-2005(a), §27-2026",
  unit: "4B",
  address: "618 West 136th Street, Manhattan, NY 10031",
  days: 11,
  followUps: 0,
  photos: 1,
  fixed: false,
};

test("/api/coach: no key means a template with placeholders; bad bodies are 400", async ({ request }) => {
  const res = await request.post("/api/coach", { data: { facts: FACTS, channel: "email", tone: "firm", lang: "es" } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.source).toBe("template");
  expect(body.reason).toMatch(/No AI is set up here/);
  expect(body.draft.subject).toBe("Solicitud de reparación: {{PROBLEM}}, {{UNIT}}");
  expect(body.draft.body).toContain("{{ADDRESS}}");

  const bad = (data: unknown) => request.post("/api/coach", { data });
  expect((await bad({})).status()).toBe(400);
  expect((await bad({ facts: FACTS, channel: "fax", tone: "firm", lang: "en" })).status()).toBe(400);
  expect((await bad({ facts: { ...FACTS, address: "x".repeat(300) }, channel: "text", tone: "firm", lang: "en" })).status()).toBe(400);
  expect((await request.post("/api/coach", { headers: { "content-type": "application/json" }, data: "not json" })).status()).toBe(400);
});
