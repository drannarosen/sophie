import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR-C3 — `<ChapterKeyInsights />` on the smoke chapter.
 *
 * Covers TDD test list row T40 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * **The active assertion in this file is a regression check**, not
 * an exercise of `<ChapterKeyInsights />` itself. Mirrors the
 * PR-C2 `chapter-equations.spec.ts` pattern: the smoke chapter
 * (`spoiler-alerts.mdx`) does NOT include
 * `<ChapterKeyInsights chapter="spoiler-alerts" />` inline —
 * adding a chapter-end key-insight summary is a content authoring
 * decision per the design doc's "Out of scope" section, not a
 * platform PR.
 *
 * The active test below verifies that the chapter's two
 * `<Aside kind="key-insight">` blocks (lines 419 + 471 in the
 * source MDX) still render via the existing PR-6 `<Aside>`
 * primitive after the PR-C3 extractor changes. Sort/render
 * behavior of `<ChapterKeyInsights>` itself is exercised
 * indirectly by `<CourseKeyInsights>` on `/key-insights` (same
 * data shape; see `course-key-insights.spec.ts`).
 */

test.describe("PR-C3: <ChapterKeyInsights /> on the smoke chapter", () => {
  test("both <Aside kind='key-insight'> source blocks still render (no PR-C2 regression)", async ({
    page,
  }) => {
    // Regression check: the PR-C3 `extractKeyInsights` extractor
    // (Task 6) reads `<Aside kind="key-insight">` nodes from the
    // MDX AST. The Aside primitive's runtime rendering is
    // independent of the extractor; this test ensures the source
    // primitive still emits its `[data-sophie-aside]` element with
    // the correct `data-aside-kind` discriminator after the
    // schema extension (AsideKind gains "misconception" but
    // "key-insight" is unchanged).
    await page.goto(CHAPTER_URL);
    const keyInsightAsides = page.locator(
      "[data-sophie-aside][data-aside-kind='key-insight']"
    );
    await expect(keyInsightAsides).toHaveCount(2);
  });

  test.skip("T40: <ChapterKeyInsights chapter='spoiler-alerts'> renders the chapter's key-insights in appearance order", () => {
    // The smoke chapter does NOT include
    // `<ChapterKeyInsights chapter="spoiler-alerts" />`. Adding
    // an inline orientation/summary block of key-insights is a
    // content-authoring decision, not a platform-PR scope. Sort/
    // render behavior is exercised on `/key-insights` via
    // `<CourseKeyInsights />` (see `course-key-insights.spec.ts`).
    // Unskip when the smoke chapter adds an inline
    // `<ChapterKeyInsights />` block for visual verification.
  });
});
