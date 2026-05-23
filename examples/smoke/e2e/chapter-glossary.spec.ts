import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * PR-C1 — `<ChapterGlossary />` rendered inline in a chapter.
 *
 * The spoiler-alerts chapter places `<ChapterGlossary chapter="spoiler-alerts" />`
 * at the orientation-scan slot (per overview decision #11 — hybrid
 * migration). Each of the chapter's 15 `<Aside kind="definition">`
 * blocks aggregates into the alphabetical list.
 */

test.describe("PR-C1: <ChapterGlossary /> on the smoke chapter", () => {
  test("renders the orientation block with all chapter definitions", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const block = page.locator("[data-sophie-chapter-glossary]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-chapter-glossary__term");
    await expect(terms).toHaveCount(15);
  });

  test("renders terms alphabetically by default", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    const labels = await page
      .locator(".sophie-chapter-glossary__term")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  test("each entry has a stable `gloss-<slug>` id for in-page linking", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const standardCandle = page.locator("#gloss-standard-candle");
    await expect(standardCandle).toBeAttached();
    await expect(standardCandle).toHaveText(/standard candle/i);
  });

  test("inline definition asides remain rendered alongside the glossary block", async ({
    page,
  }) => {
    // Hybrid migration (decision #11) — same source, two views.
    // The glossary block aggregates them; the inline asides anchor
    // their canonical position in the prose.
    await page.goto(CHAPTER_URL);
    const definitionAsides = page.locator(
      "[data-sophie-aside][data-aside-kind='definition']"
    );
    await expect(definitionAsides).toHaveCount(15);
  });

  test("chapter glossary is axe-clean", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    const results = await new AxeBuilder({ page })
      .include("[data-sophie-chapter-glossary]")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
