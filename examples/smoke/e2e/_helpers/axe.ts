/**
 * Shared e2e a11y assertion per ADR 0004 (axe-core mandatory on every
 * component PR) + R10 (landmark choice when nested under a parent
 * landmark; see AGENTS.md "Standing PR-review rules").
 *
 * Single point of maintenance for Sophie's standard tag list — WCAG
 * 2.1 AA plus the `landmark-unique` / `landmark-one-main` rules that
 * caught three same-root-cause landmark bugs in the W4c audit.
 *
 * Canonical-example contract for `examples/smoke/e2e/_patterns/axe-core.md`.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectChapterA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include("main, [role='main'], article")
    .withTags(["wcag2aa", "wcag21aa", "landmark-unique", "landmark-one-main"])
    .analyze();
  expect(results.violations, "axe violations").toEqual([]);
}
