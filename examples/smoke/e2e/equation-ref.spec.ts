import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * Inline `<EquationRef>` cross-references per ADR 0060.
 *
 * Renamed from `eq-ref.spec.ts` in Batch 5a's hard rename. Each
 * trigger:
 *   - is an `<a>` whose href is `/equations/<id>` (the registry
 *     route — equations live in `src/content/equations/<id>.mdx`
 *     post-ADR-0060, not in chapter MDX);
 *   - on hover, opens a Radix HoverCard exposing the title + a
 *     KaTeX-rendered display-math preview + biography summary;
 *   - on click, navigates to `/equations/<id>`.
 *
 * The smoke chapter (`spoiler-alerts.mdx`) places callsites:
 *   - self-closing `<EquationRef refId="inverse-square-law" client:load />`
 *     (renders the "Eq. C.N" numbered cross-ref label per Sprint E)
 *   - children form `<EquationRef refId="wiens-law" client:load>Wien's law</EquationRef>`
 *     (renders the children verbatim)
 *
 * Sprint E changed the self-closing-form output from the registry
 * title to a numbered short reference (`Eq. 1`, `Eq. 3.2`, etc.) to
 * match the chapter Figure-numbering voice. The hover-card popover
 * still exposes the full registry title.
 */

test.describe("<EquationRef> on the smoke chapter (ADR 0060)", () => {
  test("self-closing form renders the 'Eq. N' cross-ref label and links to /equations/<id>", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/equations/inverse-square-law"]')
      .first();
    await expect(trigger).toBeAttached();
    await expect(trigger).toContainText(/^\s*Eq\.\s*\d+(\.\d+)?\s*$/);
  });

  test("children form renders the override text and links to /equations/<id>", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page.locator('a[href="/equations/wiens-law"]').first();
    await expect(trigger).toBeAttached();
    await expect(trigger).toContainText(/Wien.s law/);
  });

  test("trigger carries a presentational Lucide Sigma icon (aria-hidden)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/equations/inverse-square-law"]')
      .first();
    const icon = trigger.locator("svg");
    await expect(icon).toBeAttached();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveClass(/lucide-sigma/);
  });

  test("hovering the trigger opens a HoverCard with KaTeX-rendered tex", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.locator('[data-react-hydrated="true"]').first().waitFor();
    const trigger = page
      .locator('a[href="/equations/inverse-square-law"]')
      .first();
    await expect(
      page.locator("[data-sophie-equation-popover]")
    ).not.toBeAttached();
    await trigger.hover();
    const popover = page.locator("[data-sophie-equation-popover]");
    await expect(popover).toBeAttached({ timeout: 2000 });
    await expect(popover).toContainText(/Inverse-Square Law/i);
    await expect(popover.locator(".katex").first()).toBeVisible();
  });

  test("dismissal: moving the pointer away closes the popover", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.locator('[data-react-hydrated="true"]').first().waitFor();
    const trigger = page.locator('a[href="/equations/wiens-law"]').first();
    await trigger.hover();
    await expect(page.locator("[data-sophie-equation-popover]")).toBeAttached();
    await page.mouse.move(0, 0);
    await expect(
      page.locator("[data-sophie-equation-popover]")
    ).not.toBeAttached();
  });

  test("clicking the trigger navigates to the registry route /equations/<id>", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/equations/inverse-square-law"]')
      .first();
    await trigger.click();
    await expect(page).toHaveURL(/\/equations\/inverse-square-law\/?$/);
  });
});
