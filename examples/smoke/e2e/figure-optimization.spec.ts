import { expect, test } from "@playwright/test";
import { expectChapterA11y } from "./_helpers/axe";

/**
 * ADR 0094 — build-time figure optimization regression guard.
 *
 * The smoke registry routes one representative figure
 * (`cosmic-distance-ladder`) through the optimized path: its master
 * lives in `src/figures/` (metadata-only registry entry, no `src`), so
 * the integration's `astro:assets` codegen renders a responsive
 * `<picture>` via `FigureImage.astro` instead of a raw `<img>`. The
 * other 33 figures stay legacy `public/` passthroughs, so both paths
 * ship in one build. (Smoke is a throwaway Phase-0 target per ADR 0023;
 * one optimized figure is enough to guard the path.)
 *
 * Asserts the three WS2 wins on the served HTML: AVIF+WebP `srcset`
 * (over-fetch fix), intrinsic `width`/`height` (CLS fix), and
 * `decoding="async"` (review F10). The figure is static SSR output —
 * no island hydration — so a plain `goto` + assert suffices.
 */
const READING_URL = "/units/spoiler-alerts/reading/";
const FIGURE_IMG = 'img[alt^="Four-rung ladder diagram"]';

test.describe("Figure optimization (ADR 0094)", () => {
  test("renders an optimized <picture> with AVIF/WebP srcset + intrinsic dims", async ({
    page,
  }) => {
    await page.goto(READING_URL);

    const img = page.locator(FIGURE_IMG);
    await expect(img).toBeVisible();

    // Optimized fallback <img>: hashed _astro/ derivative + width-descriptor
    // srcset (not the raw public/ source).
    await expect(img).toHaveAttribute(
      "srcset",
      /_astro\/cosmic-distance-ladder[^"]*\.png \d+w/
    );
    // Intrinsic dimensions reserve layout space (CLS fix).
    await expect(img).toHaveAttribute("width", /^\d+$/);
    await expect(img).toHaveAttribute("height", /^\d+$/);
    // F10 — async decoding.
    await expect(img).toHaveAttribute("decoding", "async");

    // Modern-format <source> siblings inside the same <picture>.
    const picture = page.locator("picture", { has: img });
    await expect(picture.locator('source[type="image/avif"]')).toHaveAttribute(
      "srcset",
      /\.avif \d+w/
    );
    await expect(picture.locator('source[type="image/webp"]')).toHaveAttribute(
      "srcset",
      /\.webp \d+w/
    );

    await expectChapterA11y(page);
  });
});
