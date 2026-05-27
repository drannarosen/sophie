import type { ComponentContract } from "../../contract/types.ts";
import { type HintProps, HintPropsSchema } from "./Hint.schema.ts";
import { Hint } from "./Hint.tsx";

export const hintContract: ComponentContract<HintProps, string[]> = {
  Component: Hint,
  schema: HintPropsSchema,
  serialize: (props, state) => ({
    type: "hint",
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
