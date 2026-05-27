import type { ComponentContract } from "../../contract/types.ts";
import { type SolutionProps, SolutionPropsSchema } from "./Solution.schema.ts";
import { Solution } from "./Solution.tsx";

export const solutionContract: ComponentContract<SolutionProps, string[]> = {
  Component: Solution,
  schema: SolutionPropsSchema,
  serialize: (props, state) => ({
    type: "solution",
    props,
    state,
  }),
  audit: () => [],
  containedIn: [
    "mcq",
    "multi-select",
    "fill-blank",
    "numeric-question",
    "quickcheck",
    "practice-problem",
  ],
  forbidsContaining: [],
};
