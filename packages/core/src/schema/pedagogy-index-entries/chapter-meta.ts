import { z } from "zod";
import { NonEmptyString } from "../primitives.ts";

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
 * chapter slug (= unit id per W2/D4). The `chapter` field name is
 * preserved through W2; W3 renames per-callsite `chapter: string` →
 * `unit: string` across all extractor entry schemas.
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
  /** Chapter slug (= unit id per W2/D4) containing the source <Objective>. */
  chapter: NonEmptyString,
  /** DOM id; passthrough `lo-${id}`. */
  anchor: NonEmptyString,
});
export type ObjectiveEntry = z.infer<typeof ObjectiveEntrySchema>;
