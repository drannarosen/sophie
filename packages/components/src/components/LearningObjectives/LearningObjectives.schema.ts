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
 * The parent reads/writes one IndexedDB record per (course, chapter,
 * id) tuple — value is `Record<objectiveId, boolean>`. Per-objective
 * `checked` + `onToggle` is injected into each `<Objective>` child via
 * `React.Children.map` + `cloneElement` at render time.
 *
 * Per ADR 0027: `course`, `chapter`, and `id` are required props.
 * MDX-rendered React components are isolated SSR roots; context
 * providers from outer `client:load` parents do not propagate into
 * the per-island `renderToStaticMarkup` pass. Threading course/chapter
 * as props is the ADR-mandated pattern (also used by
 * `<InteractiveCallout>`). The PR-C4 implementer caught the original
 * design doc's `useChapterContext` proposal as conflicting with ADR
 * 0027 before writing code; revised to keep props.
 *
 * Each `<LearningObjectives>` instance is its own React island via
 * `client:load`.
 */
export const LearningObjectivesPropsSchema = z.object({
  course: NonEmptyString,
  chapter: NonEmptyString,
  id: NonEmptyString,
  heading: z.string().min(1).optional(),
  children: z.custom<ReactNode>(),
});

export type LearningObjectivesProps = z.infer<
  typeof LearningObjectivesPropsSchema
>;
