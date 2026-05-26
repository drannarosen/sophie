import { SimpleList } from "./SimpleList.tsx";

/**
 * **STUB — deferred follow-up sprint.** `prose-with-toc` is one of
 * three built-in landing layouts declared on `landing.layout`. The
 * real implementation (long-form course-thesis prose with a sticky
 * table-of-contents) ships in a follow-up sprint per the
 * course-info-projection design doc § "Pluggable landings."
 * Tracking required:
 *
 *   - Open a tracking issue on drannarosen/sophie titled
 *     "feat(components): ProseWithToc landing layout — real impl"
 *   - Reference: docs/plans/2026-05-26-course-info-projection-design.md
 *     § "Pluggable landings"
 *   - Trigger for picking it up: a consumer course (likely COMP 521
 *     when it migrates) authoring `landing.layout: "prose-with-toc"`
 *     AND wanting the prose-+-ToC shape (not the SimpleList fallback)
 *
 * Delegates to `SimpleList` for the same reason as `HeroWithModules`:
 * a consumer authoring `landing.layout: "prose-with-toc"` gets a
 * working page until the real implementation lands. Layout value
 * stays stable.
 *
 * Per Phase 1-4 review I4.
 */
export const ProseWithToc = SimpleList;
