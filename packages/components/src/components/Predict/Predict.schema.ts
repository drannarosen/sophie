import type { ReactNode } from "react";
import { z } from "zod";

/**
 * One prediction prompt. `id` is author-supplied (matches the
 * explicit-id pattern Sophie uses for `<InteractiveCallout>`,
 * `<LearningObjectives>`'s objectives, and `<InteractiveCheckbox>`)
 * so the persisted answer survives chapter edits/reorders.
 */
export const PredictPromptSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export type PredictPrompt = z.infer<typeof PredictPromptSchema>;

/**
 * Persistence-bearing predict-then-discuss primitive. Reflection-only
 * v1: each prompt gets a textarea; persistence per prompt via
 * `useInteractive`. When `children` are provided, a gated "Reveal"
 * button shows the children once all prompts have non-empty content.
 *
 * Self-assessment widgets (confidence, comprehension, effort,
 * reflection beyond the textareas) are deliberately out of scope and
 * will land in a separate self-assessment component family. See
 * [docs/plans/2026-05-10-phase-1-component-trios.md § Predict](../../../../docs/plans/2026-05-10-phase-1-component-trios.md#predict).
 */
export const PredictPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  description: z.string().min(1).optional(),
  prompts: z.array(PredictPromptSchema).min(1),
  closing: z.string().min(1).optional(),
  heading: z.string().min(1).optional(),
  children: z.custom<ReactNode>().optional(),
});

export type PredictProps = z.infer<typeof PredictPropsSchema>;
