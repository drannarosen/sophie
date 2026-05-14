export { eqRefContract } from "./EqRef.contract.ts";
export {
  type EqRefProps,
  EqRefPropsSchema,
} from "./EqRef.schema.ts";
export { EqRef } from "./EqRef.tsx";
export { __setEquations } from "./equations-store.ts";
// NOTE: lookupEquation is internal (not re-exported), matching the
// GlossaryTerm/index.ts precedent for lookupDefinition.
