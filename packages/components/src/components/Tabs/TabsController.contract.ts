import type { ComponentContract } from "../../contract/types.ts";
import {
  type TabsControllerProps,
  TabsControllerPropsSchema,
} from "./TabsController.schema.ts";
import { TabsController } from "./TabsController.tsx";

/**
 * Contract for `<TabsController>`. The authoring tags `<Tabs>` / `<Tab>`
 * are virtual — expanded away by `sophieCompoundExpandRemarkPlugin` at
 * MDX-compile time (Task 6 of the compound-island transform), so they
 * have no render contract. The controller is the only real React
 * export: a null-rendering side-effect island over the transform-
 * emitted static ARIA-tabs DOM (mirrors `mcqControllerContract` /
 * `multiSelectControllerContract` / `fillBlankControllerContract` /
 * `parameterCursorContract` — chrome, no epistemic role, no observable
 * DOM, `serialize` carries props only). ADR 0004.
 */
export const tabsControllerContract: ComponentContract<
  TabsControllerProps,
  null
> = {
  Component: TabsController,
  schema: TabsControllerPropsSchema,
  serialize: (props) => ({
    type: "tabs-controller",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
