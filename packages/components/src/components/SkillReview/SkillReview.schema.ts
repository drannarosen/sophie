import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Inline prereq-bridge prompt (Wedge B1 retrieval family).
 *
 * Same target-prefix convention as RetrievalPrompt + SpacedReview;
 * unifies ADR 0068's previously-`topic`-only signature per Wedge B1
 * design doc §1.
 *
 * Slot children OPTIONAL (vs. required on RetrievalPrompt):
 * - WITH `<SkillReview.Prompt>` + `<SkillReview.Answer>`: explicit
 *   prereq content. Works fully in Wedge B1.
 * - WITHOUT children: auto-resolves from topic registry (Wedge C path,
 *   not yet shipped). B1 falls back to a placeholder.
 *
 * Optional `<SkillReview.ReviewMore>` slot overrides the
 * auto-generated "Refresher on <topic> →" link to Library.
 *
 * Per ADR 0027: course/chapter required (per-instance IDB hydration).
 * BKT-adaptive prominence deferred to Wedge E; B1 ships page-type-
 * default only.
 */
export const SkillReviewPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  target: z.string().min(1),
  children: z.custom<ReactNode>().optional(),
});

export type SkillReviewProps = z.infer<typeof SkillReviewPropsSchema>;
