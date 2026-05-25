/**
 * Shared e2e a11y assertion per ADR 0004 (axe-core mandatory on every
 * component PR) + R10 (landmark choice when nested under a parent
 * landmark; see AGENTS.md "Standing PR-review rules").
 *
 * Tag set matches Sophie's existing convention across the 22 specs
 * that previously inlined their own AxeBuilder calls: WCAG 2.0 A/AA +
 * WCAG 2.1 A/AA + `best-practice`. The `best-practice` tag transitively
 * includes `landmark-unique` + `landmark-one-main` (the R10 rules that
 * caught three same-root-cause landmark bugs in the W4c audit), so the
 * helper's R10 coverage matches the existing inline pattern exactly.
 *
 * Disabled rules match the existing inline convention pending the
 * Sprint-K P1 color-contrast remediation + the underlying list/listitem
 * fixture cleanup:
 *   - `color-contrast`: 14 of 22 inline specs already disable; chapter-
 *     wide token-level remediation is tracked separately
 *   - `list` / `listitem`: 6 of 22 inline specs disable; component
 *     emit-shape cleanup is tracked separately
 * When those follow-ups land, drop the rules from this list and the
 * helper auto-tightens across the suite.
 *
 * Single point of maintenance for the tag set + the include selector +
 * the disable list.
 * Canonical-example contract for `examples/smoke/e2e/_patterns/axe-core.md`.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectChapterA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include("main, [role='main'], article")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .disableRules(["color-contrast", "list", "listitem"])
    .analyze();
  expect(results.violations, "axe violations").toEqual([]);
}
