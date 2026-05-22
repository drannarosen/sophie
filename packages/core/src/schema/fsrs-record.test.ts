import { describe, expect, it } from "vitest";
import {
  type FSRSRecord,
  FSRSRecordSchema,
  FSRSTargetTypeSchema,
} from "./fsrs-record.js";

const valid: FSRSRecord = {
  user_id: "browser-uuid",
  course_id: "astr201-sp26",
  schema_version: "1.0.0",
  state_type: "fsrs_state",
  created_at: "2026-05-21T11:35:22Z",
  updated_at: "2026-05-21T11:35:22Z",
  target_id: "logs-q1",
  target_type: "item",
  difficulty: 5.2,
  stability: 7.1,
  last_review_at: "2026-05-20T11:35:22Z",
  next_review_at: "2026-05-24T11:35:22Z",
  review_count: 4,
  desired_retention: 0.9,
};

describe("FSRSTargetTypeSchema", () => {
  it("accepts each declared variant", () => {
    for (const t of ["item", "unit", "section", "topic", "lo"]) {
      expect(() => FSRSTargetTypeSchema.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown target types", () => {
    expect(() => FSRSTargetTypeSchema.parse("chapter")).toThrow();
  });
});

describe("FSRSRecordSchema", () => {
  it("accepts a valid record", () => {
    expect(() => FSRSRecordSchema.parse(valid)).not.toThrow();
  });
  it("accepts each target_type variant", () => {
    for (const t of ["item", "unit", "section", "topic", "lo"] as const) {
      expect(() =>
        FSRSRecordSchema.parse({ ...valid, target_type: t })
      ).not.toThrow();
    }
  });
  it("rejects desired_retention outside [0, 1]", () => {
    expect(() =>
      FSRSRecordSchema.parse({ ...valid, desired_retention: 1.5 })
    ).toThrow();
  });
  it("rejects negative review_count", () => {
    expect(() =>
      FSRSRecordSchema.parse({ ...valid, review_count: -1 })
    ).toThrow();
  });
  it("rejects non-positive stability", () => {
    expect(() => FSRSRecordSchema.parse({ ...valid, stability: 0 })).toThrow();
    expect(() => FSRSRecordSchema.parse({ ...valid, stability: -1 })).toThrow();
  });
  it("allows unbounded difficulty (no clamp)", () => {
    expect(() =>
      FSRSRecordSchema.parse({ ...valid, difficulty: -100 })
    ).not.toThrow();
    expect(() =>
      FSRSRecordSchema.parse({ ...valid, difficulty: 9999 })
    ).not.toThrow();
  });
  it("rejects wrong state_type discriminator", () => {
    expect(() =>
      FSRSRecordSchema.parse({ ...valid, state_type: "bkt_mastery" })
    ).toThrow();
  });
});
