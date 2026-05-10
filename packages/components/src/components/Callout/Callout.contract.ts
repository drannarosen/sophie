import type { ComponentContract } from "../../contract/types.ts";
import {
  type CalloutProps,
  CalloutPropsSchema,
  type InteractiveCalloutProps,
  InteractiveCalloutPropsSchema,
} from "./Callout.schema.ts";
import { Callout, InteractiveCallout } from "./Callout.tsx";

export const calloutContract: ComponentContract<CalloutProps> = {
  Component: Callout,
  schema: CalloutPropsSchema,
  serialize: (props) => ({
    type: "callout",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: ["callout"],
};

export const interactiveCalloutContract: ComponentContract<
  InteractiveCalloutProps,
  boolean
> = {
  Component: InteractiveCallout,
  schema: InteractiveCalloutPropsSchema,
  serialize: (props, state) => ({
    type: "interactive-callout",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: ["callout", "interactive-callout"],
};
