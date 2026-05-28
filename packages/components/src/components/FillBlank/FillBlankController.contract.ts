import type { ComponentContract } from "../../contract/types.ts";
import {
  type FillBlankControllerProps,
  FillBlankControllerPropsSchema,
} from "./FillBlankController.schema.ts";
import { FillBlankController } from "./FillBlankController.tsx";

/**
 * Contract for `<FillBlankController>`. The authoring tags `<FillBlank>`
 * / `<FillBlank.Prompt>` / `<FillBlank.Slot>` are virtual — expanded
 * away by `sophieCompoundExpandRemarkPlugin` at MDX-compile time (ADR
 * 0073 Amendment 1), so they have no render contract. The controller is
 * the only real React export: a null-rendering side-effect island over
 * the transform-emitted static prompt prose + inline `<input
 * data-fb-slot>` fields (mirrors `mcqControllerContract` /
 * `multiSelectControllerContract` / `parameterCursorContract` — chrome,
 * no epistemic role, no observable DOM, `serialize` carries props only).
 * ADR 0004.
 */
export const fillBlankControllerContract: ComponentContract<
  FillBlankControllerProps,
  null
> = {
  Component: FillBlankController,
  schema: FillBlankControllerPropsSchema,
  serialize: (props) => ({
    type: "fill-blank-controller",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
