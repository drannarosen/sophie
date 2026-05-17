import type { ComponentContract } from "../../contract/types.ts";
import {
  type BreaksWhenProps,
  BreaksWhenPropsSchema,
} from "./BreaksWhen.schema.ts";
import { BreaksWhen } from "./BreaksWhen.tsx";

export const breaksWhenContract: ComponentContract<BreaksWhenProps, null> = {
  Component: BreaksWhen,
  schema: BreaksWhenPropsSchema,
  serialize: (props) => ({
    type: "breaks-when",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["key-equation"],
  forbidsContaining: [],
};
