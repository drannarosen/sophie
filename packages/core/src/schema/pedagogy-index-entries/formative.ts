import { z } from "zod";
import { NonEmptyString } from "../primitives.ts";

/**
 * Formative-assessment index entries (ADR 0073 Amendment 1 —
 * formative-with-reveal v1). One entry per formative-parent callsite:
 * `<QuickCheck>` / `<MCQ>` / `<MultiSelect>` / `<FillBlank>` /
 * `<NumericQuestion>` / `<PracticeProblem>`.
 *
 * The `answer` discriminated union captures the *gradeable* shape per
 * kind. Grading itself (BKT, attempt logging) is deferred to v2 per
 * the broader ADR 0073; v1 records the answer so the future grader and
 * the AS-1..AS-5 audit invariants have a typed surface to read.
 *
 * Choice anchors inside `single-choice` / `multi-choice` answers are
 * slugified from the choice text (or an explicit `id` attr) by the
 * extractor; the schema only enforces non-emptiness because slug-shape
 * is the extractor's responsibility (it owns collision detection).
 */

export const FormativeKindSchema = z.enum([
  "mcq",
  "multi-select",
  "fill-blank",
  "numeric-question",
  "quickcheck",
  "practice-problem",
]);

export const FormativeAnswerSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("single-choice"), correct: NonEmptyString })
    .strict(),
  z
    .object({
      type: z.literal("multi-choice"),
      correct: z.array(NonEmptyString).min(1).readonly(),
    })
    .strict(),
  z
    .object({
      type: z.literal("fill-blank"),
      blanks: z
        .array(
          z.object({ id: NonEmptyString, correct: NonEmptyString }).strict()
        )
        .readonly(),
    })
    .strict(),
  z
    .object({
      type: z.literal("numeric"),
      value: z.number().finite(),
      tolerance: z.number().nonnegative(),
      toleranceKind: z.enum(["absolute", "relative"]),
      unit: z.string().optional(),
    })
    .strict(),
  z.object({ type: z.literal("solution-only") }).strict(),
]);

export const FormativeEntrySchema = z
  .object({
    /** Parent Unit id. */
    unit: NonEmptyString,
    /** `form-${counter}` auto OR author-supplied (slugified) id. */
    anchor: NonEmptyString,
    kind: FormativeKindSchema,
    /** Plain-text extraction of the `<X.Prompt>` body. */
    prompt: z.string(),
    answer: FormativeAnswerSchema,
    hasSolution: z.boolean(),
    hintCount: z.number().int().nonnegative(),
  })
  .strict();

export type FormativeEntry = z.infer<typeof FormativeEntrySchema>;
export type FormativeAnswer = z.infer<typeof FormativeAnswerSchema>;
export type FormativeKind = z.infer<typeof FormativeKindSchema>;
