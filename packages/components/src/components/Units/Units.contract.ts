import type { ComponentContract } from "../../contract/types.ts";
import { type UnitsProps, UnitsPropsSchema } from "./Units.schema.ts";
import { Units } from "./Units.tsx";

export const unitsContract: ComponentContract<UnitsProps, null> = {
  Component: Units,
  schema: UnitsPropsSchema,
  serialize: (props) => ({
    type: "units",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["key-equation"],
  forbidsContaining: [],
};
