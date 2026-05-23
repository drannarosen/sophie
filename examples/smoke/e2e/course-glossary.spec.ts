import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const GLOSSARY_URL = "/glossary";
const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * PR-C1 — `<CourseGlossary />` on `/glossary`.
 *
 * The course-wide glossary is auto-generated from the build-time
 * pedagogy index (ADR 0038): every `<Aside kind="definition">`
 * across every chapter aggregates here, alphabetical, with
 * back-links to the canonical source chapter + anchor.
 *
 * The smoke target ships 36 definition asides across two chapters
 * (15 in `spoiler-alerts.mdx` per `docs/plans/2026-05-13-pr-c1-glossary-index-design.md`,
 * plus 21 in the `spectra-and-composition.mdx` ASTR 201 M2-L3 pilot).
 */

test.describe("PR-C1: <CourseGlossary /> on /glossary", () => {
  test("lists every definition across the textbook", async ({ page }) => {
    await page.goto(GLOSSARY_URL);
    const terms = page.locator(".sophie-course-glossary__term");
    await expect(terms).toHaveCount(36);
  });

  test("renders terms in alphabetical order", async ({ page }) => {
    await page.goto(GLOSSARY_URL);
    const labels = await page
      .locator(".sophie-course-glossary__term")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  test("each entry carries a back-link to the source chapter anchor", async ({
    page,
  }) => {
    await page.goto(GLOSSARY_URL);
    const backlinks = page.locator(".sophie-course-glossary__backlink a");
    await expect(backlinks).toHaveCount(36);
    // Every back-link href hits a /units/.../reading#... pattern.
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    for (const href of hrefs) {
      expect(href).toMatch(/^\/units\/.+\/reading#.+$/);
    }
  });

  test("clicking a back-link navigates to the chapter aside anchor", async ({
    page,
  }) => {
    await page.goto(GLOSSARY_URL);
    const standardCandle = page
      .locator(".sophie-course-glossary__backlink a")
      .filter({ has: page.locator("code", { hasText: "spoiler-alerts" }) })
      .first();
    await standardCandle.click();
    await expect(page).toHaveURL(/\/units\/spoiler-alerts\/reading#/);
  });

  test("/glossary is axe-clean", async ({ page }) => {
    await page.goto(GLOSSARY_URL);
    const results = await new AxeBuilder({ page })
      .exclude("astro-island") // hydration internals
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("chapter route stays separate — anchors in /glossary jump in-page on /units/spoiler-alerts/reading", async ({
    page,
  }) => {
    // Round-trip: chapter has the matching anchor element so back-link
    // doesn't 404 + scrolls to the canonical aside.
    await page.goto(`${CHAPTER_URL}#standard-candle`);
    const aside = page.locator("#standard-candle");
    await expect(aside).toBeAttached();
  });
});
