import { SimpleList } from "./SimpleList.tsx";

/**
 * **STUB — deferred follow-up sprint.** `hero-with-modules` is one of
 * three built-in landing layouts declared on `landing.layout`. The
 * real implementation (full-bleed hero image + module cards) ships
 * in a follow-up sprint per the course-info-projection design doc
 * § "Pluggable landings." Tracking required:
 *
 *   - Open a tracking issue on drannarosen/sophie titled
 *     "feat(components): HeroWithModules landing layout — real impl"
 *   - Reference: docs/plans/2026-05-26-course-info-projection-design.md
 *     § "Pluggable landings"
 *   - Trigger for picking it up: ASTR 201 or a second consumer course
 *     authoring `landing.layout: "hero-with-modules"` AND wanting the
 *     hero shape (not the SimpleList fallback)
 *
 * Until then, this delegates to `SimpleList` so the schema enum is
 * structurally honored: a consumer that authors
 * `landing.layout: "hero-with-modules"` gets a rendered page (not a
 * 404 or broken dispatcher), just with the simple-list shape. The
 * follow-up swaps the implementation; the consumer-facing layout
 * value never changes.
 *
 * Per Phase 1-4 review I4.
 */
export const HeroWithModules = SimpleList;
