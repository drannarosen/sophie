import type { ComponentContract } from "../../contract/types.ts";
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
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
