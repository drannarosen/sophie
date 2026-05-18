import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const EQUATIONS_URL = "/equations";

/**
 * `<CourseEquations />` on `/equations` per ADR 0060.
 *
 * Post-ADR-0060: declaration-driven aggregator. Reads every
 * `EquationEntry` declared in the equation registry
 * (`src/content/equations/*.mdx`), sorts alphabetically by title
 * (per ADR 0038's course-side rule), and renders one `<dt>/<dd>`
 * pair per declaration. Each entry's backlink points at the
 * registry route `/equations/<id>` (no longer at a chapter anchor).
 *
 * The smoke target ships four registry entries:
 *   - inverse-square-law (Batch 6)
 *   - orbital-mass       (Batch 6)
 *   - stefan-boltzmann   (Session-7 B2)
 *   - wiens-law          (Batch 6)
 *
 * The pre-ADR-0060 `wiens-law-smoke` fixture entry is gone (its
 * source chapter was deleted in Batch 6).
 */

test.describe("<CourseEquations /> on /equations (ADR 0060)", () => {
  test("renders the page with all registry equation entries", async ({
    page,
  }) => {
    await page.goto(EQUATIONS_URL);
    const block = page.locator("[data-sophie-course-equations]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-equations__term");
    // Four registry entries in examples/smoke/src/content/equations/.
    await expect(terms).toHaveCount(4);
    await expect(block).toContainText("Inverse-Square Law");
    await expect(block).toContainText(/Wien.s Law/);
    await expect(block).toContainText("Circular Orbit Mass Law");
    await expect(block).toContainText("Stefan-Boltzmann Law");
  });

  test("default order is alphabetical by title", async ({ page }) => {
    await page.goto(EQUATIONS_URL);
    const titles = await page
      .locator(".sophie-course-equations__title")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    // Alphabetical (string-localeCompare): Circular Orbit Mass Law,
    // Stefan-Boltzmann Law, The Inverse-Square Law, Wien's Law.
    // "The " sorts as 'T'; "Stefan-..." sorts as 'S' so it lands between
    // 'C' and 'T'.
    expect(titles[0]).toBe("Circular Orbit Mass Law");
    expect(titles[1]).toBe("Stefan-Boltzmann Law");
    expect(titles[2]).toBe("The Inverse-Square Law");
    expect(titles[3]).toMatch(/^Wien.s Law$/);
  });

  test("each entry carries a backlink to its registry route", async ({
    page,
  }) => {
    await page.goto(EQUATIONS_URL);
    const backlinks = page.locator(".sophie-course-equations__backlink a");
    await expect(backlinks).toHaveCount(4);
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    // Sorted by title (alphabetical); backlinks match the sort order.
    expect(hrefs).toEqual([
      "/equations/orbital-mass",
      "/equations/stefan-boltzmann",
      "/equations/inverse-square-law",
      "/equations/wiens-law",
    ]);
  });

  test("/equations is axe-clean", async ({ page }) => {
    await page.goto(EQUATIONS_URL);
    const results = await new AxeBuilder({ page })
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
