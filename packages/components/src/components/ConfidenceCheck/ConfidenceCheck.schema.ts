import { z } from "zod";

/** Likert scale length. v1 supports 5- and 7-point scales. */
export const ConfidenceScale = z.union([z.literal(5), z.literal(7)]);
export type ConfidenceScale = z.infer<typeof ConfidenceScale>;

/**
 * Self-assessment widget for capturing student confidence as a Likert
 * scale. Per ADR 0027: course/chapter/id required for per-instance
 * hydration. Persistence keyed under
 * `self-assessment:confidence:${id}` via `useSelfAssessment`.
 */
export const ConfidenceCheckPropsSchema = z.object({
  course: z.string().min(1),
  chapter: z.string().min(1),
  id: z.string().min(1),
  prompt: z.string().min(1),
  scale: ConfidenceScale.optional(),
});

export type ConfidenceCheckProps = z.infer<typeof ConfidenceCheckPropsSchema>;
