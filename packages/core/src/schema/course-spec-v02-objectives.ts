import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * Course-level learning objective (LO). Distinct from terminal goals
 * (TG#) which are course-completion outcomes; objectives are the
 * unit-of-LO declared at the chrome layer for syllabus pages + audit
 * coverage. `assessed_by` is an array of grading-category id refs.
 *
 * v0.2 addition per docs/plans/2026-05-26-course-info-projection-design.md.
 */
export const ObjectiveSchema = z
  .object({
    id: Slug,
    verb: NonEmptyString,
    body: NonEmptyString,
    assessed_by: z.array(Slug).optional(),
  })
  .strict();

export type Objective = z.infer<typeof ObjectiveSchema>;
