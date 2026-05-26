import type { CourseSpec } from "@sophie/core/schema";

/**
 * Module-level singleton store for the consumer's parsed
 * `course.sophie.yaml`. Mirrors the pedagogy-store pattern per ADR 0038
 * + the per-file rationale in `pedagogy-store.ts:14-22`: chrome
 * components must NOT directly import `virtual:sophie/course-spec`
 * (the `virtual:` protocol is Vite-only; bare-Node imports — Astro's
 * config loader, vitest in some contexts — hit `ERR_UNKNOWN_URL_SCHEME`).
 *
 * Data flow:
 *  1. SSR: `<TextbookLayout>` (in @sophie/astro) imports the spec from
 *     `virtual:sophie/course-spec` + calls `__setCourseSpec(spec)`
 *     once per render.
 *  2. SSR also emits a `<script id="sophie-course-spec">` JSON tag
 *     for client-side fallback when the React island re-renders
 *     post-hydration on a page that re-runs the chrome components
 *     in a fresh JS context.
 *  3. Client-side `useCourseSpec()` calls `getCourseSpec()` →
 *     hydrates from the script tag on first call when `__setCourseSpec`
 *     hasn't fired in this JS context.
 *
 * Singleton (not array) — unlike `createPedagogyStore<T>`, there is
 * exactly one CourseSpec per app. Inlining the singleton pattern
 * keeps this file focused (~70 LOC) without reaching for a
 * `createSingletonStore<T>` factory before a second singleton-shaped
 * consumer appears.
 */

const SCRIPT_TAG_ID = "sophie-course-spec";

let cachedSpec: CourseSpec | null = null;
let didSet = false;

/**
 * SSR-side setter called by `<TextbookLayout>` (in @sophie/astro)
 * once per render. Internal-use; consumers should never invoke this
 * — that's what the `__` prefix + `/internal/store-hydration`
 * subpath export communicates.
 */
export function __setCourseSpec(spec: CourseSpec): void {
  cachedSpec = spec;
  didSet = true;
}

/**
 * Reset between test cases. **Tests only** — production code must
 * never call this. Marked with `__` prefix + the
 * `ForTesting` suffix so any accidental production use is obviously
 * wrong at the call site.
 */
export function __resetCourseSpecStoreForTesting(): void {
  cachedSpec = null;
  didSet = false;
}

function hydrateFromScriptTagIfPresent(): void {
  if (didSet) return;
  if (typeof document === "undefined") return; // SSR: no DOM
  const el = document.getElementById(SCRIPT_TAG_ID);
  if (!el) return;
  try {
    const parsed = JSON.parse(el.textContent ?? "");
    cachedSpec = parsed as CourseSpec;
    didSet = true;
  } catch {
    // Malformed JSON in the script tag is a build-time author error
    // we don't crash the page over. Production rendering returns
    // null + downstream `useCourseSpec` throws with a curated
    // message that tells the author where to look.
  }
}

export function getCourseSpec(): CourseSpec | null {
  hydrateFromScriptTagIfPresent();
  return cachedSpec;
}

/**
 * React hook reading the consumer's course.sophie.yaml. Throws when
 * no spec is set — chrome components require a spec to render meaningful
 * output (a `<Points category="hw">` without grading.categories has
 * no data to render). Per H3 (Anna's decision, 2026-05-26): keep the
 * hook for test mockability; tests use `__setCourseSpec(fixture)` to
 * populate before render.
 */
export function useCourseSpec(): CourseSpec {
  const spec = getCourseSpec();
  if (!spec) {
    throw new Error(
      "useCourseSpec: no course spec available. Add course.sophie.yaml to " +
        "the consumer-course repo root and ensure @sophie/astro's TextbookLayout " +
        "calls __setCourseSpec at SSR time (or that the page emits a " +
        "<script id='sophie-course-spec'> JSON tag for client-side hydration)."
    );
  }
  return spec;
}
