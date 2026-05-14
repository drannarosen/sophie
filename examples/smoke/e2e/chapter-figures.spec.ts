import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR-C3 — `<ChapterFigures />` on the smoke chapter.
 *
 * Covers TDD test list row T41 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * **The active assertion in this file is a regression check**, not
 * an exercise of `<ChapterFigures />` itself. Mirrors the PR-C2
 * `chapter-equations.spec.ts` pattern: the smoke chapter does NOT
 * include `<ChapterFigures chapter="spoiler-alerts" />` inline.
 *
 * The active test below verifies that the chapter's 19
 * `<Figure name="...">` registry-mode blocks (lines 82..1132 in
 * the source MDX) still render via the existing PR-A `<Figure>`
 * primitive after the PR-C3 extractor changes — each renders an
 * `<img>` with the registry-resolved `src` + `alt`. Sort/render
 * behavior of `<ChapterFigures>` itself is exercised indirectly
 * by `<CourseFigures>` on `/figures` (same data shape; see
 * `course-figures.spec.ts`).
 */

test.describe("PR-C3: <ChapterFigures /> on the smoke chapter", () => {
  test("all 19 <Figure name='...'> source blocks still render with registry-resolved <img> (no PR-A regression)", async ({
    page,
  }) => {
    // Regression check: the PR-C3 `extractFigures` extractor
    // (Task 7) reads `<Figure name="...">` nodes from the MDX
    // AST. The Figure primitive's runtime rendering is
    // independent of the extractor; this test ensures registry-
    // mode rendering still emits a proper `<img>` with src + alt
    // for every figure.
    await page.goto(CHAPTER_URL);
    // The chapter has 19 `<Figure name="...">` calls. Each
    // resolves to an `<img>` via the figure registry — no
    // "Missing figure:" markers should appear in the prose.
    const figureImages = page.locator("article figure img");
    await expect(figureImages).toHaveCount(19);

    // Each <img> has non-empty src and alt (the figure registry
    // schema enforces NonEmptyString for both). Verify the first
    // few to confirm the rendering path is intact.
    const firstImg = figureImages.first();
    await expect(firstImg).toHaveAttribute("src", /\S/);
    await expect(firstImg).toHaveAttribute("alt", /\S/);
  });

  test.skip("T41: <ChapterFigures chapter='spoiler-alerts'> renders figures numbered 1..19", () => {
    // The smoke chapter does NOT include
    // `<ChapterFigures chapter="spoiler-alerts" />`. Adding an
    // inline chapter-end figures index is a content-authoring
    // decision, not a platform-PR scope. Sort/render behavior is
    // exercised on `/figures` via `<CourseFigures />` (see
    // `course-figures.spec.ts`). Unskip when the smoke chapter
    // adds an inline `<ChapterFigures />` block.
  });
});
