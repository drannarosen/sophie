import { SimpleList } from "./SimpleList.tsx";

/**
 * Stub for v0.2: `prose-with-toc` is one of three built-in landing
 * layouts declared on `landing.layout`. The real implementation —
 * long-form course-thesis prose with a sticky table-of-contents —
 * is a v0.2 follow-up per the course-info-projection design doc §
 * "Pluggable landings."
 *
 * Delegates to `SimpleList` for the same reason as `HeroWithModules`:
 * a consumer authoring `landing.layout: "prose-with-toc"` gets a
 * working page until the real implementation lands. Layout value
 * stays stable.
 */
export const ProseWithToc = SimpleList;
