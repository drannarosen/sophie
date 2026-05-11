import type { AuditFinding, ComponentContract } from "../../contract/types.ts";
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
  // Objective ids back IndexedDB keys; two objectives with the same id
  // would race the same persistence key and silently merge checked
  // state. Detect duplicates at audit time so the platform fails
  // loudly during content review rather than mysteriously at runtime.
  audit: (props): AuditFinding[] => {
    const counts = new Map<string, number>();
    for (const objective of props.objectives) {
      counts.set(objective.id, (counts.get(objective.id) ?? 0) + 1);
    }
    const findings: AuditFinding[] = [];
    for (const [id, count] of counts) {
      if (count > 1) {
        findings.push({
          severity: "error",
          message: `Duplicate objective id "${id}" (appears ${count} times). Objective ids back IndexedDB keys; duplicates corrupt checked-state persistence.`,
        });
      }
    }
    return findings;
  },
  containedIn: ["chapter"],
  forbidsContaining: [],
};
