import type { ComponentContract } from "../../contract/types.ts";
import {
  type WorkedExampleProps,
  WorkedExamplePropsSchema,
} from "./WorkedExample.schema.ts";
import { WorkedExample } from "./WorkedExample.tsx";

// WorkedExample is content-only — no per-instance state to serialize;
// `state` is `null` (mirrors DerivationStep/Observable/Assumption). The
// slot sub-components (Problem/Step/DimCheck/Result) are presentational
// children with no independent contract at v1; a pedagogy-index
// extractor + slot-coverage audit invariant (e.g. "every WorkedExample
// has a DimCheck", enforcing QB6) is a deferred fast-follow per ADR 0081.
//
// Composition (ADR 0064 §3 doctrine): worked examples live in chapter
// reading bodies; a `<Callout variant="deep-dive">` approximation is
// disallowed. Not self-nestable.
export const workedExampleContract: ComponentContract<
  WorkedExampleProps,
  null
> = {
  Component: WorkedExample,
  schema: WorkedExamplePropsSchema,
  serialize: (props) => ({
    type: "worked-example",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter"],
  forbidsContaining: ["worked-example"],
};
