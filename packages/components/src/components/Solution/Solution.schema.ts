import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Reveal-child component for the formative family (ADR 0073
 * Amendment 1 §2 + §3). `<Solution>` is the single canonical
 * "show the worked answer" disclosure inside any formative-parent
 * scope. Pairs with `<Hint>` (the graduated-help sibling).
 *
 * Parent-prop threaded at MDX compile time: `<Solution>` requires
 * explicit `course`, `unit`, and `parentId` props. Authors do NOT
 * write these in MDX — the Sophie remark plugin walks any
 * formative-parent block (`<MCQ>` / `<MultiSelect>` / `<FillBlank>` /
 * `<NumericQuestion>` / `<QuickCheck>` / `<PracticeProblem>`) and
 * injects the parent's `course`/`unit`/`id` down to nested
 * `<Solution>` and `<Hint>` children. This compile-time threading
 * (rather than React Context) is the only shape that survives
 * Astro's MDX island model, where each top-level JSX tag SSRs as
 * its own React tree and Context cannot span siblings.
 *
 * Author surface stays compact:
 *
 * ```mdx
 * <PracticeProblem course="astr201" unit="m1-l2" id="kepler-3">
 *   <PracticeProblem.Prompt>Compute T given a = 1 AU.</PracticeProblem.Prompt>
 *   <Hint number={1}>Apply Kepler's third law.</Hint>
 *   <Solution>$T = a^{3/2} = 1$ year.</Solution>
 * </PracticeProblem>
 * ```
 *
 * After the remark plugin runs, the compiled tree carries
 * `course="astr201" unit="m1-l2" parentId="kepler-3"` on the
 * `<Solution>` element. Storybook + Vitest authors who bypass the
 * plugin must pass these props explicitly.
 *
 * Persistence: open/closed state persists via `useInteractive` (ADRs
 * 0004, 0007) under the key `solution:${parentId}:open` (a `string[]`
 * — multi-shape carried through from Radix Accordion even though
 * `<Solution>` only ever has one slug).
 */
export const SolutionPropsSchema = z
  .object({
    course: z.string().min(1),
    unit: z.string().min(1),
    parentId: z.string().min(1),
    /**
     * Optional trigger-label override. Default flips between
     * "Show solution" (closed) and "Hide solution" (open); a custom
     * label stays fixed across both states.
     */
    label: z.string().min(1).optional(),
    children: z.custom<ReactNode>(),
  })
  .strict();
export type SolutionProps = z.infer<typeof SolutionPropsSchema>;
