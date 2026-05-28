import type { ComponentContract } from "../../contract/types.ts";
import {
  type MultiSelectProps,
  MultiSelectPropsSchema,
} from "./MultiSelect.schema.ts";
import { MultiSelect } from "./MultiSelect.tsx";

export const multiSelectContract: ComponentContract<
  MultiSelectProps,
  string[]
> = {
  Component: MultiSelect,
  schema: MultiSelectPropsSchema,
  serialize: (props, state) => ({
    type: "multi-select",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
