import { z } from "zod";
import { NonEmptyString } from "../primitives.ts";

/**
 * Chapter-meta pedagogy entries — chapter / module / objective. These
 * three roles are sourced from the consumer app's content collections
 * (`chapters`, `modules`) and from `<LearningObjectives>`-nested
 * `<Objective>` flow elements in chapter MDX.
 *
 * Co-located here because all three populate the "what's in this
 * course" navigation surface (chapter list, module sequence, learning-
 * objective roll-up) and the audit treats them as one coordinated
 * family (CS1/CS2 for chapter status; O1/O2 for objectives).
 */

/**
 * A chapter entry — one per chapter in the consumer's Astro
 * `chapters` content collection. Populated at SSR-merge time by
 * `TextbookLayout` from `getCollection('chapters')`; never written by
 * the remark extractor (chapters are consumer-app-owned, like
 * `figureRegistry`). Powers `<ChapterRef>` hover-preview and the
 * `/objectives` course roll-up.
 */
export const ChapterEntrySchema = z.object({
  /** Chapter slug (matches the content-collection entry id). */
  slug: NonEmptyString,
  /** Human-readable chapter title. */
  title: NonEmptyString,
  /** Module slug — FK to `ModuleEntry.slug`. */
  module: NonEmptyString,
  /** Optional in-module ordering. Chapter order within a module is authoring-driven; absent => sort-stable insertion order. */
  order: z.number().int().nonnegative().optional(),
  /** Optional single-paragraph chapter description for hover-preview + roll-up cards. */
  description: z.string().optional(),
  /**
   * Chapter maturity (ADR 0051). Mirrors `ChapterSchema.status`.
   * Required so the audit's CS2 INFO finding (draft chapters present)
   * has a signal to read; routing-level draft-exclusion lives in
   * `@sophie/astro/lib/get-student-chapters.ts`.
   */
  status: z.enum(["draft", "review", "stable"]),
});
export type ChapterEntry = z.infer<typeof ChapterEntrySchema>;

/**
 * A module entry — one per top-level course module in the consumer's
 * Astro `modules` content collection. Populated at SSR-merge time from
 * `getCollection('modules')`. Modules are ordered (the course outline
 * is a sequence), so `order` is required — distinct from chapters,
 * where order within a module is optional.
 */
export const ModuleEntrySchema = z.object({
  /** Module slug (matches the content-collection entry id). */
  slug: NonEmptyString,
  /** Human-readable module title. */
  title: NonEmptyString,
  /** Required course-outline ordering. */
  order: z.number().int().nonnegative(),
  /** Optional single-paragraph module description. */
  description: z.string().optional(),
});
export type ModuleEntry = z.infer<typeof ModuleEntrySchema>;

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
  /** Chapter slug containing the source <Objective>. */
  chapter: NonEmptyString,
  /** DOM id; passthrough `lo-${id}`. */
  anchor: NonEmptyString,
});
export type ObjectiveEntry = z.infer<typeof ObjectiveEntrySchema>;
