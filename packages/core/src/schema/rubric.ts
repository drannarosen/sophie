import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `RubricScaleLevelSchema` — one row of a rubric's scoring scale.
 * (e.g., "Excellent / 30 points / Identifies all relevant assumptions").
 */
export const RubricScaleLevelSchema = z.object({
  points: z.number().nonnegative(),
  label: NonEmptyString,
  descriptor: NonEmptyString,
});
export type RubricScaleLevel = z.infer<typeof RubricScaleLevelSchema>;

/**
 * `RubricCriterionSchema` — one criterion in a criterion-based rubric
 * (e.g., "Physical reasoning / 30% weight / 4-level scale").
 *
 * `lo_references` lets curriculum-CI ([ADR 0045](../../../docs/website/decisions/0045-pedagogical-diff.md))
 * audit that the Rubric actually covers the LOs the parent Assessment claims.
 */
export const RubricCriterionSchema = z.object({
  id: Slug,
  label: NonEmptyString,
  weight: z.number().positive(),
  scale: z.array(RubricScaleLevelSchema).min(1),
  lo_references: z.array(NonEmptyString).default([]),
});
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;

/**
 * `RubricSchema` — first-class grading guide (per
 * [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)).
 * Authored once; reused across `Assessment`s. Renderable for student
 * self-assessment. Audited by curriculum-CI against claimed LOs.
 *
 * Two variants:
 * - `criterion-based` (default): per-criterion weights + scales.
 * - `holistic`: one scale describing whole work.
 */
const RubricCriterionBasedSchema = z.object({
  id: Slug,
  type: z.literal("criterion-based"),
  total_points: z.number().positive(),
  criteria: z.array(RubricCriterionSchema).min(1),
});

const RubricHolisticSchema = z.object({
  id: Slug,
  type: z.literal("holistic"),
  total_points: z.number().positive(),
  scale: z.array(RubricScaleLevelSchema).min(1),
});

export const RubricSchema = z.discriminatedUnion("type", [
  RubricCriterionBasedSchema,
  RubricHolisticSchema,
]);
export type Rubric = z.infer<typeof RubricSchema>;
