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
// is a biography child of the equation entry. Two canonical containers
// reflect Sophie's transition from chapter-inline biographies (today's
// `<KeyEquation>` walker) to registry-MDX-rooted biographies (Batch 4's
// `buildBiographyFromChildren` walking `src/content/equations/<id>.mdx`
// roots). v1 doesn't enforce composition at runtime; the declaration
// gives the audit + AI authoring tooling the canonical parents.
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
  containedIn: ["key-equation", "equation-registry-root"],
  forbidsContaining: [],
};
