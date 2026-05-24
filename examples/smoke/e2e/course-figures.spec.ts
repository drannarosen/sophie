import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const FIGURES_URL = "/library/figures";

/**
 * PR-C3 — `<CourseFigures />` on `/library/figures`.
 *
 * Covers TDD test list row T38 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke fixture now ships TWO chapters with `<Figure name="...">`
 * registry-mode blocks: `spectra-and-composition.mdx` (the ASTR 201
 * M2-L3 pilot, 15 figures) and `spoiler-alerts.mdx` (19 figures).
 * Each is captured by the PR-C3 `extractFigures` extractor as a
 * `FigureUsageEntry` with per-chapter sequential `number: 1..N` and
 * anchor `fig-{slugify(name)}-{number}`. Default sort is chapter slug
 * asc then per-chapter number asc, so the page renders
 * `spectra-and-composition` figs 1..15 first (s-p-e-c < s-p-o-i),
 * then `spoiler-alerts` figs 1..19 — 34 entries total.
 *
 * Each `<li>` carries the `Fig. N` prefix, an `<img>` from the
 * registry, a caption (registry default or per-usage override),
 * AND a back-link to the chapter anchor — per the two-tier
 * figures model in decision #3 + the `<CourseFigures>` template.
 */

test.describe("PR-C3: <CourseFigures /> on /library/figures", () => {
  test("T38: renders all 34 figures across both smoke chapters with registry-resolved <img> tags", async ({
    page,
  }) => {
    await page.goto(FIGURES_URL);
    const block = page.locator("[data-sophie-course-figures]");
    await expect(block).toBeAttached();
    const items = block.locator(".sophie-course-figures__item");
    await expect(items).toHaveCount(34);

    // Every figure should resolve via the registry — no
    // "Missing figure:" fallback markers should be present.
    await expect(block.locator(".sophie-course-figures__missing")).toHaveCount(
      0
    );

    // 34 <img> elements, one per item, each with non-empty src
    // and alt (the FigureRegistryEntry schema enforces
    // NonEmptyString for both).
    const images = block.locator(".sophie-course-figures__image");
    await expect(images).toHaveCount(34);
    await expect(images.first()).toHaveAttribute("src", /\S/);
    await expect(images.first()).toHaveAttribute("alt", /\S/);
  });

  test("default sort is chapter-order: spectra-and-composition 1..15, then spoiler-alerts 1..19", async ({
    page,
  }) => {
    // PR-C3 design decision #9: default `order="chapter"` sorts
    // by chapter slug asc, then per-chapter `number` asc. With
    // two chapters, the `Fig. N` prefix resets when the slug
    // transitions (spectra-and-composition → spoiler-alerts).
    // The number prefix `Fig. N` is rendered by
    // `.sophie-course-figures__number`.
    await page.goto(FIGURES_URL);
    const numbers = await page
      .locator(".sophie-course-figures__number")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    const spectra = Array.from({ length: 15 }, (_, i) => `Fig. ${i + 1}`);
    const spoiler = Array.from({ length: 19 }, (_, i) => `Fig. ${i + 1}`);
    expect(numbers).toEqual([...spectra, ...spoiler]);
  });

  test("each entry has a caption (registry default or override)", async ({
    page,
  }) => {
    await page.goto(FIGURES_URL);
    // 34 figcaptions, all non-empty. Smart-quote tolerance: if
    // any registry caption contains an apostrophe, remark may
    // render it curly — we only assert non-empty here, not exact
    // text, so the smart-quote pass is opaque to this test.
    const captions = page.locator(".sophie-course-figures__caption");
    await expect(captions).toHaveCount(34);
    const texts = await captions.evaluateAll((els) =>
      els.map((el) => (el.textContent ?? "").trim())
    );
    for (const text of texts) {
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test("each entry carries a back-link to its chapter anchor", async ({
    page,
  }) => {
    await page.goto(FIGURES_URL);
    const backlinks = page.locator(".sophie-course-figures__backlink a");
    await expect(backlinks).toHaveCount(34);
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    // Spot-check: the two `spoiler-alerts` figures cross-referenced
    // by `<FigureRef>` in that chapter (verified in
    // figure-ref.spec.ts). With sort order spectra(1..15) +
    // spoiler(1..19), spoiler-alerts fig 4 lands at index 18 and
    // fig 16 lands at index 30.
    expect(hrefs[18]).toBe(
      "/units/spoiler-alerts/reading#fig-cosmic-distance-ladder-4"
    );
    expect(hrefs[30]).toBe("/units/spoiler-alerts/reading#fig-decoder-ring-16");
    // All hrefs share the chapter prefix and the `fig-` anchor
    // prefix (the extractor's anchor shape is invariant —
    // F5 invariant). Now spans two chapters.
    for (const href of hrefs) {
      expect(href).toMatch(
        /^\/units\/(spectra-and-composition|spoiler-alerts)\/reading#fig-/
      );
    }
  });

  test("/library/figures is axe-clean", async ({ page }) => {
    await page.goto(FIGURES_URL);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
