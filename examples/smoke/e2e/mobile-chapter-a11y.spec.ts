import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectChapterA11y } from "./_helpers/axe.ts";

/**
 * Regression guard for WS A — mobile a11y on the shipped
 * `@sophie/astro` ChapterLayout. Tests two fixes together against a
 * minimal `mobile-a11y-fixture` chapter that hosts only display math
 * and a wide `<pre>` block (no tables, no checkboxes, no asides) so
 * the asserts isolate WS A behavior from unrelated pre-existing
 * smoke-content axe violations.
 *
 * Issues:
 *   - #187 — TocDrawer's post-transform bounding box used to push
 *     `body.scrollWidth` past viewport, producing user-visible
 *     horizontal page scroll on narrow viewports. WS A's
 *     `html { overflow-x: clip }` defends the document layer
 *     against any off-canvas drawer / popover / fixed element whose
 *     transform extends past the viewport.
 *   - #192 — `.katex-display` scroll containers were not
 *     keyboard-focusable (axe `scrollable-region-focusable` flagged
 *     at 375 px in the M2-L2 pilot). WS A's
 *     `rehypeKatexDisplayA11y` plugin stamps `tabindex="0"` +
 *     `role="group"` + `aria-label` on every `.katex-display`
 *     emitted by `rehype-katex` at build time.
 *
 * Path under test mirrors the artifact route ADR 0082 injects:
 * `/units/<unit-id>/reading`.
 */
const FIXTURE_URL = "/units/mobile-a11y-fixture/reading";
const MOBILE = { width: 375, height: 812 };

test.describe("WS A — mobile ChapterLayout a11y (issues #187, #192)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize(MOBILE);
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        /* private mode etc. — fine for cold-load */
      }
    });
  });

  test("axe-clean at 375 px on a display-math + wide-<pre> chapter", async ({
    page,
  }) => {
    await page.goto(FIXTURE_URL);
    await expectChapterA11y(page);
  });

  test("no `scrollable-region-focusable` violations on .katex-display", async ({
    page,
  }) => {
    // Scope to .katex-display containers specifically so the assert
    // pinpoints the #192 fix (otherwise a future unrelated regression
    // could mask whether THIS class of violation is closed).
    await page.goto(FIXTURE_URL);
    const results = await new AxeBuilder({ page })
      .include(".katex-display")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, "katex-display axe violations").toEqual([]);
  });

  test("html element carries overflow-x: clip (prevents off-canvas leak)", async ({
    page,
  }) => {
    await page.goto(FIXTURE_URL);
    // CSS-level invariant: the WS A document-layer defense MUST be
    // computed `clip`, not `visible` / `hidden`. `clip` is preferred
    // over `hidden` because it does not create a scroll container,
    // preserving sticky positioning + scroll-snap (the topbar +
    // sidebar both rely on this).
    const overflowX = await page.evaluate(
      () => getComputedStyle(document.documentElement).overflowX
    );
    expect(overflowX, "html { overflow-x } computed value").toBe("clip");
  });

  test("page content stays within viewport at 375 px (no clipped chapter title)", async ({
    page,
  }) => {
    await page.goto(FIXTURE_URL);
    // Assert the chapter title's bounding box lies inside the
    // viewport — mirrors sidebar-initial-state.spec.ts:51-57's
    // pattern so a future grep finds both invariants together.
    const title = page.locator(".sophie-chapter-title__main").first();
    await expect(title).toBeVisible();
    const box = await title.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(MOBILE.width);
    }
  });
});
