import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * Retrieval-family pedagogy entries — `<RetrievalPrompt>`,
 * `<SpacedReview>`, `<SkillReview>` (Wedge B1).
 *
 * Anchor convention (per the canonical prefix table in
 * `pedagogy-index.ts`):
 *
 * | Component        | Prefix  | Source                                |
 * |------------------|---------|---------------------------------------|
 * | RetrievalPrompt  | `rp-`   | auto: `rp-${counter}` (per chapter)   |
 * | SpacedReview     | `sp-`   | auto: `sp-${counter}` (per chapter)   |
 * | SkillReview      | `sk-`   | auto: `sk-${counter}` (per chapter)   |
 *
 * Each entry carries the prefix-typed `target_id` (or in
 * SpacedReview's case `section_id`) so the curriculum-CI invariants
 * (PRA-1, RET-1, SR-1) can resolve refs against the rest of the
 * PedagogyIndex.
 */

/**
 * One `<RetrievalPrompt target="prefix:slug">` callsite. Powers
 * the RET-1 retrieval-coverage invariant + the future Cockpit's
 * "what targets did this chapter ask the student to recall?" view.
 */
export const RetrievalPromptEntrySchema = z.object({
  chapter: Slug,
  anchor: NonEmptyString,
  target_id: NonEmptyString,
});
export type RetrievalPromptEntry = z.infer<typeof RetrievalPromptEntrySchema>;

/**
 * One `<SpacedReview>` callsite. Exactly one of `target_id` or
 * `section_id` is set (matches the Zod refine on the component
 * props). `max` carries the author-supplied limit (or the component
 * default).
 *
 * Powers the SR-1 invariant (target_id / section_id must resolve to
 * a real pedagogy-graph node or Section slug).
 */
export const SpacedReviewEntrySchema = z
  .object({
    chapter: Slug,
    anchor: NonEmptyString,
    target_id: NonEmptyString.optional(),
    section_id: NonEmptyString.optional(),
    max: z.number().int().positive(),
  })
  .refine(
    (v) =>
      (v.target_id !== undefined && v.section_id === undefined) ||
      (v.target_id === undefined && v.section_id !== undefined),
    {
      message:
        "SpacedReviewEntry requires exactly one of `target_id` or `section_id`.",
    }
  );
export type SpacedReviewEntry = z.infer<typeof SpacedReviewEntrySchema>;

/**
 * One `<SkillReview target="prefix:slug">` callsite. `has_explicit_content`
 * indicates whether the author supplied `<SkillReview.Prompt>` +
 * `<SkillReview.Answer>` children (B1 explicit path) versus the
 * Library-placeholder fallback (Wedge C path, not yet shipped).
 *
 * Powers the PRA-1 invariant (every Unit's declared `prereqs[]` topic
 * has ≥1 SkillReview surface in the same Section).
 */
export const SkillReviewEntrySchema = z.object({
  chapter: Slug,
  anchor: NonEmptyString,
  target_id: NonEmptyString,
  has_explicit_content: z.boolean(),
});
export type SkillReviewEntry = z.infer<typeof SkillReviewEntrySchema>;
