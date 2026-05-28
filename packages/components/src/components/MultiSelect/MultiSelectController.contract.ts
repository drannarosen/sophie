import type { ComponentContract } from "../../contract/types.ts";
import {
  type MultiSelectControllerProps,
  MultiSelectControllerPropsSchema,
} from "./MultiSelectController.schema.ts";
import { MultiSelectController } from "./MultiSelectController.tsx";

/**
 * Contract for `<MultiSelectController>`. The authoring tags
 * `<MultiSelect>` / `<MultiSelect.Prompt>` / `<MultiSelect.Choice>` are
 * virtual — expanded away by `sophieCompoundExpandRemarkPlugin` at
 * MDX-compile time (ADR 0073 Amendment 1), so they have no render
 * contract. The controller is the only real React export: a
 * null-rendering side-effect island over the transform-emitted static
 * `<fieldset>` of native checkboxes (mirrors `mcqControllerContract` /
 * `parameterCursorContract` — chrome, no epistemic role, no observable
 * DOM, `serialize` carries props only). ADR 0004.
 */
export const multiSelectControllerContract: ComponentContract<
  MultiSelectControllerProps,
  null
> = {
  Component: MultiSelectController,
  schema: MultiSelectControllerPropsSchema,
  serialize: (props) => ({
    type: "multi-select-controller",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
