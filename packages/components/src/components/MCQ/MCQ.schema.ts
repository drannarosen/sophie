import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Single-answer multiple-choice formative parent (ADR 0073
 * Amendment 1 §2). `<MCQ>` renders a Radix RadioGroup of
 * `<MCQ.Choice>` children; the student's selection persists via
 * `useInteractive` under `mcq:${id}:selected`. v1 does NOT auto-grade
 * (ADR 0073 Amendment 1 §10) — the `correct` flag on a choice is read
 * by the extractor (for AS-1) and surfaced as a static
 * `data-correct="true"` attribute that CSS can decorate on reveal. No
 * cross-island reveal coordination: `data-correct` is static; styling
 * is CSS's job.
 *
 * Like every formative parent, `<MCQ>` declares `course`/`unit`/`id`
 * props. The `sophieAutoImportsRemarkPlugin` reads these at MDX compile
 * time and threads `course`/`unit`/`parentId` (from `id`) onto nested
 * `<Solution>` / `<Hint>` descendants. Compile-time threading (rather
 * than React Context) is the only shape that survives Astro's MDX
 * island model.
 *
 * Authoring surface:
 *
 * ```mdx
 * <MCQ course="astr201" unit="m1-l2" id="dominant-fusion">
 *   <MCQ.Prompt>Which process powers a main-sequence star?</MCQ.Prompt>
 *   <MCQ.Choice>Gravitational contraction</MCQ.Choice>
 *   <MCQ.Choice correct>Hydrogen fusion</MCQ.Choice>
 *   <MCQ.Choice>Chemical burning</MCQ.Choice>
 *   <Solution>Main-sequence stars fuse hydrogen into helium in the core.</Solution>
 * </MCQ>
 * ```
 */
export const MCQPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  children: z.custom<ReactNode>(),
});
export type MCQProps = z.infer<typeof MCQPropsSchema>;

/**
 * `<MCQ.Prompt>` — compound prompt slot. Renders as a `<div>` inside
 * the section body above the choices.
 */
export const MCQPromptPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type MCQPromptProps = z.infer<typeof MCQPromptPropsSchema>;

/**
 * `<MCQ.Choice>` — declarative choice child. Renders nothing on its
 * own; the parent walks choices and emits the Radix RadioGroup items.
 * Its slug derives from `slugify(textContent)` unless an explicit `id`
 * is supplied. `correct` is boolean-presence (`<MCQ.Choice correct>`).
 */
export const MCQChoicePropsSchema = z.object({
  id: z.string().min(1).optional(),
  correct: z.boolean().optional(),
  children: z.custom<ReactNode>(),
});
export type MCQChoiceProps = z.infer<typeof MCQChoicePropsSchema>;
