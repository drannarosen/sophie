/**
 * Shared e2e a11y assertion per ADR 0004 (axe-core mandatory on every
 * component PR) + R10 (landmark choice when nested under a parent
 * landmark; see AGENTS.md "Standing PR-review rules").
 *
 * Canonical pattern (mirrors `proving-chapter.spec.ts:277-302`):
 * tag set + excludes + disables together encode Sophie's standing
 * Phase-0 known-acceptable carve-outs, so adopting the helper is a
 * drop-in for the 22 inline-axe specs without weakening their checks.
 *
 * **Excludes** — Phase-0 known-acceptable patterns:
 *   - `.margin-note`: column-margin <aside> elements from MDX. Phase 1
 *     replaces these with a <MarginNote> component (ADR-queue) that
 *     carries role="note" + a unique label. PR landing 9cc115f added
 *     aria-label to spoiler-alerts/reading.mdx's 20 asides; other
 *     chapters still carry raw asides — exclude until full migration.
 *   - GFM task-list checkboxes: remark-gfm renders `[x]` lists as
 *     `<input type="checkbox" disabled>` siblings of text without
 *     wrapping `<label>`. Markdown convention; not actionable from
 *     Sophie's side without a custom rehype plugin.
 *
 * **Disabled rules** — Phase-0 known-acceptable rule suppressions:
 *   - `color-contrast`: theme-level concern; @sophie/theme runs its
 *     own WCAG-AA contrast check at build time. Token-level
 *     remediation tracked separately (GitHub issue #152).
 *
 * The former `list` / `listitem` suppression was DROPPED 2026-05-30
 * (H5a): the `<ul><astro-slot><li>` shape it guarded against no
 * longer exists. Commit 4737e03 / ADR 0027 made <LearningObjectives>
 * render its list from props, not slotted children, so the `<ul>` is
 * followed directly by `<li>` (data crosses the MDX boundary as
 * props, not children). axe `list`/`listitem` now run live across all
 * chapter + course specs.
 *
 * When the color-contrast follow-up (#152) lands, drop that rule too
 * and the suite tightens uniformly across all chapter specs.
 *
 * Single point of maintenance for the tag set + include selector +
 * exclude list + disable list.
 * Canonical-example contract for `examples/smoke/e2e/_patterns/axe-core.md`.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectChapterA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include("main, [role='main'], article")
    .exclude(".margin-note")
    .exclude(".task-list-item input[type='checkbox']")
    .exclude("li > input[type='checkbox'][disabled]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .disableRules(["color-contrast"])
    .analyze();
  expect(results.violations, "axe violations").toEqual([]);
}

/**
 * Sibling of `expectChapterA11y` for course-listing pages (Library
 * pages) that legitimately host multiple hydrated `<astro-island>`
 * elements, each emitting its own `<main>`. The astro-island exclude
 * keeps `landmark-no-duplicate-main` from firing on the multi-island
 * layout, mirroring the convention documented in
 * `library-rooms-axe.spec.ts:30-46`.
 *
 * Use this helper on Library/course-* pages; use `expectChapterA11y`
 * on chapter pages. When the underlying Astro slot-shape gets fixed
 * such that course listings emit one `<main>` per page (likely via
 * the library-room ADR queue), the astro-island exclude drops and
 * this helper can collapse into the chapter helper.
 *
 * Two helpers (not one with a flag) is the intentional shape per W2
 * + DRY: the duplication is small, the contexts are distinct, and
 * an explicit signature reads better at every call site than
 * `expectA11y(page, { excludeAstroIsland: true })`.
 */
export async function expectCourseA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include("main, [role='main'], article")
    .exclude("astro-island")
    .exclude(".margin-note")
    .exclude(".task-list-item input[type='checkbox']")
    .exclude("li > input[type='checkbox'][disabled]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .disableRules(["color-contrast"])
    .analyze();
  expect(results.violations, "axe violations").toEqual([]);
}
