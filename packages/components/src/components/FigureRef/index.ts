export { figureRefContract } from "./FigureRef.contract.ts";
export {
  type FigureRefProps,
  FigureRefPropsSchema,
} from "./FigureRef.schema.ts";
export { FigureRef } from "./FigureRef.tsx";
export { __setFigureRegistry } from "./figure-registry-store.ts";
export { __setFigureUsages } from "./figure-usages-store.ts";
// NOTE: lookup functions are internal (not re-exported), matching
// the GlossaryTerm + EqRef precedent for lookupDefinition /
// lookupEquation.
