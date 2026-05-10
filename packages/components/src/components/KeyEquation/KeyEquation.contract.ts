import type { ComponentContract } from "../../contract/types.ts";
import {
  type KeyEquationProps,
  KeyEquationPropsSchema,
} from "./KeyEquation.schema.ts";
import { KeyEquation } from "./KeyEquation.tsx";

// KeyEquation is content-only. There's no per-instance state to serialize;
// `state` is `null`. The contract type defaults to `never` for the state
// generic; we pass `null` as the state type to make the no-state shape
// explicit.
export const keyEquationContract: ComponentContract<KeyEquationProps, null> = {
  Component: KeyEquation,
  schema: KeyEquationPropsSchema,
  serialize: (props) => ({
    type: "key-equation",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
