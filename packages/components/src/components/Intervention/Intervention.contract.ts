import type { ComponentContract } from "../../contract/types.ts";
import {
  type InterventionProps,
  InterventionPropsSchema,
} from "./Intervention.schema.ts";
import { Intervention } from "./Intervention.tsx";

// Intervention is content-only. No per-instance state to serialize;
// `state` is `null`. Mirrors KeyEquation's contract shape. The audit
// invariants (MG3/MG4/I1/I2/I3 in PR-δ) consume the pedagogy-index
// entries, not the component's per-instance state.
export const interventionContract: ComponentContract<InterventionProps, null> =
  {
    Component: Intervention,
    schema: InterventionPropsSchema,
    serialize: (props) => ({
      type: "intervention",
      props,
      state: null,
    }),
    audit: () => [],
    // Authoring composition rules per ADR 0044 + 2026-05-17 design §D4–§D5:
    // - Default: nested inside a misconception `Aside` (addresses="this").
    // - Standalone: directly inside a chapter or section (addresses="<slug>").
    // Both shapes valid; the audit (PR-δ I1) enforces semantic correctness.
    containedIn: ["chapter", "section", "aside"],
    forbidsContaining: [],
  };
