import type { ComponentContract } from "../../contract/types.ts";
import {
  type ConfidenceCheckProps,
  ConfidenceCheckPropsSchema,
} from "./ConfidenceCheck.schema.ts";
import { ConfidenceCheck } from "./ConfidenceCheck.tsx";

export const confidenceCheckContract: ComponentContract<
  ConfidenceCheckProps,
  number
> = {
  Component: ConfidenceCheck,
  schema: ConfidenceCheckPropsSchema,
  serialize: (props, state) => ({
    type: "confidence-check",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
