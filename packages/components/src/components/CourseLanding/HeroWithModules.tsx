import { SimpleList } from "./SimpleList.tsx";

/**
 * Stub for v0.2: `hero-with-modules` is one of three built-in landing
 * layouts declared on `landing.layout`. The real implementation —
 * full-bleed hero image + module cards — is a v0.2 follow-up per the
 * course-info-projection design doc § "Pluggable landings."
 *
 * Until then, this delegates to `SimpleList` so the schema enum is
 * structurally honored: a consumer that authors
 * `landing.layout: "hero-with-modules"` gets a rendered page (not a
 * 404 or broken dispatcher), just with the simple-list shape. The
 * follow-up swaps the implementation; the consumer-facing layout
 * value never changes.
 */
export const HeroWithModules = SimpleList;
