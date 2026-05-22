import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `SubsectionSchema` — a content grouping inside a `Section`'s Units.
 *
 * Per [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md):
 * Subsections are **auto-grouped by Artifact type** by default — Sophie
 * inspects the Section's Units and synthesizes "Slides" / "Readings" /
 * "Resources" subsections without any authoring input. The instructor
 * can opt into **explicit Subsection authoring** to add a subsection
 * intro, custom ordering, or grouping that doesn't follow artifact-type
 * boundaries.
 *
 * `kind` discriminates:
 * - `auto-grouped`: synthesized by Sophie; references `artifact_type`
 *   (e.g., `"slides"`); no `intro_mdx`.
 * - `explicit`: instructor-authored; may have `intro_mdx`; does not
 *   reference `artifact_type`.
 */
export const SubsectionAutoGroupedSchema = z.object({
  id: Slug,
  label: NonEmptyString,
  order: z.number().int().nonnegative(),
  kind: z.literal("auto-grouped"),
  artifact_type: NonEmptyString,
});
export type SubsectionAutoGrouped = z.infer<typeof SubsectionAutoGroupedSchema>;

export const SubsectionExplicitSchema = z.object({
  id: Slug,
  label: NonEmptyString,
  order: z.number().int().nonnegative(),
  kind: z.literal("explicit"),
  intro_mdx: z.string().optional(),
});
export type SubsectionExplicit = z.infer<typeof SubsectionExplicitSchema>;

export const SubsectionSchema = z.discriminatedUnion("kind", [
  SubsectionAutoGroupedSchema,
  SubsectionExplicitSchema,
]);

export type Subsection = z.infer<typeof SubsectionSchema>;
