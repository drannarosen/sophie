import type { ComponentContract } from "../../contract/types.ts";
import {
  type EffortLevel,
  type EffortLogProps,
  EffortLogPropsSchema,
} from "./EffortLog.schema.ts";
import { EffortLog } from "./EffortLog.tsx";

export const effortLogContract: ComponentContract<
  EffortLogProps,
  EffortLevel | ""
> = {
  Component: EffortLog,
  schema: EffortLogPropsSchema,
  serialize: (props, state) => ({
    type: "effort-log",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
