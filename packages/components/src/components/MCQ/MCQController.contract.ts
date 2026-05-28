import type { ComponentContract } from "../../contract/types.ts";
import {
  type MCQControllerProps,
  MCQControllerPropsSchema,
} from "./MCQController.schema.ts";
import { MCQController } from "./MCQController.tsx";

/**
 * Contract for `<MCQController>`. The authoring tags `<MCQ>` /
 * `<MCQ.Prompt>` / `<MCQ.Choice>` are virtual — expanded away by
 * `sophieCompoundExpandRemarkPlugin` at MDX-compile time (ADR 0073
 * Amendment 1), so they have no render contract. The controller is the
 * only real React export: a null-rendering side-effect island over the
 * transform-emitted static `<fieldset>` of native radios (mirrors
 * `parameterCursorContract`'s shape — chrome, no epistemic role, no
 * observable DOM, `serialize` carries props only). ADR 0004.
 */
export const mcqControllerContract: ComponentContract<
  MCQControllerProps,
  null
> = {
  Component: MCQController,
  schema: MCQControllerPropsSchema,
  serialize: (props) => ({ type: "mcq-controller", props, state: null }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
