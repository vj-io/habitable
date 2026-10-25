import { expect, test } from "@playwright/test";
import corpus from "../src/lib/law/corpus.json";
import { confirmProposal, ruleCard, sheet, snapSample, startDemo } from "./helpers";

// "Ask the law". The e2e server runs with blank AI keys, so a real question gets the search-only answer;
// the AI answer is mocked at /api/ask with quotes cut from the real corpus text.
const CHIP = "How cold is too cold at night?";
const heat = corpus.find((p) => p.id === "hmc-27-2029-a")!;
const NIGHT = "between the hours of ten p.m. and six a.m., a temperature of at least sixty-two degrees Fahrenheit";
const SEASON = "During the period from October first through May thirty-first";
const claim = (sentence: string, quote: string) => {
  const start = heat.text.indexOf(quote);
  return { sentence, passageId: heat.id, quote, start, end: start + quote.length };
};
const passages = [{ ...heat, marks: [] }];

test("with no AI configured, an example question shows the closest law text, labelled as a search", async ({ page }) => {
  await page.goto("/ask");
  await expect(page.getByText("Not legal advice.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: CHIP }).click();
  await expect(page.getByRole("heading", { name: "Closest law text" })).toBeVisible();
  await expect(page.getByText("search only · no AI")).toBeVisible();
  await expect(page.getByText(/No AI is set up here/)).toBeVisible();
  const law = page.getByRole("link", { name: /§27-2029\(a\) · Minimum temperature to be maintained/ });
  await expect(law).toHaveAttribute("href", /^https:\/\/www\.nyc\.gov\/assets\/buildings\/pdf\/HousingMaintenanceCode\.pdf#page=\d+$/);
  // The question's words are highlighted in the passages.
  await expect(page.locator("mark", { hasText: /^temperature$/i }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue(CHIP);
});

test("verified quotes render with their stamp and section link, and the dropped count shows", async ({ page }) => {
  await page.route("**/api/ask", (route) =>
    route.fulfill({
      json: {
        mode: "answer",
        model: "mock",
        dropped: 2,
        blocked: 0,
        passages,
        claims: [
          claim("At night the heat must keep your home at 62°F or more.", NIGHT),
          claim("This applies from October 1 through May 31.", SEASON),
        ],
      },
    }),
  );
  await page.goto("/ask");
  await page.getByRole("textbox", { name: "Your question" }).fill("How warm must it be at night?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();

  const answer = page.getByRole("region", { name: "What the law text says" });
  await expect(answer.getByText("At night the heat must keep your home at 62°F or more.")).toBeVisible();
  await expect(answer.locator("blockquote").first()).toContainText(NIGHT);
  await expect(answer.getByText("Quote checked")).toHaveCount(2);
  await expect(answer.getByRole("link", { name: "§27-2029(a) ↗" }).first()).toHaveAttribute("href", heat.url);
  await expect(answer.getByText("2 sentences dropped — their quotes weren't in the law text.")).toBeVisible();
  // The passages the AI saw are one tap away, with the quoted words highlighted.
  await answer.getByText("Show the 1 passage the AI was given").click();
  await expect(answer.locator("mark", { hasText: SEASON })).toBeVisible();
});

test("nothing verified says so plainly", async ({ page }) => {
  await page.route("**/api/ask", (route) => route.fulfill({ json: { mode: "not_found", dropped: 1, blocked: 0, passages, claims: [] } }));
  await page.goto("/ask");
  await page.getByRole("button", { name: CHIP }).click();
  await expect(page.getByRole("heading", { name: "I couldn't find that in the law text I have." })).toBeVisible();
  await expect(page.getByText("1 sentence dropped — its quote wasn't in the law text.")).toBeVisible();
});

test("the rules card links to a question about its rule", async ({ page }) => {
  await startDemo(page);
  await snapSample(page, "leak-ceiling");
  await confirmProposal(page);
  await sheet(page).getByRole("button", { name: "No, it's a stain" }).click();
  const link = ruleCard(page, "B").getByRole("link", { name: "Ask about this rule →" });
  await link.click();
  await expect(page).toHaveURL(/\/ask\?q=/);
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue("What does the law say about leak? (NYC Admin. Code §27-2005(a), §27-2026)");
});

test("a ?q= link prefills the question, and the footer links to the page", async ({ page }) => {
  await page.goto("/ask?q=What%20does%20%C2%A727-2017.3%20say%3F");
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue("What does §27-2017.3 say?");
  await page.goto("/next-steps");
  await page.getByRole("contentinfo").getByRole("link", { name: "Ask the law" }).click();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ask the law");
});
