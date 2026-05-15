import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/measuring-the-sky";

/**
 * PR 10 — chapter-print polish.
 *
 * Per docs/plans/2026-05-15-pr-10-print-polish-design.md:
 * - Chrome hidden under @media print.
 * - .sophie-shell collapses to single-column block layout (Wide
 *   override) regardless of <html data-view-mode>.
 * - Interactive components expand to static pedagogy-preserving
 *   form (CollapsibleCard open, Predict answer-space, GlossaryTerm
 *   first-use inline footnote visible).
 * - axe-core passes under media: "print" emulation.
 * - Rendered .sophie-content HTML matches the print snapshot.
 */

test.describe("PR 10: chapter print contract", () => {
  test("chrome hidden + Wide layout under media: print", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });

    await expect(page.locator(".sophie-topbar")).toHaveCSS("display", "none");
    await expect(page.locator(".sophie-sidebar")).toHaveCSS("display", "none");
    await expect(page.locator(".sophie-right")).toHaveCSS("display", "none");
    await expect(page.locator(".sophie-search-trigger")).toHaveCSS(
      "display",
      "none"
    );

    // Wide-layout grid: .sophie-shell becomes block-level with
    // grid-template-columns: none.
    await expect(page.locator(".sophie-shell")).toHaveCSS(
      "grid-template-columns",
      "none"
    );
  });

  test("interactive components expand to static form in print", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });

    // CollapsibleCard: all cards' bodies render as block regardless of
    // [data-state]. (Test asserts the first card on the page.)
    const card = page.locator(".sophie-collapsible-card").first();
    if (await card.count()) {
      await expect(card.locator("[data-state]")).toHaveCSS("display", "block");
    }

    // GlossaryTerm first-use footnote: the first occurrence per slug
    // gets data-first-use="true" + a sibling .sophie-glossary-footnote
    // span which is display:inline under print.
    const firstUse = page
      .locator(".sophie-glossary-term[data-first-use='true']")
      .first();
    if (await firstUse.count()) {
      const footnote = firstUse.locator(".sophie-glossary-footnote");
      await expect(footnote).toHaveCSS("display", "inline");
    }
  });

  test("axe-core passes under media: print", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("rendered .sophie-content HTML matches print snapshot", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });
    const content = await page.locator(".sophie-content").innerHTML();
    expect(content).toMatchSnapshot("smoke-chapter-print.html");
  });
});
