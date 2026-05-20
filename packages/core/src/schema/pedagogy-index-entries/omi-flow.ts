import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * A single slot of an `<OMIFlow>` callsite (ADR 0063). Each slot
 * shares the same shape — title (optional, defaults to the role
 * label) and pre-rendered HTML body.
 */
const OMIFlowSlotSchema = z.object({
  /** Optional author-supplied title. Empty string → renderer falls back to the role label. */
  title: z.string(),
  /** Pre-rendered HTML of the slot's children. May be empty. */
  body: z.string(),
});
type OMIFlowSlot = z.infer<typeof OMIFlowSlotSchema>;

/**
 * An `<OMIFlow>` callsite (ADR 0063). Composite primitive that
 * demonstrates the ADR 0058 eight-role contract end-to-end: each
 * slot's role is fixed by the slot component name
 * (`<OMIFlow.Observable>` → `observable`, etc.), not author-
 * overridable.
 *
 * One entry per callsite. The renderer always emits slots in
 * canonical O → M → I order regardless of source order; OF-1
 * audit invariant warns on out-of-order source authoring.
 *
 * `concept` optionally binds the OMIFlow to a Notation Registry
 * concept (ADR 0043) for future MultiRep ↔ OMIFlow cross-links.
 * v1 carries no audit invariant on it.
 */
export const OMIFlowEntrySchema = z.object({
  chapter: Slug,
  anchor: NonEmptyString,
  /** Optional Notation Registry concept binding. */
  concept: z.string().optional(),
  observable: OMIFlowSlotSchema,
  model: OMIFlowSlotSchema,
  inference: OMIFlowSlotSchema,
});
export type OMIFlowEntry = z.infer<typeof OMIFlowEntrySchema>;
export type { OMIFlowSlot };
