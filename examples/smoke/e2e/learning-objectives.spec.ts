import { expect, test } from "@playwright/test";

/**
 * RED — Layer 2 e2e for the LO checkbox interactivity bug.
 *
 * See `docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md`
 * §4 "Layer 2 — Playwright e2e on smoke" and §0 "The failure
 * (empirically confirmed)" for the full diagnostic. Summary: the
 * `<LearningObjectives><Objective>` MDX tree renders inside a
 * `client:load` Astro island; Astro serves JSX children as
 * server-rendered HTML inside an `<astro-slot>`, so the React island
 * never sees `<Objective>` ReactElements as children. The
 * `Children.map(...) + cloneElement` checkbox-injection path falls
 * through to the pure-display branch on every Objective — zero
 * `<input type="checkbox">` ship in the built HTML.
 *
 * Both tests below currently fail against the smoke production build:
 *
 *   - `renders a checkbox for each Objective` fails on
 *     `toHaveCount(1)` (got 0).
 *   - `clicking a checkbox … persists across reload` fails when
 *     `checkbox.check()` times out (no element to click).
 *
 * They turn green after the `transformLearningObjectives` remark pass
 * lands (plan Task 6) and the consumer migration completes (plan
 * Task 7).
 *
 * Selector note: `aria-labelledby="lo-heading"` is on the `<section>`
 * wrapper, not the `<ul>`. The `<ul>` carries `aria-busy`. The
 * selector chain `section[aria-labelledby="lo-heading"] ul …`
 * matches both correctly.
 *
 * Condition-based-waiting: aria-busy flips false on hydration. Wait
 * via `expect(locator).toHaveAttribute("aria-busy", "false")` — do
 * NOT use `{ timeout: N }` knobs (per CLAUDE.md SoTA-over-simple).
 */

const CHAPTER_URL = "/chapters/measuring-the-sky/";
const LO_UL_SELECTOR = 'section[aria-labelledby="lo-heading"] ul';
const LO_CHECKBOX_SELECTOR = `${LO_UL_SELECTOR} input[type="checkbox"]`;

test.describe("Learning Objectives checkbox interactivity", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders a checkbox for each Objective in a chapter", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const ul = page.locator(LO_UL_SELECTOR);
    await expect(ul).toHaveAttribute("aria-busy", "false");

    // The smoke chapter `measuring-the-sky.mdx` declares exactly one
    // `<Objective id="stub" verb="Recognize">…</Objective>`.
    const checkboxes = page.locator(LO_CHECKBOX_SELECTOR);
    await expect(checkboxes).toHaveCount(1);
  });

  test("clicking a checkbox sets it to checked and persists across reload", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const ul = page.locator(LO_UL_SELECTOR);
    await expect(ul).toHaveAttribute("aria-busy", "false");

    const checkbox = page.locator(LO_CHECKBOX_SELECTOR).first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await page.reload();
    await expect(ul).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(LO_CHECKBOX_SELECTOR).first()).toBeChecked();
  });
});
