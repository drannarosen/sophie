import type { ComponentContract } from "../../contract/types.ts";
import {
  type ReflectionProps,
  ReflectionPropsSchema,
} from "./Reflection.schema.ts";
import { Reflection } from "./Reflection.tsx";

export const reflectionContract: ComponentContract<ReflectionProps, string> = {
  Component: Reflection,
  schema: ReflectionPropsSchema,
  serialize: (props, state) => ({
    type: "reflection",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
