import type { ComponentContract } from "../../contract/types.ts";
import {
  type ComprehensionGateProps,
  ComprehensionGatePropsSchema,
  type ComprehensionLevel,
} from "./ComprehensionGate.schema.ts";
import { ComprehensionGate } from "./ComprehensionGate.tsx";

export const comprehensionGateContract: ComponentContract<
  ComprehensionGateProps,
  ComprehensionLevel | ""
> = {
  Component: ComprehensionGate,
  schema: ComprehensionGatePropsSchema,
  serialize: (props, state) => ({
    type: "comprehension-gate",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
