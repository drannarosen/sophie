import type { ChapterStatus } from "@sophie/core/schema";

/**
 * Per ADR 0051 — `status: draft` chapters are EXCLUDED entirely from
 * the student build. This module is the single source of truth for
 * that filter. Both `[...slug].astro` (routes) and `TextbookLayout`
 * (chapter list passed to the components store + `<ChapterRef>`
 * resolution) consume it, so a draft chapter cannot leak into the
 * student build via either path.
 *
 * The "instructor build" affordance (ADR 0007 + ADR 0040 dual-profile)
 * is not yet implemented; for v1 every build is a student build.
 * When the instructor profile lands, the routing layer reads an env
 * var / build flag and skips the filter; the schema-layer `status`
 * field and the helper's pure shape remain unchanged.
 *
 * Defining the filter as a pure predicate over a minimal shape
 * (`{ data: { status } }`) keeps this module decoupled from
 * `astro:content` — it's importable in tests and in non-Astro
 * contexts (audits, CLI tools) without pulling the content-layer
 * runtime.
 */

interface ChapterLike {
  data: { status: ChapterStatus };
}

/**
 * Returns true when a chapter ships in the student build — i.e. its
 * `status` is `"review"` or `"stable"`. `"draft"` chapters are filtered
 * out per ADR 0051 §"status: draft excludes entirely from student
 * build".
 */
export function isStudentVisible(chapter: ChapterLike): boolean {
  return chapter.data.status !== "draft";
}

/**
 * Filter a chapter collection down to the student-visible subset.
 *
 * Typical use in a consumer-app `[...slug].astro`:
 *
 *   import { getStudentChapters } from "@sophie/astro";
 *   import { getCollection } from "astro:content";
 *
 *   export async function getStaticPaths() {
 *     const chapters = getStudentChapters(await getCollection("chapters"));
 *     return chapters.map((c) => ({ params: { slug: c.id }, props: { chapter: c } }));
 *   }
 *
 * Returns a NEW array (does not mutate the input).
 */
export function getStudentChapters<T extends ChapterLike>(
  chapters: ReadonlyArray<T>
): T[] {
  return chapters.filter(isStudentVisible);
}
