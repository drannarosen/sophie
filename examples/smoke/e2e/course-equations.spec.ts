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
 * The smoke target ships three registry entries (Batch 6):
 *   - inverse-square-law
 *   - orbital-mass
 *   - wiens-law
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
    // Three registry entries in examples/smoke/src/content/equations/.
    await expect(terms).toHaveCount(3);
    await expect(block).toContainText("Inverse-Square Law");
    await expect(block).toContainText(/Wien.s Law/);
    await expect(block).toContainText("Circular Orbit Mass Law");
  });

  test("default order is alphabetical by title", async ({ page }) => {
    await page.goto(EQUATIONS_URL);
    const titles = await page
      .locator(".sophie-course-equations__title")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    // Alphabetical: Circular Orbit Mass Law, The Inverse-Square Law,
    // Wien's Law (string-localeCompare order; "The " sorts as 'T').
    expect(titles[0]).toBe("Circular Orbit Mass Law");
    expect(titles[1]).toBe("The Inverse-Square Law");
    expect(titles[2]).toMatch(/^Wien.s Law$/);
  });

  test("each entry carries a backlink to its registry route", async ({
    page,
  }) => {
    await page.goto(EQUATIONS_URL);
    const backlinks = page.locator(".sophie-course-equations__backlink a");
    await expect(backlinks).toHaveCount(3);
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    // Sorted by title (alphabetical); backlinks match the sort order.
    expect(hrefs).toEqual([
      "/equations/orbital-mass",
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
