// A11 — linked-representation state primitive (per ADR 0059).
// Per ADR 0058, primitives in this module are chrome (no epistemicRole).
// Consumers (chapter components) carry the epistemic roles.

export { parameterCursorContract } from "./ParameterCursor.contract.ts";
export {
  type ParameterCursorProps,
  ParameterCursorPropsSchema,
} from "./ParameterCursor.schema.ts";
export { ParameterCursor } from "./ParameterCursor.tsx";
export { parameterSliderContract } from "./ParameterSlider.contract.ts";
export {
  type ParameterSliderProps,
  ParameterSliderPropsSchema,
} from "./ParameterSlider.schema.ts";
export { ParameterSlider } from "./ParameterSlider.tsx";

export {
  type ParameterDefinition,
  type ParameterStoreState,
  useParameterStore,
} from "./store.ts";

export { useLinkedParameter } from "./useLinkedParameter.ts";
