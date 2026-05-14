import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR-C2 — `<ChapterEquations />` on the smoke chapter.
 *
 * Covers TDD test list rows T21 and T23 from the PR-C2 design doc
 * (`docs/plans/2026-05-13-pr-c2-equations-design.md`).
 *
 * **Both T21 and T23 are deliberately `test.skip`'d in this file.**
 * The smoke chapter (`spoiler-alerts.mdx`) does NOT include
 * `<ChapterEquations chapter="spoiler-alerts" />` inline — adding a
 * chapter-end equation summary is a content authoring decision per
 * the design doc's "Out of scope" section, not a platform PR.
 *
 * `<ChapterEquations>`'s sort behavior is exercised indirectly by
 * `<CourseEquations>` on `/equations` (same chapter-scoped collection,
 * same sort logic shape — see `course-equations.spec.ts`). When the
 * smoke chapter eventually includes a `<ChapterEquations />` block
 * for visual verification, unskip these tests.
 *
 * The chapter-route smoke check (both KeyEquation sections still
 * render correctly post-extractor changes — no PR-C1 regression)
 * is the one assertion that's safe to run today.
 */

test.describe("PR-C2: <ChapterEquations /> on the smoke chapter", () => {
  test("both KeyEquation source blocks still render on the chapter route (no PR-C1 regression)", async ({
    page,
  }) => {
    // Sanity check that the extractor changes in Tasks 3+4 haven't
    // perturbed the `<KeyEquation>` source primitive's rendering on
    // the chapter route. Each `<KeyEquation id="...">` emits a
    // `<section id="...">` anchor target for EqRef back-links.
    await page.goto(CHAPTER_URL);
    await expect(page.locator("section#inverse-square-law")).toBeAttached();
    await expect(page.locator("section#wiens-law")).toBeAttached();
  });

  test.skip("T21: <ChapterEquations /> renders the chapter's equations", () => {
    // Smoke chapter does NOT include `<ChapterEquations chapter="spoiler-alerts" />`.
    // Sort/render behavior is exercised on /equations via
    // `<CourseEquations />` (course-equations.spec.ts). Unskip when
    // the smoke chapter adds an inline `<ChapterEquations />`.
  });

  test.skip("T23: <ChapterEquations order='appearance'> renders in source order", () => {
    // Same blocker as T21 — `<ChapterEquations />` is not in the
    // smoke chapter. Sort logic is unit-coverable on the Astro
    // component shape (deferred per project's Astro-no-unit-tests
    // pattern); behavior parity with `<CourseEquations />` makes the
    // /equations e2e the proxy for sort-order correctness.
  });
});
