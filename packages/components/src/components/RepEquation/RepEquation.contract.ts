import type { ComponentContract } from "../../contract/types.ts";
import {
  type RepEquationProps,
  RepEquationPropsSchema,
} from "./RepEquation.schema.ts";
import { RepEquation } from "./RepEquation.tsx";

export const repEquationContract: ComponentContract<RepEquationProps, null> = {
  Component: RepEquation,
  schema: RepEquationPropsSchema,
  serialize: (props) => ({
    type: "rep-equation",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["multirep"],
  forbidsContaining: [],
};
