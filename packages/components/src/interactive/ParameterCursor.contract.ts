import type { ComponentContract } from "../contract/types.ts";
import {
  type ParameterCursorProps,
  ParameterCursorPropsSchema,
} from "./ParameterCursor.schema.ts";
import { ParameterCursor } from "./ParameterCursor.tsx";

/**
 * Contract for `<ParameterCursor>`. Per ADRs 0058 + 0059, this is
 * chrome — it declares a page-local A11 cursor and carries no
 * epistemic role. The component renders no observable DOM; its
 * effect is store registration.
 */
export const parameterCursorContract: ComponentContract<
  ParameterCursorProps,
  null
> = {
  Component: ParameterCursor,
  schema: ParameterCursorPropsSchema,
  serialize: (props) => ({ type: "parameter-cursor", props, state: null }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
