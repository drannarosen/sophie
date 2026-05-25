import { expect, test } from "@playwright/test";

/**
 * PR-D1 regression test (ADR-0082 follow-up + PR #172 review item 2).
 *
 * Asserts that the packed-copy consumer's prod build emits zero
 * React #418 hydration mismatches on a chapter exercising all 5
 * store-backed components. This is the structural defense against
 * the regression class that originally surfaced in astr201's
 * lecture-02 reading page (12 × #418 → 0 via PR #172's useHydrated
 * gate). Workspace-only smoke cannot exercise this code path by
 * construction — pnpm resolves workspace specs to source, not the
 * built dist/ that file:-packed consumers consume.
 */
test("packed-smoke prod build emits zero React #418 hydration mismatches", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && /#418|hydration/i.test(msg.text())) {
      errors.push(msg.text());
    }
  });
  await page.goto("/units/packed-smoke-chapter/reading/");
  // Parallel-hydration-race-safe wait per AGENTS.md SoTA test patterns +
  // expect-poll-count.md canonical pattern doc. All 5 store-backed
  // components must be hydrated (emit data-react-hydrated="true") before
  // the #418 console-error assertion runs; otherwise the test races
  // with hydration and may green-light a real regression.
  await expect
    .poll(async () => page.locator("[data-react-hydrated='true']").count(), {
      timeout: 10_000,
      message: "wait for 5 hydrated store-backed islands",
    })
    .toBeGreaterThan(4);
  expect(errors.filter((e) => /#418|hydration/i.test(e))).toHaveLength(0);
});
