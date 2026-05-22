import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Queued review surface (Wedge B1 retrieval family). Auto-selects
 * past-attempted targets from the `practice_attempt` queue (one
 * record per attempt) and surfaces the `max` least-recently-attempted
 * ones matching the scope filter.
 *
 * Two mutually-exclusive selection scopes:
 *   - `target="prefix:slug"` → review attempts for one pedagogy-graph node
 *   - `section="<slug>"`     → review attempts across a Section's pedagogy
 *     (Wedge B1: stubbed; Wedge B-follow-up wires the pedagogy-index lookup)
 *
 * Per ADR 0027: course/chapter required (per-instance IDB read).
 *
 * `max` defaults to 3 per Wedge B1 design doc §1. Optional
 * `<SpacedReview.Empty>` slot overrides the default empty-state
 * message; absent → component renders a built-in placeholder.
 *
 * Wedge B1 ships an LRU stub scheduler from
 * `retrieval/lruScheduler.ts`; Wedge D swaps in FSRS without API
 * change. Compose with `client:load` in MDX.
 */
export const SpacedReviewPropsSchema = z
  .object({
    course: z.string().min(1),
    chapter: z.string().min(1),
    target: z.string().min(1).optional(),
    section: z.string().min(1).optional(),
    max: z.number().int().positive().optional(),
    children: z.custom<ReactNode>().optional(),
  })
  .refine(
    (v) =>
      (v.target !== undefined && v.section === undefined) ||
      (v.target === undefined && v.section !== undefined),
    {
      message: "SpacedReview requires exactly one of `target` or `section`.",
    }
  );

export type SpacedReviewProps = z.infer<typeof SpacedReviewPropsSchema>;
