import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * Chapter-meta pedagogy entries — scoped to `ObjectiveEntry` after
 * W2/D3 deleted `ChapterEntrySchema` + `ModuleEntrySchema`.
 *
 * Pre-W2 this file co-located Chapter / Module / Objective entries
 * because all three populated the "what's in this course" navigation
 * surface. Post-W2/D1 (Path A) + D3:
 *
 *   - `ChapterEntry` → DELETED; reading-shape artifact data flows
 *     through `ArtifactEntry[type=reading]` and `UnitEntry`.
 *   - `ModuleEntry` → DELETED; module metadata graduates to
 *     `SectionEntry[type=module]`.
 *
 * `ObjectiveEntry` stays — per-callsite extractor output keyed by
 * parent `unit` id. W3 renamed the per-callsite parent-ref field
 * `chapter: NonEmptyString` → `unit: Slug` across all extractor
 * entry schemas; `UnitEntry.chapter` (the D7 reading-artifact
 * binding) is unaffected.
 *
 * Filename retained — historical co-location of Chapter/Module/Objective
 * makes it the load-bearing name; cosmetic rename to `objective-meta.ts`
 * is a deferred hygiene PR.
 */

/**
 * A learning-objective entry — extracted from `<Objective>` flow
 * elements nested inside `<LearningObjectives>` in chapter MDX. The
 * objective `id` is author-supplied and persists across edits (drives
 * the IndexedDB persistence key per ADR 0007); the extractor never
 * auto-generates it. Anchor convention: `lo-${id}` (passthrough).
 */
export const ObjectiveEntrySchema = z.object({
  /** Author-supplied stable id; survives edits to verb/body. */
  id: NonEmptyString,
  /** Pedagogical verb (e.g. "Recognize", "Understand", "Apply"). */
  verb: NonEmptyString,
  /** Pre-rendered HTML of the objective body. Consumers embed via `set:html`. */
  body: NonEmptyString,
  /** Parent Unit id containing the source `<Objective>` (W3 rename from `chapter`). */
  unit: Slug,
  /** DOM id; passthrough `lo-${id}`. */
  anchor: NonEmptyString,
});
export type ObjectiveEntry = z.infer<typeof ObjectiveEntrySchema>;
