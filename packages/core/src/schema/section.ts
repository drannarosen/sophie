import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `SectionTypeSchema` — discriminator for the five `Section` variants
 * per [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md).
 *
 * - `module`: traditional course module (lecture-shape; ASTR 201 style)
 * - `phase`: multi-week phase (project-shape; ASTR 596 style)
 * - `track`: parallel subject track within a course
 * - `unit-block`: tight cluster of related Units without phase/module overhead
 * - `bridge`: prerequisite/foundation room (per [ADR 0068](../../../docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md))
 */
export const SectionTypeSchema = z.enum([
  "module",
  "phase",
  "track",
  "unit-block",
  "bridge",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

/**
 * `SectionModuleVariantSchema` — the `module`-variant of `SectionSchema`.
 * Field set preserved verbatim from the previous `ModuleSchema` (now
 * removed) so the migration from `Module` to `Section[type=module]` is
 * field-level lossless: `slug` + `title` + `order` + `description`.
 */
export const SectionModuleVariantSchema = z.object({
  type: z.literal("module"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionModuleVariant = z.infer<typeof SectionModuleVariantSchema>;

/**
 * `SectionPhaseVariantSchema` — multi-week phase grouping (ASTR 596
 * project-shape: Phase 1 / Phase 2 / etc.). Same field shape as the
 * module variant; the type tag drives display label + UX.
 */
export const SectionPhaseVariantSchema = z.object({
  type: z.literal("phase"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionPhaseVariant = z.infer<typeof SectionPhaseVariantSchema>;

/**
 * `SectionTrackVariantSchema` — parallel subject track within a
 * course (e.g., "Observational track" vs. "Theory track" in a
 * graduate-survey course). Same field shape as module/phase.
 */
export const SectionTrackVariantSchema = z.object({
  type: z.literal("track"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionTrackVariant = z.infer<typeof SectionTrackVariantSchema>;

/**
 * `SectionUnitBlockVariantSchema` — tight cluster of related Units
 * without phase/module overhead. Useful for shorter courses or
 * cross-cutting topic groupings inside a larger Section.
 */
export const SectionUnitBlockVariantSchema = z.object({
  type: z.literal("unit-block"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionUnitBlockVariant = z.infer<
  typeof SectionUnitBlockVariantSchema
>;

/**
 * `SectionBridgeVariantSchema` — prereq / bridge / foundations room
 * (per [ADR 0068](../../../docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md)).
 * Carries an optional `display_label` so the instructor can render
 * "Prerequisites" / "Foundations" / "Python Bootcamp" / etc. without
 * changing the internal type tag.
 */
export const SectionBridgeVariantSchema = z.object({
  type: z.literal("bridge"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
  display_label: NonEmptyString.optional(),
});
export type SectionBridgeVariant = z.infer<typeof SectionBridgeVariantSchema>;

/**
 * `SectionSchema` — top-level course-content grouping per
 * [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md).
 *
 * Replaces the previous `ModuleSchema` (now absorbed as the `module`
 * variant of this discriminated union). Discriminated union over
 * `type`: `module` | `phase` | `track` | `unit-block` | `bridge`.
 *
 * Holds Section-level Artifacts (intro / synthesis /
 * equation-collection / practice-set / etc. per
 * [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md))
 * + Subsections (which in turn hold Units). See ADR 0067 for the full
 * four-tier hierarchy.
 *
 * Distinct from [`ChapterSectionSchema`](./chapter-section.ts), which
 * represents a chapter-internal H2 anchor.
 */
export const SectionSchema = z.discriminatedUnion("type", [
  SectionModuleVariantSchema,
  SectionPhaseVariantSchema,
  SectionTrackVariantSchema,
  SectionUnitBlockVariantSchema,
  SectionBridgeVariantSchema,
]);
export type Section = z.infer<typeof SectionSchema>;
