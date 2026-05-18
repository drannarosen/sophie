export { equationRefContract } from "./EquationRef.contract.ts";
export {
  type EquationRefProps,
  EquationRefPropsSchema,
} from "./EquationRef.schema.ts";
export { EquationRef } from "./EquationRef.tsx";
export { __setEquations } from "./equations-store.ts";
// NOTE: lookupEquation is internal (not re-exported), matching the
// GlossaryTerm/index.ts precedent for lookupDefinition.
