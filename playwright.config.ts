import { defineConfig, devices } from "@playwright/test";

// PW_PORT lets parallel checkouts (worktrees) run the suite side by side without sharing a server.
const PORT = Number(process.env.PW_PORT ?? 3210);
// The bundled headless shell is not installed everywhere; the full "chromium" channel is. CI can use
// the Playwright default with PW_CHANNEL=default (or an empty value).
const channel = process.env.PW_CHANNEL ?? "chromium";
const chromium = { browserName: "chromium" as const, ...(channel && channel !== "default" ? { channel } : {}) };

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // The doodle UI (SVG filters, spring-in cards) is CPU-heavy; 8 parallel browsers push journeys past 30 s.
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...chromium, viewport: { width: 375, height: 812 }, hasTouch: true } },
    // Desktop only repeats the smoke test; the journey is phone-first.
    { name: "desktop", testMatch: /smoke\.spec\.ts/, use: { ...chromium, viewport: { width: 1280, height: 900 } } },
    // Other engines: Safari's engine on an iPhone profile, and Firefox at phone width. Needs
    // `npx playwright install webkit firefox`; skip them with --project=phone --project=desktop.
    { name: "iphone-webkit", testIgnore: /api\.spec\.ts/, use: { ...devices["iPhone 14"] } },
    { name: "firefox", testIgnore: /api\.spec\.ts/, use: { browserName: "firefox", viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // Live AI must never be called from tests: blank every key the classifier looks at. Demo samples
    // answer from saved responses; a real photo gets the "AI unavailable" fallback. (Next keeps an
    // already-set variable over .env.local, and "" counts as set.) If you reuse an already-running
    // server, start it without these keys too.
    env: {
      GOOGLE_GENERATIVE_AI_API_KEY: "",
      AI_GATEWAY_API_KEY: "",
      VERCEL_OIDC_TOKEN: "",
      // Production builds refuse to sign receipts without a secret; CI has no .env.local.
      RECEIPT_SECRET: process.env.RECEIPT_SECRET || "e2e-only-secret",
    },
  },
});
