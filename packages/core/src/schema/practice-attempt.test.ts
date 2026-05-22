import { describe, expect, it } from "vitest";
import {
  type PracticeAttempt,
  PracticeAttemptSchema,
} from "./practice-attempt.js";

const valid: PracticeAttempt = {
  user_id: "browser-uuid-7f3a",
  course_id: "astr201-sp26",
  schema_version: "1.0.0",
  state_type: "practice_attempt",
  created_at: "2026-05-21T11:35:22Z",
  updated_at: "2026-05-21T11:35:22Z",
  target_id: "eq:stefan-boltzmann",
  component: "retrieval-prompt",
  response: "Luminosity goes up by 4x",
  self_assessment: "got",
  time_to_first_reveal_ms: 12_400,
  attempt_seq: 1,
};

describe("PracticeAttemptSchema", () => {
  it("accepts a valid record", () => {
    expect(() => PracticeAttemptSchema.parse(valid)).not.toThrow();
  });

  it("accepts each component variant", () => {
    for (const c of [
      "retrieval-prompt",
      "spaced-review",
      "skill-review",
    ] as const) {
      expect(() =>
        PracticeAttemptSchema.parse({ ...valid, component: c })
      ).not.toThrow();
    }
  });

  it("accepts each self_assessment variant", () => {
    for (const sa of ["got", "partial", "missed"] as const) {
      expect(() =>
        PracticeAttemptSchema.parse({ ...valid, self_assessment: sa })
      ).not.toThrow();
    }
  });

  it("accepts null self_assessment (student dismissed without rating)", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, self_assessment: null })
    ).not.toThrow();
  });

  it("accepts null time_to_first_reveal_ms (student dismissed without revealing)", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, time_to_first_reveal_ms: null })
    ).not.toThrow();
  });

  it("accepts empty response string", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, response: "" })
    ).not.toThrow();
  });

  it("rejects wrong state_type discriminator", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, state_type: "fsrs_state" })
    ).toThrow();
  });

  it("rejects unknown component", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, component: "mystery" })
    ).toThrow();
  });

  it("rejects non-positive attempt_seq", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, attempt_seq: 0 })
    ).toThrow();
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, attempt_seq: -1 })
    ).toThrow();
  });

  it("rejects negative time_to_first_reveal_ms", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, time_to_first_reveal_ms: -1 })
    ).toThrow();
  });

  it("rejects missing target_id", () => {
    const { target_id: _target_id, ...rest } = valid;
    expect(() => PracticeAttemptSchema.parse(rest)).toThrow();
  });
});
