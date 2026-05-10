import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 0 Playwright config: drives the smoke target end-to-end.
 *
 * - `webServer` boots `astro preview` against the prebuilt static site.
 *   Preview mode (vs. `astro dev`) avoids dev-toolbar 504s and matches
 *   what CI will run.
 * - Single Chromium project for Phase 0 (matches ADR 0015's lean
 *   choice). Multi-browser sweeps land in a later phase.
 * - axe-core is the a11y assertion (per ADR 0004); the spec imports
 *   `@axe-core/playwright`.
 */
export default defineConfig({
  testDir: "./examples/smoke/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
  webServer: {
    command: "pnpm --filter smoke preview --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
