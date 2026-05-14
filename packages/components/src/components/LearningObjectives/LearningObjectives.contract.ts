import type { ComponentContract } from "../../contract/types.ts";
import {
  type LearningObjectivesProps,
  LearningObjectivesPropsSchema,
} from "./LearningObjectives.schema.ts";
import { LearningObjectives } from "./LearningObjectives.tsx";

/**
 * Persistence state shape: `Record<objectiveId, checked>`. Keyed by
 * the author-supplied `<Objective id>` so reorders/edits don't
 * corrupt student state. One IndexedDB record per
 * (course, chapter, id) tuple under
 * `learning-objectives:${id}:checked`.
 *
 * Per PR-C4 (children-mode refactor): the LO parent reads/writes the
 * full record; the build-time pedagogy-audit (`pedagogy-audit.ts`)
 * reasons across chapters about duplicate `<Objective id>` (O1) +
 * zero-objective chapters (O2). The per-component contract audit is
 * a no-op because the children-mode shape moves the duplicate-id
 * check into a static-extraction concern (the remark plugin walks
 * `<Objective>` flow elements per chapter and raises O1 there).
 */
export type LearningObjectivesState = Record<string, boolean>;

export const learningObjectivesContract: ComponentContract<
  LearningObjectivesProps,
  LearningObjectivesState
> = {
  Component: LearningObjectives,
  schema: LearningObjectivesPropsSchema,
  serialize: (props, state) => ({
    type: "learning-objectives",
    props,
    state,
  }),
  // No runtime audit at the component level. Duplicate-id detection
  // happens at remark-extraction time (PR-C4 O1 invariant) and at
  // build-time `runPedagogyAudit()`; the children-mode JSX shape
  // means the contract no longer has access to the objective list.
  audit: () => [],
  containedIn: ["chapter"],
  forbidsContaining: [],
};
