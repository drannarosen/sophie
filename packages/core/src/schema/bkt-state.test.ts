import { describe, expect, it } from "vitest";
import { type BKTState, BKTStateSchema } from "./bkt-state.js";

const valid: BKTState = {
  user_id: "browser-uuid",
  course_id: "astr201-sp26",
  schema_version: "1.0.0",
  state_type: "bkt_mastery",
  created_at: "2026-05-21T11:35:22Z",
  updated_at: "2026-05-21T11:35:22Z",
  skill_id: "math-logarithms",
  p_learned: 0.42,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_count: 3,
  last_attempt_at: "2026-05-21T11:30:22Z",
};

describe("BKTStateSchema", () => {
  it("accepts a valid record", () => {
    expect(() => BKTStateSchema.parse(valid)).not.toThrow();
  });
  it("rejects p_learned outside [0, 1]", () => {
    expect(() => BKTStateSchema.parse({ ...valid, p_learned: 1.5 })).toThrow();
    expect(() => BKTStateSchema.parse({ ...valid, p_learned: -0.1 })).toThrow();
  });
  it("rejects negative attempt_count", () => {
    expect(() =>
      BKTStateSchema.parse({ ...valid, attempt_count: -1 })
    ).toThrow();
  });
  it("rejects missing skill_id", () => {
    const { skill_id: _skill_id, ...rest } = valid;
    expect(() => BKTStateSchema.parse(rest)).toThrow();
  });
  it("rejects wrong state_type discriminator", () => {
    expect(() =>
      BKTStateSchema.parse({ ...valid, state_type: "fsrs_state" })
    ).toThrow();
  });
  it("allows omitting last_attempt_at (optional)", () => {
    const { last_attempt_at: _last, ...rest } = valid;
    expect(() => BKTStateSchema.parse(rest)).not.toThrow();
  });
});
