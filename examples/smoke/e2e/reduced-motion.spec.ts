import { expect, test } from "@playwright/test";

/**
 * `prefers-reduced-motion` coverage — closes the gap flagged by the
 * 2026-05-28 platform audit (P2.7). The component CSS implements
 * `@media (prefers-reduced-motion: reduce)` rules (Tabs / Hint / Dropdown
 * / Objective / Solution / Callout / MultiRep / KeyEquation …), but no
 * e2e exercised them — only `colorScheme` and `print` media were
 * emulated. This spec asserts the media query actually toggles motion in
 * the real build, using the Tabs trigger as a representative case.
 *
 * Robustness: rather than pin an exact base value, the test flips
 * `emulateMedia` on a single loaded page and asserts the computed
 * `transition-duration` CHANGES — non-zero under `no-preference`
 * (Tabs.module.css base: `transition: color/border 150ms`), `0s` under
 * `reduce` (the `@media` override: `transition: none`). That proves the
 * media query is wired, independent of the exact base timing.
 */

const READING = "/units/chrome-primitives-demo/reading";

test.describe("prefers-reduced-motion is honored in the build", () => {
  test("Tabs trigger transition collapses to 0s under reduced-motion", async ({
    page,
  }) => {
    await page.goto(READING);
    const tab = page.locator('[data-sophie-tabs] [role="tab"]').first();
    await expect(tab).toBeVisible();

    const durationOf = () =>
      tab.evaluate((el) => getComputedStyle(el as Element).transitionDuration);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    const motionOn = await durationOf();
    expect(motionOn).not.toBe("0s");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const motionReduced = await durationOf();
    expect(motionReduced).toBe("0s");
  });
});
