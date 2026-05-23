import { NonEmptyString } from "@sophie/core/schema";
import { z } from "zod";

/**
 * `<Objective>` — pure-display primitive for one learning objective.
 *
 * Rendered in two contexts, both via the `body` HTML-string prop:
 *
 *   (a) Inside `<LearningObjectives>` after the remark transform has
 *       harvested it into the parent's `objectives` prop. The parent
 *       renders Objective itself with `checked` + `onToggle` wired up.
 *   (b) On the `/library/objectives` course-wide roll-up page, server-rendered
 *       from `PedagogyIndex.objectives`. `checked`/`onToggle` omitted —
 *       pure display, no checkbox.
 *
 * Authored in MDX as `<Objective id="..." verb="...">prose</Objective>`;
 * the remark plugin harvests attributes + serializes the body via
 * `renderChildrenToHtml`, then rewrites the parent <LearningObjectives>
 * to a props-driven shape. The author-side JSX never reaches React.
 */
export const ObjectivePropsSchema = z.object({
  id: NonEmptyString,
  verb: NonEmptyString,
  /** HTML string. Rendered via dangerouslySetInnerHTML. */
  body: NonEmptyString,
  /** Injected by `<LearningObjectives>` parent. Omit for pure-display. */
  checked: z.boolean().optional(),
  /** Injected by `<LearningObjectives>` parent. Omit for pure-display. */
  onToggle: z.custom<() => void>().optional(),
});

export type ObjectiveProps = z.infer<typeof ObjectivePropsSchema>;
