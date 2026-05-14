import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const FIGURES_URL = "/figures";

/**
 * PR-C3 — `<CourseFigures />` on `/figures`.
 *
 * Covers TDD test list row T38 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke chapter (`spoiler-alerts.mdx`) ships 19
 * `<Figure name="...">` registry-mode blocks. Each is captured
 * by the PR-C3 `extractFigures` extractor as a `FigureUsageEntry`
 * with per-chapter sequential `number: 1..19` and anchor
 * `fig-{slugify(name)}-{number}`. With a single chapter, the
 * default chapter-order sort reduces to source-appearance order
 * (number 1..19).
 *
 * Each `<li>` carries the `Fig. N` prefix, an `<img>` from the
 * registry, a caption (registry default or per-usage override),
 * AND a back-link to the chapter anchor — per the two-tier
 * figures model in decision #3 + the `<CourseFigures>` template.
 */

test.describe("PR-C3: <CourseFigures /> on /figures", () => {
  test("T38: renders all 19 figures from the smoke chapter with registry-resolved <img> tags", async ({
    page,
  }) => {
    await page.goto(FIGURES_URL);
    const block = page.locator("[data-sophie-course-figures]");
    await expect(block).toBeAttached();
    const items = block.locator(".sophie-course-figures__item");
    await expect(items).toHaveCount(19);

    // Every figure should resolve via the registry — no
    // "Missing figure:" fallback markers should be present.
    await expect(block.locator(".sophie-course-figures__missing")).toHaveCount(
      0
    );

    // 19 <img> elements, one per item, each with non-empty src
    // and alt (the FigureRegistryEntry schema enforces
    // NonEmptyString for both).
    const images = block.locator(".sophie-course-figures__image");
    await expect(images).toHaveCount(19);
    await expect(images.first()).toHaveAttribute("src", /\S/);
    await expect(images.first()).toHaveAttribute("alt", /\S/);
  });

  test("default sort is chapter-order: Fig. 1 .. Fig. 19", async ({ page }) => {
    // PR-C3 design decision #9: default `order="chapter"` sorts
    // by chapter slug asc, then per-chapter `number` asc. With a
    // single chapter (spoiler-alerts), this reduces to number
    // 1..19 in source-appearance order. The number prefix
    // `Fig. N` is rendered by `.sophie-course-figures__number`.
    await page.goto(FIGURES_URL);
    const numbers = await page
      .locator(".sophie-course-figures__number")
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
    expect(numbers).toEqual([
      "Fig. 1",
      "Fig. 2",
      "Fig. 3",
      "Fig. 4",
      "Fig. 5",
      "Fig. 6",
      "Fig. 7",
      "Fig. 8",
      "Fig. 9",
      "Fig. 10",
      "Fig. 11",
      "Fig. 12",
      "Fig. 13",
      "Fig. 14",
      "Fig. 15",
      "Fig. 16",
      "Fig. 17",
      "Fig. 18",
      "Fig. 19",
    ]);
  });

  test("each entry has a caption (registry default or override)", async ({
    page,
  }) => {
    await page.goto(FIGURES_URL);
    // 19 figcaptions, all non-empty. Smart-quote tolerance: if
    // any registry caption contains an apostrophe, remark may
    // render it curly — we only assert non-empty here, not exact
    // text, so the smart-quote pass is opaque to this test.
    const captions = page.locator(".sophie-course-figures__caption");
    await expect(captions).toHaveCount(19);
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
    await expect(backlinks).toHaveCount(19);
    const hrefs = await backlinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
    );
    // Spot-check: the 4th figure (cosmic-distance-ladder, line
    // 445 of the source MDX) and the 16th (decoder-ring, line
    // 867) — these are the two figures cross-referenced by
    // `<FigureRef>` in the chapter (verified in
    // figure-ref.spec.ts).
    expect(hrefs[3]).toBe(
      "/chapters/spoiler-alerts#fig-cosmic-distance-ladder-4"
    );
    expect(hrefs[15]).toBe("/chapters/spoiler-alerts#fig-decoder-ring-16");
    // All hrefs share the chapter prefix and the `fig-` anchor
    // prefix (the extractor's anchor shape is invariant —
    // F5 invariant).
    for (const href of hrefs) {
      expect(href).toMatch(/^\/chapters\/spoiler-alerts#fig-/);
    }
  });

  test("/figures is axe-clean", async ({ page }) => {
    await page.goto(FIGURES_URL);
    const results = await new AxeBuilder({ page })
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
