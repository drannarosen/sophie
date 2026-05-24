import type {
  ComponentAuditFinding,
  ComponentContract,
} from "../../contract/types.ts";
import { type PredictProps, PredictPropsSchema } from "./Predict.schema.ts";
import { Predict } from "./Predict.tsx";

/**
 * Persisted state shape for `<Predict>`:
 * - `answers`: per-prompt textarea content, keyed by prompt.id
 * - `revealed`: boolean (only relevant when the component was given
 *   children to gate)
 *
 * Per-key IDB writes happen via individual `useInteractive` calls
 * (one per prompt + one for revealed). The aggregate shape here
 * documents what a future `serialize` consumer would observe.
 */
export interface PredictState {
  answers: Record<string, string>;
  revealed: boolean;
}

export const predictContract: ComponentContract<PredictProps, PredictState> = {
  Component: Predict,
  schema: PredictPropsSchema,
  serialize: (props, state) => ({
    type: "predict",
    props,
    state,
  }),
  // Prompt ids back IndexedDB keys (one useInteractive per prompt);
  // duplicates would race the same persistence key and silently
  // merge answers. Detect at audit time.
  audit: (props): ComponentAuditFinding[] => {
    const counts = new Map<string, number>();
    for (const prompt of props.prompts) {
      counts.set(prompt.id, (counts.get(prompt.id) ?? 0) + 1);
    }
    const findings: ComponentAuditFinding[] = [];
    for (const [id, count] of counts) {
      if (count > 1) {
        findings.push({
          severity: "error",
          message: `Duplicate prompt id "${id}" (appears ${count} times). Prompt ids back IndexedDB keys; duplicates corrupt answer persistence.`,
        });
      }
    }
    return findings;
  },
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
