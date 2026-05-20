import type { ComponentContract } from "../../contract/types.ts";
import { type OMIFlowProps, OMIFlowPropsSchema } from "./OMIFlow.schema.ts";
import { OMIFlow } from "./OMIFlow.tsx";

export const omiFlowContract: ComponentContract<OMIFlowProps> = {
  Component: OMIFlow,
  schema: OMIFlowPropsSchema,
  serialize: (props) => ({
    type: "omi-flow",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: ["omi-flow"],
};
