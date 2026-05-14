import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR-C3 — `<ChapterMisconceptions />` on the smoke chapter.
 *
 * Covers TDD test list row T42 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * **The active assertion in this file is a regression check**, not
 * an exercise of `<ChapterMisconceptions />` itself. Mirrors the
 * PR-C2 `chapter-equations.spec.ts` pattern: the smoke chapter
 * does NOT include `<ChapterMisconceptions chapter="spoiler-alerts" />`
 * inline.
 *
 * The active test below verifies that the chapter's single
 * `<Callout variant="misconception" title="Misconception Alert">`
 * block (line 1210 in the source MDX, migrated from
 * `variant="caution"` in Task 12) still renders via the existing
 * `<Callout>` primitive after the PR-C3 schema extension
 * (CalloutVariant gains "misconception"). Sort/render behavior
 * of `<ChapterMisconceptions>` itself is exercised indirectly by
 * `<CourseMisconceptions>` on `/misconceptions` (same data
 * shape; see `course-misconceptions.spec.ts`).
 */

test.describe("PR-C3: <ChapterMisconceptions /> on the smoke chapter", () => {
  test("the migrated <Callout variant='misconception'> still renders (Task 12 + no Callout regression)", async ({
    page,
  }) => {
    // Regression check: the smoke chapter's misconception was
    // migrated from `variant="caution"` to `variant="misconception"`
    // in Task 12. The Callout primitive renders an `<aside
    // role='note'>` with the `aria-label` set to the title. The
    // PR-C3 CalloutVariant extension (adding "misconception")
    // shouldn't perturb the existing rendering pipeline.
    await page.goto(CHAPTER_URL);
    const callout = page.getByRole("note", { name: "Misconception Alert" });
    await expect(callout).toBeAttached();
    // Body text from the migrated callout (line 1213 in the MDX).
    await expect(callout).toContainText(
      /Many imagine astronomers peering through eyepieces/
    );
  });

  test.skip("T42: <ChapterMisconceptions chapter='spoiler-alerts'> renders with length-discriminator class", () => {
    // The smoke chapter does NOT include
    // `<ChapterMisconceptions chapter="spoiler-alerts" />`.
    // Adding an inline chapter-end misconceptions summary is a
    // content-authoring decision, not a platform-PR scope. The
    // length-discriminator class (`__entry--short` vs `--long`,
    // per decision #12) is exercised on `/misconceptions` via
    // `<CourseMisconceptions />` (see
    // `course-misconceptions.spec.ts`). Unskip when the smoke
    // chapter adds an inline `<ChapterMisconceptions />` block.
  });
});
