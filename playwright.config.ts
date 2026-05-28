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
  // 2026-05-21: enabled parallel execution within and across spec
  // files. The single shared webServer is read-only (preview of a
  // pre-built static site), each test gets its own browser context
  // (cookies/localStorage isolated), and the CLI specs that spawn
  // their own subprocesses use distinct ports (4510, 4511) that
  // can't collide with the shared webServer on 4321. Workers=4 is
  // a measured local default; CI gets 2 for memory-bound runners.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  projects: [
    {
      // Fast specs at full parallelism. The axe-analyzing specs carry
      // the @axe tag and are routed to the `axe` project below, so they
      // are excluded here to avoid running twice.
      name: "chromium",
      use: devices["Desktop Chrome"],
      grepInvert: /@axe/,
    },
    {
      // axe-core `.analyze()` is CPU-heavy. `dependencies: ["chromium"]`
      // defers this project until the fast specs finish, so heavy axe
      // runs never compete with the rest of the suite for CPU (the
      // contention that produced the flake tax). `fullyParallel: false`
      // serializes tests within each axe file on top of that isolation.
      // New axe specs opt in by tagging their describe `{ tag: "@axe" }`.
      name: "axe",
      use: devices["Desktop Chrome"],
      grep: /@axe/,
      fullyParallel: false,
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: "pnpm --filter smoke preview --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
