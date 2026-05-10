import type { ComponentContract } from "../../contract/types.ts";
import { type CalloutProps, CalloutPropsSchema } from "./Callout.schema.ts";
import { Callout } from "./Callout.tsx";

export const calloutContract: ComponentContract<CalloutProps, boolean> = {
  Component: Callout,
  schema: CalloutPropsSchema,
  serialize: (props, state) => ({
    type: "callout",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: ["callout"],
};
