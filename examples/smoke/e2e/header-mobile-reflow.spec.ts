import { expect, test } from "@playwright/test";

/**
 * B5 (astr201 frontend review, 2026-05-30) regression guard.
 *
 * At phone widths the reading topbar's full search input (~247px) plus
 * the disclosures / view-mode / theme toggles overflowed the viewport;
 * `overflow-x: clip` then silently hid the right-side controls, leaving
 * the theme toggle unreachable. The fix collapses the search trigger to
 * an icon-only button below 600px (textbook-layout.css), freeing room.
 *
 * Asserts the three properties the bug violated: no horizontal overflow,
 * the theme toggle's right edge is inside the viewport, and the search
 * trigger has collapsed (its keyboard-hint `<kbd>` is hidden).
 */
test.describe("Mobile header toolbar reflow (B5)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("theme toggle stays in-viewport; search collapses; no horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/units/spoiler-alerts/reading/");

    const vw = await page.evaluate(() => window.innerWidth);

    // No horizontal scroll — the whole toolbar fits.
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(vw);

    // The theme toggle is fully within the viewport (was off-screen).
    const theme = page.locator(".sophie-theme-toggle");
    await expect(theme).toBeVisible();
    const box = await theme.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(vw);

    // Search collapsed to an icon — the ⌘K hint is hidden at this width.
    await expect(page.locator(".sophie-search-trigger__kbd")).toBeHidden();
  });
});
