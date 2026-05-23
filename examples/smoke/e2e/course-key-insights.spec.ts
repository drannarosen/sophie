import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const KEY_INSIGHTS_URL = "/key-insights";

/**
 * PR-C3 — `<CourseKeyInsights />` on `/key-insights`.
 *
 * Covers TDD test list row T37 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke target ships three key-insight entries across two
 * chapters:
 *  - `spectra-and-composition.mdx` (ASTR 201 M2-L3 pilot): one
 *    titled `<Aside kind="key-insight" title="Why is Hα red?">`
 *    (anchor `why-is-h-alpha-red`, slugified from title).
 *  - `spoiler-alerts.mdx`: two untitled `<Aside kind="key-insight">`
 *    blocks. Without a `title` attribute, the extractor auto-
 *    generates anchors `ki-1` and `ki-2` (per PR-C3 design
 *    decision #7 — title OPTIONAL on key-insight Asides; auto-
 *    anchor pattern `ki-{n}` when title and id are both absent;
 *    canonical anchor-prefix table in
 *    `@sophie/core/schema/pedagogy-index.ts`).
 *
 * `<CourseKeyInsights />` ships with appearance-only sort (no
 * `order` prop, per decision #9 — untitled key-insights can't
 * alphabetize). Sort is chapter slug asc, then per-chapter source-
 * walk order — so the pilot chapter (spectra…) renders before
 * spoiler-alerts.
 */

test.describe("PR-C3: <CourseKeyInsights /> on /key-insights", () => {
  test("T37: renders the page with all key-insight entries from the smoke target", async ({
    page,
  }) => {
    await page.goto(KEY_INSIGHTS_URL);
    const block = page.locator("[data-sophie-course-key-insights]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-key-insights__term");
    await expect(terms).toHaveCount(3);
  });

  test("each entry has a <dt> (title or 'Key insight' fallback) + <dd> body", async ({
    page,
  }) => {
    // M2-L3 pilot's key-insight is titled ("Why is Hα red?" —
    // KaTeX-rendered); spoiler-alerts ki-1/ki-2 are untitled and
    // render the "Key insight" fallback per the CourseKeyInsights
    // template (`entry.title ?? "Key insight"`).
    await page.goto(KEY_INSIGHTS_URL);
    const terms = await page
      .locator(".sophie-course-key-insights__term")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    // The titled entry includes KaTeX-rendered "Hα"; match
    // tolerantly (the visible glyph is "Hα" but raw textContent may
    // surface MathML/annotation copy).
    expect(terms[0]).toMatch(/Why is\s+H.*red\?/);
    expect(terms[1]).toBe("Key insight");
    expect(terms[2]).toBe("Key insight");

    // <dt id="why-is-h-alpha-red"> + <dt id="ki-1"> + <dt id="ki-2"> —
    // the CourseKeyInsights template uses the entry's anchor directly
    // as the DOM id (slugified title for the pilot entry; the auto
    // `ki-{n}` shape for the untitled ones). The chapter back-link
    // targets resolve to the same ids on each chapter's route via
    // ChapterKeyInsights.
    await expect(page.locator("#why-is-h-alpha-red")).toBeAttached();
    await expect(page.locator("#ki-1")).toBeAttached();
    await expect(page.locator("#ki-2")).toBeAttached();

    // Bodies contain the source prose; verify a fragment of each
    // (smart-quote tolerance via regex — the source MDX has
    // straight apostrophes that remark may turn curly).
    const bodies = page.locator(".sophie-course-key-insights__body");
    await expect(bodies).toHaveCount(3);
    await expect(bodies.first()).toContainText(/656.*nm.*deep red light/);
    await expect(bodies.nth(1)).toContainText(
      /Color isn.t decoration .* encoded physics/
    );
    await expect(bodies.nth(2)).toContainText(
      /Every distance method in astronomy ultimately rests on geometric parallax/
    );
  });

  test("each entry has a back-link to the chapter anchor", async ({ page }) => {
    await page.goto(KEY_INSIGHTS_URL);
    const backlinks = page.locator(".sophie-course-key-insights__backlink a");
    await expect(backlinks).toHaveCount(3);
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    expect(hrefs).toEqual([
      "/units/spectra-and-composition/reading#why-is-h-alpha-red",
      "/units/spoiler-alerts/reading#ki-1",
      "/units/spoiler-alerts/reading#ki-2",
    ]);
  });

  test("clicking a back-link navigates to the chapter URL with the anchor hash", async ({
    page,
  }) => {
    await page.goto(KEY_INSIGHTS_URL);
    const firstBacklink = page
      .locator(".sophie-course-key-insights__backlink a")
      .first();
    await firstBacklink.click();
    await expect(page).toHaveURL(
      /\/units\/spectra-and-composition\/reading#why-is-h-alpha-red$/
    );
  });

  test("/key-insights is axe-clean", async ({ page }) => {
    await page.goto(KEY_INSIGHTS_URL);
    const results = await new AxeBuilder({ page })
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
