import type { ComponentContract } from "../../contract/types.ts";
import {
  type DerivationStepProps,
  DerivationStepPropsSchema,
} from "./DerivationStep.schema.ts";
import { DerivationStep } from "./DerivationStep.tsx";

// DerivationStep is content-only. No per-instance state to serialize;
// `state` is `null`. Mirrors Observable/Assumption/Intervention contract
// shape. Pedagogy-index entries — not per-instance component state —
// feed the audit (R-prefix invariants and any future derivation-coverage
// nudges).
//
// Authoring composition rule per ADR 0046 §R9 + ADR 0060: DerivationStep
// is a biography child rendered inside an equation registry MDX body
// (`src/content/equations/<id>.mdx`). `containedIn` includes
// "key-equation" to surface that contract — the equation entry IS the
// canonical container at the index level, even though the on-page
// container is the registry MDX file rather than chapter MDX. v1
// doesn't enforce composition at runtime (audit-side); the declaration
// gives the audit + AI authoring tooling the canonical parent.
export const derivationStepContract: ComponentContract<
  DerivationStepProps,
  null
> = {
  Component: DerivationStep,
  schema: DerivationStepPropsSchema,
  serialize: (props) => ({
    type: "derivation-step",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["key-equation"],
  forbidsContaining: [],
};
