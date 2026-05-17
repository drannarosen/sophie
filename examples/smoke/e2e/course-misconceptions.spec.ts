import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const MISCONCEPTIONS_URL = "/misconceptions";

/**
 * PR-C3 — `<CourseMisconceptions />` on `/misconceptions`.
 *
 * Covers TDD test list row T39 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke target ships two misconceptions as of Intervention PR-γ:
 *
 *  1. `spoiler-alerts.mdx` → `<Callout variant="misconception"
 *     title="Misconception Alert">` (length="long", anchor
 *     `misconception-alert`). Original PR-C3 smoke seed.
 *  2. `misconception-fixture.mdx` → `<Aside kind="misconception"
 *     name="universe-with-a-center">` (length="short", anchor
 *     `universe-with-a-center`). Added by Intervention PR-γ as the
 *     pairing target for two literature-grounded interventions.
 *
 * The tests below pin each entry individually so future additions
 * to either chapter don't cascade-break the suite; the test bodies
 * scope to a specific entry via its content, not via positional
 * `.first()` / `.nth()` queries.
 *
 * Per decision #12 (length-based visual distinction), the
 * `<CourseMisconceptions />` template emits a `--long` modifier
 * class for Callout-sourced (long) misconceptions, `--short` for
 * Aside-sourced (brief) ones.
 */

test.describe("PR-C3: <CourseMisconceptions /> on /misconceptions", () => {
  test("T39: renders the page with both course misconceptions", async ({
    page,
  }) => {
    await page.goto(MISCONCEPTIONS_URL);
    const block = page.locator("[data-sophie-course-misconceptions]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-misconceptions__term");
    // Two misconceptions:
    //   1. Callout-sourced "Misconception Alert" (spoiler-alerts) —
    //      anchor `misconception-alert` slugified from the title.
    //      Rendered as the dt's DOM id.
    //   2. Aside-sourced (misconception-fixture, added by Intervention
    //      PR-γ) — anchor `misc-1` from the auto-counter per
    //      ChapterMisconceptions convention. The `name="universe-with-a-center"`
    //      attribute is metadata for graph-edges, NOT the anchor.
    //
    // The user-visible <dt> text is the entry's *label* (Callout's
    // `title` for long; "Misconception (brief)" default for short
    // when no `label` attr is supplied — which is the fixture's
    // case). Pin by anchor id selector rather than text — robust
    // to label-text changes.
    await expect(terms).toHaveCount(2);
    await expect(page.locator("dt#misconception-alert")).toHaveCount(1);
    await expect(page.locator("dt#misc-1")).toHaveCount(1);
  });

  test("Callout-sourced entry carries the `length: 'long'` modifier class on both <dt> and <dd>", async ({
    page,
  }) => {
    // PR-C3 design decision #12: visual distinction by length —
    // `--long` for Callout-sourced (the source primitive is a
    // full-width block), `--short` for Aside-sourced (compact/
    // marginal). Pin to the Callout-sourced entry by its title
    // text so adding more misconceptions doesn't move .first()'s
    // target.
    await page.goto(MISCONCEPTIONS_URL);
    const calloutTerm = page
      .locator(".sophie-course-misconceptions__term")
      .filter({ hasText: "Misconception Alert" });
    await expect(calloutTerm).toHaveClass(
      /sophie-course-misconceptions__term--long/
    );
    // The matching <dd> is the term's sibling. Use `xpath` instead
    // of an index-based locator so adding more entries doesn't
    // shift the lookup.
    const calloutBody = calloutTerm.locator("xpath=following-sibling::dd[1]");
    await expect(calloutBody).toHaveClass(
      /sophie-course-misconceptions__body--long/
    );
    await expect(calloutTerm).not.toHaveClass(
      /sophie-course-misconceptions__term--short/
    );
    await expect(calloutBody).not.toHaveClass(
      /sophie-course-misconceptions__body--short/
    );
  });

  test("Aside-sourced entry carries the `length: 'short'` modifier class on both <dt> and <dd>", async ({
    page,
  }) => {
    // Symmetric assertion for the Aside-sourced entry added by
    // Intervention PR-γ. The misconception-fixture chapter binds
    // `<Aside kind="misconception" name="universe-with-a-center">`
    // without an explicit `label`, so the rendered `<dt>` text falls
    // back to "Misconception (brief)" (the default short-form
    // label per ChapterMisconceptions). The anchor is `misc-1`
    // (auto-counter; the Aside's `name` attr is metadata, not the
    // anchor). Pin by the `--short` modifier class to find the
    // Aside-sourced entry — only one exists on the page.
    await page.goto(MISCONCEPTIONS_URL);
    const asideTerm = page.locator(
      ".sophie-course-misconceptions__term.sophie-course-misconceptions__term--short"
    );
    await expect(asideTerm).toHaveCount(1);
    const asideBody = asideTerm.locator("xpath=following-sibling::dd[1]");
    await expect(asideBody).toHaveClass(
      /sophie-course-misconceptions__body--short/
    );
    await expect(asideTerm).not.toHaveClass(
      /sophie-course-misconceptions__term--long/
    );
    await expect(asideBody).not.toHaveClass(
      /sophie-course-misconceptions__body--long/
    );
  });

  test("Callout-sourced entry has a back-link to the chapter anchor", async ({
    page,
  }) => {
    // Anchor derivation: explicit `id` absent on the Callout, so
    // the extractor slugifies the title "Misconception Alert" →
    // `misconception-alert`. Back-link target:
    // `/chapters/spoiler-alerts#misconception-alert`.
    await page.goto(MISCONCEPTIONS_URL);
    // Pin to the Callout-sourced entry via its anchor id so
    // additions to the misconceptions index don't shift `.first()`.
    const backlink = page.locator(
      "#misconception-alert + dd .sophie-course-misconceptions__backlink a"
    );
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
