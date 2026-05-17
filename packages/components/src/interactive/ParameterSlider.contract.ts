import type { ComponentContract } from "../contract/types.ts";
import {
  type ParameterSliderProps,
  ParameterSliderPropsSchema,
} from "./ParameterSlider.schema.ts";
import { ParameterSlider } from "./ParameterSlider.tsx";

/**
 * Contract for `<ParameterSlider>`. Per ADRs 0058 + 0059, this is
 * chrome — it controls an A11 cursor and carries no epistemic role.
 * The serialized shape captures the props authored at source; the
 * runtime `format` function is intentionally absent from the
 * serialization (functions don't round-trip cleanly).
 */
export const parameterSliderContract: ComponentContract<
  ParameterSliderProps,
  null
> = {
  Component: ParameterSlider,
  schema: ParameterSliderPropsSchema,
  serialize: (props) => ({
    type: "parameter-slider",
    props: {
      name: props.name,
      label: props.label,
      ariaLabel: props.ariaLabel,
    },
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
