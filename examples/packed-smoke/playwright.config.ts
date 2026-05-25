import { defineConfig, devices } from "@playwright/test";

// PR-D1 packed-smoke Playwright config. Uses port 4322 to avoid
// colliding with the in-workspace smoke target on 4321 (lets the two
// run in parallel locally during sanity checks).
//
// `astro preview` (vs. `astro dev`) is the only mode that exercises
// the built `dist/` from each tarballed @sophie/* package — which is
// the whole point of this consumer.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4322",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    command: "pnpm preview --port 4322",
    url: "http://localhost:4322",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
