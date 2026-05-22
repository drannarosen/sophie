import { z } from "zod";
import { BaseRecordSchema } from "./base-record.js";
import { NonEmptyString } from "./primitives.js";

/**
 * `BKTStateSchema` — per-(student, skill) Bayesian Knowledge Tracing state
 * (per [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)
 * §"BKT mastery model").
 *
 * Stored per-browser at Tier 1/2 (IndexedDB); server-side at Tier 3
 * (with same shape). Records extend `BaseRecordSchema` with the four
 * BKT parameters + attempt accounting.
 *
 * Narrows `BaseRecordSchema.state_type` to the literal `"bkt_mastery"`
 * so future code can discriminate over `state_type` across all record
 * variants. Schema only; algorithm in `@sophie/pedagogy-bkt` (Wedge E).
 */
export const BKTStateSchema = BaseRecordSchema.extend({
  state_type: z.literal("bkt_mastery"),
  skill_id: NonEmptyString,
  p_learned: z.number().min(0).max(1),
  p_transit: z.number().min(0).max(1),
  p_slip: z.number().min(0).max(1),
  p_guess: z.number().min(0).max(1),
  attempt_count: z.number().int().nonnegative(),
  last_attempt_at: z.iso.datetime().optional(),
});

export type BKTState = z.infer<typeof BKTStateSchema>;
