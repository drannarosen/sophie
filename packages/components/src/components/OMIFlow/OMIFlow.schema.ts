import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Props for the root `<OMIFlow>` compound primitive (ADR 0063).
 *
 *   - `id` is the stable in-chapter anchor (extractor falls back to
 *     `omi-${slug(concept)}` or `omi-${N}` when absent — see
 *     `extractOMIFlows`).
 *   - `concept` optionally binds the flow to a Notation Registry
 *     concept (ADR 0043) — forward-compat with MultiRep ↔ OMIFlow
 *     cross-link; no v1 audit invariant.
 *   - `children` carries `<OMIFlow.Observable>`, `<OMIFlow.Model>`,
 *     `<OMIFlow.Inference>` in any source order. The renderer sorts
 *     them into canonical O → M → I before painting (OF-1 audit warns
 *     on non-canonical source order).
 *
 * Slot-presence and exactly-one invariants are enforced at the
 * EXTRACT phase by `extractOMIFlows` (ADR 0063 strict-3 invariant) —
 * the React renderer trusts that input. v1 schema does not gate it
 * because the renderer is downstream of the extractor in production.
 */
export const OMIFlowPropsSchema = z.object({
  id: z.string().optional(),
  concept: z.string().optional(),
  children: z.custom<ReactNode>(),
});
export type OMIFlowProps = z.infer<typeof OMIFlowPropsSchema>;

/**
 * Props for each `<OMIFlow.{Observable,Model,Inference}>` slot.
 * `title` is optional — when omitted the renderer falls back to the
 * role label ("Observable" / "Model" / "Inference"). When provided,
 * the rendered title becomes `${role-label}: ${title}` (e.g.
 * "Observable: H-α line").
 *
 * The slot's epistemic role is determined by the slot component
 * itself, NOT by an author prop — this is the load-bearing decision
 * #11 from ADR 0063. There is no `role` prop here on purpose.
 */
export const OMIFlowSlotPropsSchema = z.object({
  title: z.string().optional(),
  children: z.custom<ReactNode>(),
});
export type OMIFlowSlotProps = z.infer<typeof OMIFlowSlotPropsSchema>;
