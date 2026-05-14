import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const MISCONCEPTIONS_URL = "/misconceptions";

/**
 * PR-C3 — `<CourseMisconceptions />` on `/misconceptions`.
 *
 * Covers TDD test list row T39 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke chapter (`spoiler-alerts.mdx`) ships one
 * `<Callout variant="misconception" title="Misconception Alert">`
 * block (line 1210, migrated from `variant="caution"` in Task 12).
 * The extractor (PR-C3 `extractMisconceptions`, Task 8) walks BOTH
 * `<Aside kind="misconception">` and `<Callout variant="misconception">`
 * source nodes; for this Callout-sourced entry, the length
 * discriminator is `"long"` and the anchor is slugified from the
 * title: `misconception-alert`.
 *
 * Per decision #12 (length-based visual distinction), the
 * `<CourseMisconceptions />` template emits a `--long` modifier
 * class on both `<dt>` and `<dd>` for callout-sourced (long)
 * misconceptions, distinct from `--short` for Aside-sourced
 * (brief) ones. This route exercises the long path.
 */

test.describe("PR-C3: <CourseMisconceptions /> on /misconceptions", () => {
  test("T39: renders the page with the single migrated misconception entry", async ({
    page,
  }) => {
    await page.goto(MISCONCEPTIONS_URL);
    const block = page.locator("[data-sophie-course-misconceptions]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-misconceptions__term");
    await expect(terms).toHaveCount(1);
    await expect(terms.first()).toContainText("Misconception Alert");
  });

  test("entry carries the `length: 'long'` modifier class on both <dt> and <dd>", async ({
    page,
  }) => {
    // PR-C3 design decision #12: visual distinction by length —
    // `--long` for Callout-sourced (the source primitive is a
    // full-width block), `--short` for Aside-sourced (compact/
    // marginal). The migrated misconception in the smoke chapter
    // is Callout-sourced, so both <dt> and <dd> get the `--long`
    // modifier class.
    await page.goto(MISCONCEPTIONS_URL);
    const term = page.locator(".sophie-course-misconceptions__term").first();
    await expect(term).toHaveClass(/sophie-course-misconceptions__term--long/);
    const body = page.locator(".sophie-course-misconceptions__body").first();
    await expect(body).toHaveClass(/sophie-course-misconceptions__body--long/);
    // `--short` shouldn't appear on either element (the smoke
    // chapter has zero Aside-sourced misconceptions in v1).
    await expect(term).not.toHaveClass(
      /sophie-course-misconceptions__term--short/
    );
    await expect(body).not.toHaveClass(
      /sophie-course-misconceptions__body--short/
    );
  });

  test("entry has a back-link to the chapter anchor", async ({ page }) => {
    // Anchor derivation: explicit `id` absent on the Callout, so
    // the extractor slugifies the title "Misconception Alert" →
    // `misconception-alert`. Back-link target:
    // `/chapters/spoiler-alerts#misconception-alert`.
    await page.goto(MISCONCEPTIONS_URL);
    const backlink = page
      .locator(".sophie-course-misconceptions__backlink a")
      .first();
    await expect(backlink).toBeAttached();
    await expect(backlink).toHaveAttribute(
      "href",
      "/chapters/spoiler-alerts#misconception-alert"
    );
    // The <dt> on the course route uses the entry's anchor directly
    // as its DOM id (the anchor is the slugified title, no extra
    // prefix). The chapter back-link target resolves to the same id
    // on the chapter route via ChapterMisconceptions.
    await expect(page.locator("#misconception-alert")).toBeAttached();
  });

  test("/misconceptions is axe-clean", async ({ page }) => {
    await page.goto(MISCONCEPTIONS_URL);
    const results = await new AxeBuilder({ page })
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
