import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const EQUATIONS_URL = "/equations";

/**
 * PR-C2 — `<CourseEquations />` on `/equations`.
 *
 * Covers TDD test list rows T20 + T22 from the PR-C2 design doc
 * (`docs/plans/2026-05-13-pr-c2-equations-design.md`). T20 (smoke
 * target build succeeds) is implicit — Playwright runs against the
 * built static target via `astro preview` (see `playwright.config.ts`);
 * the page loading at all proves T20.
 *
 * The smoke target ships three `<KeyEquation>` blocks: two in
 * `spoiler-alerts.mdx` (`inverse-square-law` Eq. 1, `wiens-law` Eq. 2)
 * and one in `wiens-law-fixture.mdx` (`wiens-law-smoke` Eq. 1 — the
 * EquationBiography PR-γ smoke fixture that exercises every biography
 * child end-to-end). `<CourseEquations />` is configured with the
 * default `order="chapter"` (per PR-C2 design decision #7: equation
 * lookup is topic/chapter-anchored — diverges from
 * `<CourseGlossary />`). Chapter sort is by slug, so `spoiler-alerts`
 * entries appear before `wiens-law-fixture` entries.
 *
 * Note on `order="alphabetical"` (the second half of T22 in the
 * design doc): there's no URL toggle for sort order on the shipped
 * `/equations` route, so the alphabetical variant is not e2e-testable
 * without adding a fixture page. Default chapter-order is the
 * shipped contract; that's what this spec covers.
 */

test.describe("PR-C2: <CourseEquations /> on /equations", () => {
  test("renders the page with both equation entries (T20 + T22)", async ({
    page,
  }) => {
    await page.goto(EQUATIONS_URL);
    const block = page.locator("[data-sophie-course-equations]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-equations__term");
    await expect(terms).toHaveCount(3);
    await expect(block).toContainText("Inverse-Square Law");
    await expect(block).toContainText(/Wien.s Law/);
    await expect(block).toContainText(/biography smoke fixture/);
  });

  test("default order is chapter-order (slug asc, then number asc per chapter)", async ({
    page,
  }) => {
    // PR-C2 design decision #7: `<CourseEquations />` default is
    // chapter-order (slug asc, then number asc within chapter).
    // Post-PR-γ ordering:
    //   spoiler-alerts:   inverse-square-law (Eq. 1) → wiens-law (Eq. 2)
    //   wiens-law-fixture: wiens-law-smoke (Eq. 1)
    await page.goto(EQUATIONS_URL);
    const numbers = await page
      .locator(".sophie-course-equations__number")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    expect(numbers).toEqual(["Eq. 1", "Eq. 2", "Eq. 1"]);

    const titles = await page
      .locator(".sophie-course-equations__title")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    expect(titles[0]).toBe("The Inverse-Square Law");
    // Smart-quote: source MDX `Wien's Law` renders with a curly
    // apostrophe (U+2019) via remark; tolerate either via regex.
    expect(titles[1]).toMatch(/^Wien.s Law$/);
    expect(titles[2]).toMatch(/^Wien.s Law \(biography smoke fixture\)$/);
  });

  test("each entry carries a back-link to its source chapter anchor", async ({
    page,
  }) => {
    await page.goto(EQUATIONS_URL);
    const backlinks = page.locator(".sophie-course-equations__backlink a");
    await expect(backlinks).toHaveCount(3);
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    expect(hrefs).toEqual([
      "/chapters/spoiler-alerts#inverse-square-law",
      "/chapters/spoiler-alerts#wiens-law",
      "/chapters/wiens-law-fixture#wiens-law-smoke",
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
