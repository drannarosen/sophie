import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Numeric-answer formative parent (ADR 0073 Amendment 1 §2).
 * `<NumericQuestion>` renders a single free-text input; the student's
 * raw input persists via `useInteractive` under `numeric:${id}:value`.
 * The expected answer + tolerance live on a self-closing
 * `<NumericQuestion.Answer>` declarative child that renders nothing —
 * the extractor reads its attributes (AS-4). v1 does NOT validate the
 * student input or auto-grade (ADR 0073 Amendment 1 §10); the input is
 * `type="text"` (not `type="number"`) because student answers may
 * carry units, commas, or scientific notation.
 *
 * Like every formative parent, `<NumericQuestion>` declares
 * `course`/`unit`/`id`; the `sophieAutoImportsRemarkPlugin` threads
 * `course`/`unit`/`parentId` onto nested `<Solution>` / `<Hint>` at
 * MDX compile time.
 *
 * Authoring surface:
 *
 * ```mdx
 * <NumericQuestion course="astr201" unit="m1-l2" id="kepler-period">
 *   <NumericQuestion.Prompt>
 *     Compute the period T (years) of a planet at a = 4 AU around 1 M☉.
 *   </NumericQuestion.Prompt>
 *   <NumericQuestion.Answer value={8} tolerance={0.1} toleranceKind="relative" unit="yr" />
 *   <Solution>T = a^(3/2) = 4^(3/2) = 8 years.</Solution>
 * </NumericQuestion>
 * ```
 */
export const NumericQuestionPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  children: z.custom<ReactNode>(),
});
export type NumericQuestionProps = z.infer<typeof NumericQuestionPropsSchema>;

/**
 * `<NumericQuestion.Prompt>` — compound prompt slot. Renders as a
 * `<div>` inside the section body above the input.
 */
export const NumericQuestionPromptPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type NumericQuestionPromptProps = z.infer<
  typeof NumericQuestionPromptPropsSchema
>;

/**
 * `<NumericQuestion.Answer>` — self-closing declarative child. Renders
 * nothing; the extractor reads `value`/`tolerance`/`toleranceKind`/
 * `unit` to materialize the `numeric` answer variant + run AS-4.
 */
export const NumericQuestionAnswerPropsSchema = z.object({
  value: z.number(),
  tolerance: z.number().nonnegative(),
  toleranceKind: z.enum(["absolute", "relative"]),
  unit: z.string().optional(),
});
export type NumericQuestionAnswerProps = z.infer<
  typeof NumericQuestionAnswerPropsSchema
>;
