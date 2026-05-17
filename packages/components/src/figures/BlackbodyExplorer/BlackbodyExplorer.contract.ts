import type { ComponentContract } from "../../contract/types.ts";
import {
  type BlackbodyExplorerProps,
  BlackbodyExplorerPropsSchema,
} from "./BlackbodyExplorer.schema.ts";
import { BlackbodyExplorer } from "./BlackbodyExplorer.tsx";

/**
 * Contract for `<BlackbodyExplorer>`. First interactive figure
 * consumer of A11 (ADR 0059), validating ADR 0058's eight-role
 * epistemic contract end-to-end.
 *
 * Although the rendered figure carries four distinct epistemic roles
 * on its sub-regions, the figure itself is a *composite*. The
 * serialized shape treats it as one pedagogy-index node; future
 * audit invariants can read role attributes directly from the
 * rendered DOM if needed.
 */
export const blackbodyExplorerContract: ComponentContract<
  BlackbodyExplorerProps,
  null
> = {
  Component: BlackbodyExplorer,
  schema: BlackbodyExplorerPropsSchema,
  serialize: (props) => ({
    type: "blackbody-explorer",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
