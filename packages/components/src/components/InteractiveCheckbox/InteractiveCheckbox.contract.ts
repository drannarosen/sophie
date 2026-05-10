import type { ComponentContract } from "../../contract/types.ts";
import {
  type InteractiveCheckboxProps,
  InteractiveCheckboxPropsSchema,
} from "./InteractiveCheckbox.schema.ts";
import { InteractiveCheckbox } from "./InteractiveCheckbox.tsx";

export const interactiveCheckboxContract: ComponentContract<
  InteractiveCheckboxProps,
  boolean
> = {
  Component: InteractiveCheckbox,
  schema: InteractiveCheckboxPropsSchema,
  serialize: (props, state) => ({
    type: "interactive-checkbox",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
