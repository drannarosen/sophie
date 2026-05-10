import { z } from "zod";

/**
 * One learning objective. The `id` is author-supplied (not derived) so
 * the persisted "checked" state survives chapter edits and reorders;
 * mirrors the explicit-id pattern Sophie uses for `<InteractiveCallout>`
 * and (future) `<Predict>`. Per
 * [docs/plans/2026-05-10-phase-1-component-trios.md](../../../../docs/plans/2026-05-10-phase-1-component-trios.md).
 */
export const ObjectiveSchema = z.object({
  id: z.string().min(1),
  verb: z.string().min(1),
  body: z.string().min(1),
});

export type Objective = z.infer<typeof ObjectiveSchema>;

/**
 * Persistence-bearing chapter primitive. Each objective renders as a
 * checkable list item; per-objective checked state persists per-course/
 * profile/chapter/component-id/objective-id via `useInteractive`.
 *
 * Per ADR 0027: course, chapter, and id are required props (per-instance
 * hydration; the MDX render boundary doesn't propagate context). Each
 * `<LearningObjectives>` instance is its own React island via
 * `client:load`.
 */
export const LearningObjectivesPropsSchema = z.object({
  course: z.string().min(1),
  chapter: z.string().min(1),
  id: z.string().min(1),
  objectives: z.array(ObjectiveSchema).min(1),
  heading: z.string().min(1).optional(),
});

export type LearningObjectivesProps = z.infer<
  typeof LearningObjectivesPropsSchema
>;
