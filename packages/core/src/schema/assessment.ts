import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `AssessmentTypeSchema` — discriminator for the four assessment variants
 * (per [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)).
 *
 * - `assignment`: submission window; feedback after due date; rubric-graded.
 * - `practice`: instant feedback; unlimited retry; FSRS-scheduled.
 * - `diagnostic`: required-for-completion not-grade; feeds BKT mastery.
 * - `exam`: time-locked; scope-restricted; high-stakes.
 */
export const AssessmentTypeSchema = z.enum([
  "assignment",
  "practice",
  "diagnostic",
  "exam",
]);
export type AssessmentType = z.infer<typeof AssessmentTypeSchema>;

/**
 * `AssessmentItemTypeSchema` — auto-gradable item kinds. Per
 * [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)
 * Auto-grading scope table. Open-ended written responses go through
 * external rubric grading (Canvas at Tier 1/2; AI-aligned at Tier 3).
 */
export const AssessmentItemTypeSchema = z.enum([
  "multiple-choice",
  "multiple-select",
  "numerical",
  "short-text",
  "code",
  "plotly-chart",
  "concept-map",
  "equation-derivation",
]);
export type AssessmentItemType = z.infer<typeof AssessmentItemTypeSchema>;

const ItemMultipleChoiceSchema = z.object({
  id: Slug,
  type: z.literal("multiple-choice"),
  prompt: NonEmptyString,
  options: z.array(NonEmptyString).min(2),
  answer: NonEmptyString,
});
const ItemMultipleSelectSchema = z.object({
  id: Slug,
  type: z.literal("multiple-select"),
  prompt: NonEmptyString,
  options: z.array(NonEmptyString).min(2),
  answer: z.array(NonEmptyString).min(1),
});
const ItemNumericalSchema = z.object({
  id: Slug,
  type: z.literal("numerical"),
  prompt: NonEmptyString,
  answer: z.number(),
  tolerance: z.number().nonnegative(),
});
const ItemShortTextSchema = z.object({
  id: Slug,
  type: z.literal("short-text"),
  prompt: NonEmptyString,
  answer_pattern: NonEmptyString,
});
const ItemCodeSchema = z.object({
  id: Slug,
  type: z.literal("code"),
  prompt: NonEmptyString,
  language: z.enum(["python"]),
  test_cases: z.array(NonEmptyString).min(1),
});
const ItemPlotlyChartSchema = z.object({
  id: Slug,
  type: z.literal("plotly-chart"),
  prompt: NonEmptyString,
  expected_spec_hash: NonEmptyString.optional(),
});
const ItemConceptMapSchema = z.object({
  id: Slug,
  type: z.literal("concept-map"),
  prompt: NonEmptyString,
  expected_graph: z.record(NonEmptyString, z.array(NonEmptyString)),
});
const ItemEquationDerivationSchema = z.object({
  id: Slug,
  type: z.literal("equation-derivation"),
  prompt: NonEmptyString,
  expected_sympy: NonEmptyString,
});

export const AssessmentItemSchema = z.discriminatedUnion("type", [
  ItemMultipleChoiceSchema,
  ItemMultipleSelectSchema,
  ItemNumericalSchema,
  ItemShortTextSchema,
  ItemCodeSchema,
  ItemPlotlyChartSchema,
  ItemConceptMapSchema,
  ItemEquationDerivationSchema,
]);
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>;

const AssessmentStakesSchema = z.enum(["formative", "low", "high"]);
const AssessmentScheduleSchema = z.object({
  released_at: z.iso.datetime().optional(),
  due_at: z.iso.datetime().optional(),
  late_policy: NonEmptyString.optional(),
  duration_minutes: z.number().positive().optional(),
  time_limit_minutes: z.number().positive().optional(),
});
const AssessmentFeedbackSchema = z.object({
  timing: z.enum(["inline", "asynchronous"]),
  format: NonEmptyString.optional(),
});
const AssessmentReferencesSchema = z
  .object({
    units: z.array(NonEmptyString).default([]),
    equations: z.array(NonEmptyString).default([]),
    skills: z.array(NonEmptyString).default([]),
    misconceptions: z.array(NonEmptyString).default([]),
    los: z.array(NonEmptyString).default([]),
  })
  .partial()
  .default({});
const AssessmentScopeSchema = z
  .object({
    sections: z.array(NonEmptyString).default([]),
    modules: z.array(NonEmptyString).default([]),
  })
  .partial()
  .default({});
const AssessmentSubmissionSchema = z.object({
  mode: z.enum(["in-app", "external"]).default("in-app"),
  external_location: NonEmptyString.optional(),
});

/**
 * `AssessmentSchema` — unified entity for assignment / practice / diagnostic /
 * exam (per [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)).
 * Type tag drives UX, submission flow, feedback timing.
 *
 * `required: "completion"` applies to diagnostics — must be done to
 * proceed but not graded on outcome.
 *
 * `rubric_id` is a string reference to a `RubricSchema` (authored once,
 * reused across Assessments) rather than a nested Rubric.
 */
export const AssessmentSchema = z.object({
  id: Slug,
  type: AssessmentTypeSchema,
  title: NonEmptyString,
  description: z.string().optional(),
  prompt: NonEmptyString,
  schedule: AssessmentScheduleSchema.optional(),
  rubric_id: NonEmptyString.optional(),
  items: z.array(AssessmentItemSchema).default([]),
  references: AssessmentReferencesSchema,
  scope: AssessmentScopeSchema.optional(),
  stakes: AssessmentStakesSchema,
  required: z.enum(["completion", "grade"]).optional(),
  submission: AssessmentSubmissionSchema.optional(),
  feedback: AssessmentFeedbackSchema,
});

export type Assessment = z.infer<typeof AssessmentSchema>;
