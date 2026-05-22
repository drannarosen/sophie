import { z } from "zod";
import { BaseRecordSchema } from "./base-record.js";
import { NonEmptyString } from "./primitives.js";

/**
 * `PracticeAttemptSchema` — one student attempt at a retrieval-family
 * component (`<RetrievalPrompt>`, `<SpacedReview>`, or `<SkillReview>`).
 *
 * Per the Wedge B1 design doc (`docs/plans/2026-05-21-wedge-b1-retrieval-family-design.md` §3).
 * Records are written by the `useRetrievalAttempt` hook into the IndexedDB
 * ResponseStore (per [ADR 0007](../../../docs/website/decisions/0007-persistence-indexeddb.md))
 * via `useInteractive`. Wedge D's FSRS scheduler will consume the queue and
 * produce `FSRSRecord` rows; the Cockpit (per [ADR 0076](../../../docs/website/decisions/0076-student-learning-cockpit.md))
 * will surface them in Today + Review Queue tabs.
 *
 * Narrows `BaseRecordSchema.state_type` to literal `"practice_attempt"` for
 * future discriminated-union dispatch over persisted records.
 */
export const PracticeAttemptSchema = BaseRecordSchema.extend({
  state_type: z.literal("practice_attempt"),
  target_id: NonEmptyString,
  component: z.enum(["retrieval-prompt", "spaced-review", "skill-review"]),
  response: z.string(),
  self_assessment: z.enum(["got", "partial", "missed"]).nullable(),
  time_to_first_reveal_ms: z.number().int().nonnegative().nullable(),
  attempt_seq: z.number().int().positive(),
});

export type PracticeAttempt = z.infer<typeof PracticeAttemptSchema>;
