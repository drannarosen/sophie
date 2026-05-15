import { NonEmptyString } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Persistence-bearing chapter primitive. Authored in MDX as
 *
 * ```mdx
 * <LearningObjectives client:load course="..." chapter="..." id="...">
 *   <Objective verb="Recognize" id="lo-1">body</Objective>
 *   <Objective verb="Apply"     id="lo-2">body</Objective>
 * </LearningObjectives>
 * ```
 *
 * The build-time remark transform harvests the `<Objective>` JSX
 * children into a props-driven `objectives` array before the React
 * island runs (see `transformLearningObjectives` in `@sophie/astro`),
 * so the runtime contract is the array — not children. The parent
 * reads/writes one IndexedDB record per (course, chapter, id) tuple
 * — value is `Record<objectiveId, boolean>`.
 *
 * Per ADR 0027: `course`, `chapter`, and `id` are required props.
 * MDX-rendered React components are isolated SSR roots; context
 * providers from outer `client:load` parents do not propagate into
 * the per-island `renderToStaticMarkup` pass. Threading course/chapter
 * as props is the ADR-mandated pattern (also used by
 * `<InteractiveCallout>`).
 *
 * Each `<LearningObjectives>` instance is its own React island via
 * `client:load`.
 */
export const LearningObjectivesPropsSchema = z.object({
  course: NonEmptyString,
  chapter: NonEmptyString,
  id: NonEmptyString,
  heading: z.string().min(1).optional(),
  objectives: z.array(
    z.object({
      id: NonEmptyString,
      verb: NonEmptyString,
      body: NonEmptyString,
    })
  ),
});

export type LearningObjectivesProps = z.infer<
  typeof LearningObjectivesPropsSchema
> & {
  /**
   * Authored as `<Objective>` JSX children in MDX. The remark plugin
   * rewrites them into `objectives` before React sees them. Never
   * passed to React at runtime; only present in the type so MDX
   * authors get type-checking on `<LearningObjectives><Objective>...`.
   */
  children?: ReactNode;
};
