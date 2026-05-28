import { z } from "zod";

/**
 * Props for `<MCQController>` — the childless interactivity island that
 * `sophieCompoundExpandRemarkPlugin` emits when it lowers an authored
 * `<MCQ>` into static `<fieldset>` markup (Task 2/3 of the compound-
 * island transform; ADR 0073 Amendment 1).
 *
 * `course` / `unit` / `id` mirror the parent `<MCQ>`'s namespace; the
 * controller reaches into the static radio group by `name="mcq-${id}"`
 * and persists the student's selection via `useInteractive` under
 * `mcq:${id}:selected`. All three are non-empty strings (ADR 0003 —
 * Zod is the source of truth), matching the `(course, unit, id)` triple
 * every formative parent declares.
 */
export const MCQControllerPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
});

export type MCQControllerProps = z.infer<typeof MCQControllerPropsSchema>;
