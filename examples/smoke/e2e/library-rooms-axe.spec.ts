import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * W4c Batch 3c — composition-level axe gating for Library rooms.
 *
 * Background: Task 3.1 reviewer flagged that the Container-API unit
 * tests (Batch 3b) cover shell+content composition at *component*
 * scope, but never run axe against a *page* — so a regression like
 * the original Task 3.1 bug (`<LibraryCollectionShell>` emitting a
 * second `<main>` inside the page's `ContentColumn` `<main>`,
 * triggering axe rule `landmark-no-duplicate-main`) would slip past
 * the unit tier. Adding two representative page-level axe checks
 * closes that gap.
 *
 * Scope: 2 representative URLs from the smoke build's 16 Library
 * routes — the hub (`/library/`) and one Topic Spec room
 * (`/library/topics/logarithms/`, shipped by W4b). Adding all 14
 * W4c Library-room surfaces would be redundant: the bug class is
 * caught at the representative level, and the per-component axe
 * tests at Container scope (Batch 3b) cover the rest.
 *
 * Pattern mirrors the existing axe-in-e2e specs
 * (`course-key-insights.spec.ts:112`, `theme-toggle.spec.ts:187`,
 * `view-modes.spec.ts:341`).
 *
 * Two deliberate deviations from those existing specs, both required
 * to make the Task 3.1 sanity check actually trip:
 *
 * 1. **No `.exclude("astro-island")`.** Empirically discovered during
 *    Phase C sanity check: applying that exclude prevents the
 *    page-level `landmark-no-duplicate-main` rule from firing even
 *    when two `<main>` tags are present in the rendered DOM.
 *    Scoping axe's context away from `astro-island` apparently
 *    short-circuits the page-landmark sweep. Library hub +
 *    Topic Spec pages currently ship no hydrated islands, so the
 *    exclude has no actual content to filter — dropping it is
 *    free coverage. If a future Library room adds an island that
 *    needs filtering, prefer `.disableRules([...])` over the
 *    blanket scope exclude.
 *
 * 2. **Explicit `.withTags([...best-practice])`.** The default
 *    `AxeBuilder` runs WCAG 2.0/2.1 A+AA tags only;
 *    `landmark-no-duplicate-main` (the exact rule that caught the
 *    Task 3.1 Critical) is tagged `best-practice` per axe-core's
 *    rule definition (`cat.semantics`, `best-practice`) and is
 *    therefore NOT in the default set. We add `best-practice` so
 *    the landmark rules — and the bug class this spec is meant to
 *    catch — actually fire. WCAG-AA tags are preserved so the spec
 *    doesn't lose coverage on contrast, ARIA, keyboard, etc.
 */

test.describe("W4c: Library room pages — composition-level axe gating", () => {
  test("/library/ (hub) is axe-clean", async ({ page }) => {
    await page.goto("/library/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("/library/topics/logarithms/ (Topic Spec) is axe-clean", async ({
    page,
  }) => {
    await page.goto("/library/topics/logarithms/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
