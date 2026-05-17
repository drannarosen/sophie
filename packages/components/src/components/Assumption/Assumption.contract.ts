import type { ComponentContract } from "../../contract/types.ts";
import {
  type AssumptionProps,
  AssumptionPropsSchema,
} from "./Assumption.schema.ts";
import { Assumption } from "./Assumption.tsx";

export const assumptionContract: ComponentContract<AssumptionProps, null> = {
  Component: Assumption,
  schema: AssumptionPropsSchema,
  serialize: (props) => ({
    type: "assumption",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["key-equation"],
  forbidsContaining: [],
};
