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
  await page.waitForLoadState("networkidle");
  expect(errors.filter((e) => /#418|hydration/i.test(e))).toHaveLength(0);
});
