import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Multiple-answer formative parent (ADR 0073 Amendment 1 §2).
 * `<MultiSelect>` renders one Radix Checkbox per `<MultiSelect.Choice>`;
 * the set of selected choice slugs persists via `useInteractive` under
 * `multi-select:${id}:selected` (a `string[]`). v1 does NOT auto-grade
 * (ADR 0073 Amendment 1 §10) — `correct` flags are read by the
 * extractor (AS-5) and surfaced as static `data-correct="true"`
 * attributes CSS can decorate on reveal. No cross-island reveal
 * coordination.
 *
 * Like every formative parent, `<MultiSelect>` declares
 * `course`/`unit`/`id`; the `sophieAutoImportsRemarkPlugin` threads
 * `course`/`unit`/`parentId` onto nested `<Solution>` / `<Hint>` at
 * MDX compile time.
 *
 * Authoring surface:
 *
 * ```mdx
 * <MultiSelect course="astr201" unit="m1-l2" id="terrestrial-planets">
 *   <MultiSelect.Prompt>Which are terrestrial planets?</MultiSelect.Prompt>
 *   <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
 *   <MultiSelect.Choice>Jupiter</MultiSelect.Choice>
 *   <MultiSelect.Choice correct>Mars</MultiSelect.Choice>
 *   <Solution>Mercury and Mars are rocky; Jupiter is a gas giant.</Solution>
 * </MultiSelect>
 * ```
 */
export const MultiSelectPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  children: z.custom<ReactNode>(),
});
export type MultiSelectProps = z.infer<typeof MultiSelectPropsSchema>;

/**
 * `<MultiSelect.Prompt>` — compound prompt slot. Renders as a `<div>`
 * inside the section body above the choices.
 */
export const MultiSelectPromptPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type MultiSelectPromptProps = z.infer<
  typeof MultiSelectPromptPropsSchema
>;

/**
 * `<MultiSelect.Choice>` — declarative choice child. Renders nothing on
 * its own; the parent walks choices and emits the Radix Checkboxes. Its
 * slug derives from `slugify(textContent)` unless an explicit `id` is
 * supplied. `correct` is boolean-presence (`<MultiSelect.Choice correct>`).
 */
export const MultiSelectChoicePropsSchema = z.object({
  id: z.string().min(1).optional(),
  correct: z.boolean().optional(),
  children: z.custom<ReactNode>(),
});
export type MultiSelectChoiceProps = z.infer<
  typeof MultiSelectChoicePropsSchema
>;
