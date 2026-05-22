import { z } from "zod";
import { BaseRecordSchema } from "./base-record.js";
import { NonEmptyString } from "./primitives.js";

/**
 * `FSRSTargetTypeSchema` — what kind of pedagogy graph node the FSRS state
 * is keyed against (per [ADR 0069](../../../docs/website/decisions/0069-fsrs-spaced-repetition-engine.md)).
 *
 * - `item`: a single `<RetrievalPrompt>` or practice problem
 * - `unit`: composite over a lecture's content
 * - `section`: composite over a module's content
 * - `topic`: a skill / prereq topic
 * - `lo`: a learning objective
 */
export const FSRSTargetTypeSchema = z.enum([
  "item",
  "unit",
  "section",
  "topic",
  "lo",
]);
export type FSRSTargetType = z.infer<typeof FSRSTargetTypeSchema>;

/**
 * `FSRSRecordSchema` — per-(student, target) Free Spaced Repetition
 * Scheduler state (per [ADR 0069](../../../docs/website/decisions/0069-fsrs-spaced-repetition-engine.md)).
 *
 * Maintains Difficulty + Stability per FSRS algorithm. Schedule
 * computed from D + S + elapsed time relative to `desired_retention`.
 * Schema only; algorithm in `@sophie/pedagogy-fsrs` (Wedge D).
 *
 * Narrows `BaseRecordSchema.state_type` to literal `"fsrs_state"` for
 * future discriminated-union dispatch over persisted records.
 */
export const FSRSRecordSchema = BaseRecordSchema.extend({
  state_type: z.literal("fsrs_state"),
  target_id: NonEmptyString,
  target_type: FSRSTargetTypeSchema,
  difficulty: z.number(),
  stability: z.number().positive(),
  last_review_at: z.iso.datetime(),
  next_review_at: z.iso.datetime(),
  review_count: z.number().int().nonnegative(),
  desired_retention: z.number().min(0).max(1),
});

export type FSRSRecord = z.infer<typeof FSRSRecordSchema>;
