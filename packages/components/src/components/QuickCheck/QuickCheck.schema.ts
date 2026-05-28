import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Free-response / self-check formative parent (ADR 0073 Amendment 1
 * §2). `<QuickCheck>` is the simplest formative shape: it owns no
 * input of its own and persists nothing — its only job is to be a
 * labeled landmark + namespace owner for nested `<Solution>` / `<Hint>`
 * reveal children. Students reason on their own, then reveal the
 * solution.
 *
 * Like every formative parent, `<QuickCheck>` declares `course`/`unit`/
 * `id` props. The `sophieAutoImportsRemarkPlugin` reads these at MDX
 * compile time and threads `course`/`unit`/`parentId` (from `id`) down
 * to nested `<Solution>` / `<Hint>` descendants — authors never write
 * those on the children. Compile-time threading (rather than React
 * Context) is the only shape that survives Astro's MDX island model,
 * where each top-level JSX tag SSRs as its own React tree and Context
 * cannot span siblings.
 *
 * Per R10 (landmark choice when nested under a parent landmark): the
 * shell renders `<section aria-labelledby={`${id}-label`}>` inside the
 * chapter layout's `<main>`. The label heading is a visible `<h3>` so
 * the section's accessible name is announced to assistive tech and
 * also reads as a visual section header in rendered prose.
 *
 * Authoring surface:
 *
 * ```mdx
 * <QuickCheck course="astr201" unit="m1-l2" id="parallax-direction">
 *   <QuickCheck.Prompt>
 *     Why do nearer stars show larger parallax?
 *   </QuickCheck.Prompt>
 *   <Hint number={1}>Think about the angle subtended.</Hint>
 *   <Solution>Closer objects subtend a larger angle for the same baseline.</Solution>
 * </QuickCheck>
 * ```
 */
export const QuickCheckPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  children: z.custom<ReactNode>(),
});
export type QuickCheckProps = z.infer<typeof QuickCheckPropsSchema>;

/**
 * `<QuickCheck.Prompt>` — optional compound child carving out a
 * labeled prompt block. Renders as a `<div>` inside the section body.
 */
export const QuickCheckPromptPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type QuickCheckPromptProps = z.infer<typeof QuickCheckPromptPropsSchema>;
