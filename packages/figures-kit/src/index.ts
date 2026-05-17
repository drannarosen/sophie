// @sophie/figures-kit — universal interactive-figure chrome kit.
//
// Primitives are added per-commit in subsequent commits (one TDD'd
// commit per primitive). This index.ts barrel exports them as they
// land.

export { figureContract } from "./Figure/Figure.contract.ts";
export {
  type FigureProps,
  FigurePropsSchema,
} from "./Figure/Figure.schema.ts";
export { Figure } from "./Figure/Figure.tsx";
