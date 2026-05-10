import type { ComponentContract } from "../../contract/types.ts";
import {
  type LearningObjectivesProps,
  LearningObjectivesPropsSchema,
} from "./LearningObjectives.schema.ts";
import { LearningObjectives } from "./LearningObjectives.tsx";

/**
 * Persistence state shape: `Record<objectiveId, checked>`. Keyed by
 * the author-supplied `objective.id` so reorders/edits don't corrupt
 * student state. Each entry is written to IndexedDB via
 * `useInteractive` under `learning-objectives:${componentId}:${objectiveId}:checked`.
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
  audit: () => [],
  containedIn: ["chapter"],
  forbidsContaining: [],
};
