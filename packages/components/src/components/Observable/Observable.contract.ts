import type { ComponentContract } from "../../contract/types.ts";
import {
  type ObservableProps,
  ObservablePropsSchema,
} from "./Observable.schema.ts";
import { Observable } from "./Observable.tsx";

// Observable is content-only. No per-instance state to serialize;
// `state` is `null`. Mirrors Intervention/KeyEquation's contract shape.
// The audit invariants (E7 in PR-δ) consume pedagogy-index entries, not
// the component's per-instance state.
//
// Authoring composition rule per ADR 0046 + 2026-05-17 design §D1:
// Observable is a biography child of `<KeyEquation>` — `containedIn`
// includes "key-equation" to surface that contract. v1 doesn't enforce
// the rule at runtime (composition validation is audit-side), but the
// declared shape gives the audit + AI authoring tooling the
// canonical parent.
export const observableContract: ComponentContract<ObservableProps, null> = {
  Component: Observable,
  schema: ObservablePropsSchema,
  serialize: (props) => ({
    type: "observable",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["key-equation"],
  forbidsContaining: [],
};
