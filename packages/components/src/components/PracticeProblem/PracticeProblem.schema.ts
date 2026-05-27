import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Persistence-bearing-by-prop-threading shell for a practice problem
 * (ADR 0073 Amendment 1 §2). `<PracticeProblem>` owns no IDB key
 * itself; its `course`/`unit`/`id` props are read by the Sophie remark
 * plugin at MDX compile time and threaded down to nested `<Solution>`
 * and `<Hint>` children as their explicit `course`/`unit`/`parentId`
 * props. The descendants are the persistence-bearing pieces; the
 * shell is the namespace owner + landmark.
 *
 * The compile-time-threading shape (rather than React Context) is the
 * only one that survives Astro's MDX island model — each top-level
 * MDX JSX tag SSRs as its own React tree, so Context cannot span
 * sibling islands.
 *
 * Per ADR 0027 (per-instance hydration across the Astro MDX render
 * boundary): `course` / `unit` / `id` are required props. The
 * `sophieAutoImportsRemarkPlugin` auto-injects `client:load` at MDX
 * compile time + threads `course` / `unit` / `parentId` (from `id`)
 * down to `<Solution>` / `<Hint>` descendants — authors don't write
 * either themselves.
 *
 * Per R10 (landmark choice when nested under a parent landmark): the
 * shell renders `<section aria-labelledby={`${id}-label`}>` inside the
 * chapter layout's `<main>`. The label heading is a visible `<h3>` so
 * the section's accessible name is announced to assistive tech and
 * also reads as a visual section header in the rendered prose.
 *
 * Authoring surface (compound `<PracticeProblem.Prompt>` child is
 * optional but conventional — it carves a labeled prompt block out of
 * the section's body):
 *
 * ```mdx
 * <PracticeProblem course="astr201" unit="m1-l2" id="kepler-3">
 *   <PracticeProblem.Prompt>
 *     Compute T given $a = 1$ AU.
 *   </PracticeProblem.Prompt>
 *   <Hint number={1}>Apply Kepler's third law.</Hint>
 *   <Solution>$T = a^{3/2} = 1$ year.</Solution>
 * </PracticeProblem>
 * ```
 */
export const PracticeProblemPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  children: z.custom<ReactNode>(),
});
export type PracticeProblemProps = z.infer<typeof PracticeProblemPropsSchema>;

/**
 * `<PracticeProblem.Prompt>` — optional compound child carving out a
 * labeled prompt block. Renders as a `<div>` inside the section body.
 */
export const PracticeProblemPromptPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type PracticeProblemPromptProps = z.infer<
  typeof PracticeProblemPromptPropsSchema
>;
