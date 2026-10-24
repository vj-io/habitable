import { defineConfig } from "@playwright/test";

const PORT = 3210;
// The bundled headless shell is not installed everywhere; the full "chromium" channel is. CI can use
// the Playwright default with PW_CHANNEL=default (or an empty value).
const channel = process.env.PW_CHANNEL ?? "chromium";

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
    ...(channel && channel !== "default" ? { channel } : {}),
  },
  projects: [
    { name: "phone", use: { viewport: { width: 375, height: 812 }, hasTouch: true } },
    // Desktop only repeats the smoke test; the journey is phone-first.
    { name: "desktop", testMatch: /smoke\.spec\.ts/, use: { viewport: { width: 1280, height: 900 } } },
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
    },
  },
});
