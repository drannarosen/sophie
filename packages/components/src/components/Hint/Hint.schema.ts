import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Reveal-child component for the formative family (ADR 0073
 * Amendment 1 §2). `<Hint>` is the graduated-help sibling of
 * `<Solution>`. Multiple `<Hint>` instances at different `number`
 * values render independently — each persists its own open/closed
 * state under the key `hint:${parentId}:${number}:open`.
 *
 * Author surface (sibling of `<Solution>` inside a formative parent):
 *
 * ```mdx
 * <PracticeProblem course="astr201" unit="m1-l2" id="kepler-3">
 *   <PracticeProblem.Prompt>Compute T for a = 1 AU.</PracticeProblem.Prompt>
 *   <Hint number={1}>Start from Kepler's third law.</Hint>
 *   <Hint number={2}>Take the cube root.</Hint>
 *   <Solution>$T = a^{3/2} = 1$ year.</Solution>
 * </PracticeProblem>
 * ```
 *
 * Parent-prop threaded at MDX compile time: `course`/`unit`/`parentId`
 * are required props injected by the Sophie remark plugin from the
 * wrapping formative parent's `course`/`unit`/`id`. Authors do NOT
 * write these in MDX. Compile-time threading (rather than React
 * Context) is the only shape that survives Astro's MDX island model,
 * where each top-level JSX tag SSRs as its own React tree.
 *
 * Persistence via `useInteractive` (ADRs 0004, 0007) under
 * `hint:${parentId}:${number}:open` as a `string[]`.
 *
 * `number` is 1-indexed and required — the index is part of the
 * persistence-key identity (so authors don't rely on render-order
 * inference; W1 — surface the dependency rather than hide it).
 */
export const HintPropsSchema = z
  .object({
    course: z.string().min(1),
    unit: z.string().min(1),
    parentId: z.string().min(1),
    /** 1-indexed sequence number — part of the persistence-key identity. */
    number: z.number().int().positive(),
    /**
     * Optional trigger-label override. Default is `"Hint ${number}"`.
     */
    label: z.string().min(1).optional(),
    children: z.custom<ReactNode>(),
  })
  .strict();
export type HintProps = z.infer<typeof HintPropsSchema>;
