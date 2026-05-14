import { NonEmptyString } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `<Objective>` — pure-display primitive for a single learning objective.
 *
 * Authored as a child of `<LearningObjectives>` in MDX:
 *
 * ```mdx
 * <LearningObjectives id="ch-objectives">
 *   <Objective verb="Recognize" id="lo-1">body text</Objective>
 * </LearningObjectives>
 * ```
 *
 * Also renders sensibly outside a `<LearningObjectives>` wrapper —
 * e.g., on the `/objectives` course-wide roll-up page — by omitting
 * the optional `checked` and `onToggle` props. The remark extractor
 * walks `<Objective>` flow elements inside `<LearningObjectives>`
 * to populate `PedagogyIndex.objectives` (PR-C4 design doc Task 3).
 *
 * Per ADR 0027: when used inside `<LearningObjectives>`, the parent
 * injects `checked` and `onToggle` via `React.Children.map +
 * cloneElement`. Pure-display callsites omit them and render without
 * a checkbox.
 */
export const ObjectivePropsSchema = z.object({
  id: NonEmptyString,
  verb: NonEmptyString,
  children: z.custom<ReactNode>(),
  /** Injected by `<LearningObjectives>` parent. Omit for pure-display. */
  checked: z.boolean().optional(),
  /** Injected by `<LearningObjectives>` parent. Omit for pure-display. */
  onToggle: z.custom<() => void>().optional(),
});

export type ObjectiveProps = z.infer<typeof ObjectivePropsSchema>;
