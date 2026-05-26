import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * Grading shape at v0.2. **Clean break from v0.1's
 * `assessment.grade_weights`** (sum to 100) per ADR 0080 v0.2
 * amendment + Anna's H1/H5 decision (2026-05-26). Adopts fractional
 * weights (sum to 1.0 ±0.001) + structured `drop_lowest` +
 * `late_policy_ref` prose-fragment pointer.
 *
 * `assessment.category_refs` (in course-spec.ts) is the audit-coverage
 * pointer into `grading.categories[*].id` — every category referenced
 * by an assessment surface must exist here.
 */
export const GradingCategorySchema = z
  .object({
    id: Slug,
    name: NonEmptyString,
    /** Fractional weight; the full set must sum to 1.0 ±0.001 (refine on GradingSchema). */
    weight: z.number().min(0).max(1),
    count: z.number().int().positive().optional(),
    drop_lowest: z.number().int().nonnegative().optional(),
    /** Prose fragment ref (e.g. "prose/late-work") — Phase 3 compose evaluator resolves it. */
    late_policy_ref: z
      .string()
      .regex(/^prose\//)
      .optional(),
  })
  .strict();

export type GradingCategory = z.infer<typeof GradingCategorySchema>;

export const LetterScaleEntrySchema = z
  .object({
    grade: NonEmptyString,
    min: z.number().min(0).max(100),
  })
  .strict();

export type LetterScaleEntry = z.infer<typeof LetterScaleEntrySchema>;

export const GradingSchema = z
  .object({
    categories: z
      .array(GradingCategorySchema)
      .min(1)
      .refine(
        (cats) =>
          Math.abs(cats.reduce((s, c) => s + c.weight, 0) - 1.0) < 0.001,
        { message: "grading.categories weights must sum to 1.0 (±0.001)" }
      ),
    letter_scale: z.array(LetterScaleEntrySchema).min(1),
    curve_policy_ref: z
      .string()
      .regex(/^prose\//)
      .optional(),
  })
  .strict();

export type Grading = z.infer<typeof GradingSchema>;
