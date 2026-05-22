import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

/**
 * `BaseRecordSchema` — the stable shape every persisted Sophie record carries
 * (per [ADR 0066](../../../docs/website/decisions/0066-pseudonymous-first-data-model.md)).
 *
 * | Field            | Purpose                                            |
 * | ---------------- | -------------------------------------------------- |
 * | `user_id`        | Pseudonymous identifier: per-browser UUID at Tier 1/2; LTI `sub` claim at Tier 3 ([ADR 0065](../../../docs/website/decisions/0065-lti-1-3-integration.md)). Same field shape; Sophie treats both uniformly. |
 * | `course_id`      | Prevents cross-course state merges. Required even on per-browser records. |
 * | `schema_version` | Semver-style; tracks future schema migrations.     |
 * | `state_type`     | Discriminator: `fsrs_state` \| `bkt_mastery` \| `predict_response` \| `practice_attempt` \| `bookmark` \| `reading_progress` \| ... |
 * | `created_at`     | ISO 8601 timestamp; initial write.                 |
 * | `updated_at`     | ISO 8601 timestamp; last write. LWW per [ADR 0029](../../../docs/website/decisions/0029-broadcast-lww.md). |
 *
 * Concrete record schemas (`FSRSRecordSchema`, `BKTStateSchema`, etc.) extend
 * this via `BaseRecordSchema.extend({ ... })`. Never instantiated directly.
 */
export const BaseRecordSchema = z.object({
  user_id: NonEmptyString,
  course_id: NonEmptyString,
  schema_version: z
    .string()
    .regex(
      /^\d+\.\d+\.\d+$/,
      "schema_version must be semver-style (e.g. '1.0.0')."
    ),
  state_type: NonEmptyString,
  created_at: z.iso.datetime({ message: "created_at must be ISO 8601." }),
  updated_at: z.iso.datetime({ message: "updated_at must be ISO 8601." }),
});

export type BaseRecord = z.infer<typeof BaseRecordSchema>;
