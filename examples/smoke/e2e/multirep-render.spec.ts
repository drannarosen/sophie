import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Build-level render + axe assertion for `<MultiRep>` — closes the
 * ADR 0087 standing-rule gap flagged by the 2026-05-28 platform audit
 * (P1.1). ADR 0087 requires every compound/interactive component to
 * carry a build-level render+axe assertion, because the island boundary
 * is invisible to `@testing-library/react` unit tests.
 *
 * MultiRep is NOT at risk of the original children-introspection
 * empty-render bug — its `reps` arrive as a serialized prop populated by
 * the build-time `transformMultiRep` extractor (the same compile-time
 * pattern the compound-island transform uses). This spec is therefore a
 * regression GUARD + a11y check, not a bugfix: it pins that the binding
 * card renders its serialized representations in the real Astro build and
 * stays axe-clean.
 *
 * Target: the smoke fixture
 * `sections/foundations/units/measuring-the-sky/reading.mdx`, which binds
 * the "apparent-magnitude" concept across `<RepVerbal>` + `<RepEquation>`.
 */

const READING = "/units/measuring-the-sky/reading";
const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("MultiRep — binding card renders in the build", () => {
  test("renders the concept header + its serialized representations", async ({
    page,
  }) => {
    await page.goto(READING);
    const card = page
      .locator('[data-multirep-concept="apparent-magnitude"]')
      .first();
    await expect(card).toBeVisible();
    // Concept header rendered (displayLabel = conceptLabel ?? concept).
    await expect(card.getByText("apparent-magnitude")).toBeVisible();
    // The verbal representation rendered from the serialized `reps` prop —
    // the correctness bar that proves the build-time transform populated
    // the card (not an empty island).
    await expect(
      card.getByText(/how bright a star looks from Earth/i)
    ).toBeVisible();
  });

  test("reading page with MultiRep is axe-clean", async ({ page }) => {
    await page.goto(READING);
    await expect(
      page.locator('[data-multirep-concept="apparent-magnitude"]').first()
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(A11Y_TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
