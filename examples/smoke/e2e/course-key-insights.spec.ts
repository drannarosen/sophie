import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const KEY_INSIGHTS_URL = "/key-insights";

/**
 * PR-C3 — `<CourseKeyInsights />` on `/key-insights`.
 *
 * Covers TDD test list row T37 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke chapter (`spoiler-alerts.mdx`) ships two
 * `<Aside kind="key-insight">` blocks (lines 419 + 471 in the
 * source). Neither has a `title` attribute, so the extractor
 * auto-generates anchors `key-insight-1` and `key-insight-2`
 * (per PR-C3 design decision #7 — title OPTIONAL on key-insight
 * Asides; auto-anchor pattern `key-insight-{n}` when title and
 * id are both absent).
 *
 * `<CourseKeyInsights />` ships with appearance-only sort (no
 * `order` prop, per decision #9 — untitled key-insights can't
 * alphabetize). Source-walk order is preserved within a chapter
 * by the extractor; this spec verifies the rendered list reflects
 * that.
 */

test.describe("PR-C3: <CourseKeyInsights /> on /key-insights", () => {
  test("T37: renders the page with both key-insight entries from the smoke chapter", async ({
    page,
  }) => {
    await page.goto(KEY_INSIGHTS_URL);
    const block = page.locator("[data-sophie-course-key-insights]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-key-insights__term");
    await expect(terms).toHaveCount(2);
  });

  test("each entry has a <dt> (title or 'Key insight' fallback) + <dd> body", async ({
    page,
  }) => {
    // Neither smoke-chapter key-insight has a `title` prop, so
    // both <dt>s render the "Key insight" fallback per the
    // CourseKeyInsights template (`entry.title ?? "Key insight"`).
    await page.goto(KEY_INSIGHTS_URL);
    const terms = await page
      .locator(".sophie-course-key-insights__term")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    expect(terms).toEqual(["Key insight", "Key insight"]);

    // <dt id="ki-key-insight-1"> + <dt id="ki-key-insight-2">
    // confirm the auto-anchor pattern AND the "ki-" id-prefix
    // shape used for in-page linking on the course route.
    await expect(page.locator("#ki-key-insight-1")).toBeAttached();
    await expect(page.locator("#ki-key-insight-2")).toBeAttached();

    // Bodies contain the source prose; verify a fragment of each
    // (smart-quote tolerance via regex — the source MDX has
    // straight apostrophes that remark may turn curly).
    const bodies = page.locator(".sophie-course-key-insights__body");
    await expect(bodies).toHaveCount(2);
    await expect(bodies.first()).toContainText(
      /Color isn.t decoration .* encoded physics/
    );
    await expect(bodies.nth(1)).toContainText(
      /Every distance method in astronomy ultimately rests on geometric parallax/
    );
  });

  test("each entry has a back-link to the chapter anchor", async ({ page }) => {
    await page.goto(KEY_INSIGHTS_URL);
    const backlinks = page.locator(".sophie-course-key-insights__backlink a");
    await expect(backlinks).toHaveCount(2);
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    expect(hrefs).toEqual([
      "/chapters/spoiler-alerts#key-insight-1",
      "/chapters/spoiler-alerts#key-insight-2",
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
    await expect(page).toHaveURL(/\/chapters\/spoiler-alerts#key-insight-1$/);
  });

  test("/key-insights is axe-clean", async ({ page }) => {
    await page.goto(KEY_INSIGHTS_URL);
    const results = await new AxeBuilder({ page })
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
