import type { ComponentContract } from "../../contract/types.ts";
import { type DropdownProps, DropdownPropsSchema } from "./Dropdown.schema.ts";
import { Dropdown } from "./Dropdown.tsx";

export const dropdownContract: ComponentContract<DropdownProps, string[]> = {
  Component: Dropdown,
  schema: DropdownPropsSchema,
  serialize: (props, state) => ({
    type: "dropdown",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
