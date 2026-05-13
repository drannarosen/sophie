import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR 5 — `<ViewModeToggle>` (Default / Focused / Wide) +
 * keyboard shortcut.
 *
 * Per docs/plans/2026-05-12-view-modes-design.md, the toggle:
 *
 *  - Cycles `default → focused → wide → default`.
 *  - Persists stored value to localStorage key `sophie:view-mode`.
 *  - Reflects stored value onto `data-view-mode` on `<html>`
 *    (no resolve indirection — stored === attribute value).
 *  - Syncs across tabs via the `storage` event.
 *  - Cycles on the global `v` keyboard shortcut, with
 *    input-focus guard.
 *
 * Layout orchestration is CSS-only: `data-view-mode='focused'|
 * 'wide'` collapses both side columns regardless of `sidebarPref`,
 * widens the content cap, and hides the per-element sidebar
 * toggle. `sidebarPref` is NOT touched — cycling back to Default
 * reveals the sidebar in its last state.
 */

test.describe("PR 5: ViewModeToggle on the smoke chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("toggle renders in the top bar with default aria-label", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "default");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
  });

  test("click cycles default → focused → wide → default", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });

    // Initial state.
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "default");
    await expect(toggle).toHaveAccessibleName(/view: default/i);

    // Click 1 → focused.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "focused");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );
    await expect(toggle).toHaveAccessibleName(/view: focused/i);

    // Click 2 → wide.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "wide");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    await expect(toggle).toHaveAccessibleName(/view: wide/i);

    // Click 3 → back to default.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "default");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    await expect(toggle).toHaveAccessibleName(/view: default/i);

    const stored = await page.evaluate(() =>
      localStorage.getItem("sophie:view-mode")
    );
    expect(stored).toBe("default");
  });
});
