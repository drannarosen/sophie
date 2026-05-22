import { describe, expect, it } from "vitest";
import { BaseRecordSchema } from "./base-record.js";

describe("BaseRecordSchema", () => {
  const validRecord = {
    user_id: "browser-uuid-7f3a",
    course_id: "astr201-sp26",
    schema_version: "1.0.0",
    state_type: "fsrs_state",
    created_at: "2026-05-21T11:35:22Z",
    updated_at: "2026-05-21T11:35:22Z",
  };

  it("accepts a complete valid record", () => {
    expect(() => BaseRecordSchema.parse(validRecord)).not.toThrow();
  });

  it("rejects missing user_id", () => {
    const { user_id: _user_id, ...rest } = validRecord;
    expect(() => BaseRecordSchema.parse(rest)).toThrow();
  });

  it("rejects missing course_id", () => {
    const { course_id: _course_id, ...rest } = validRecord;
    expect(() => BaseRecordSchema.parse(rest)).toThrow();
  });

  it("rejects missing schema_version", () => {
    const { schema_version: _schema_version, ...rest } = validRecord;
    expect(() => BaseRecordSchema.parse(rest)).toThrow();
  });

  it("rejects missing state_type", () => {
    const { state_type: _state_type, ...rest } = validRecord;
    expect(() => BaseRecordSchema.parse(rest)).toThrow();
  });

  it("rejects invalid ISO timestamps", () => {
    expect(() =>
      BaseRecordSchema.parse({ ...validRecord, created_at: "not-a-date" })
    ).toThrow();
  });

  it("accepts semver-style schema_version", () => {
    expect(() =>
      BaseRecordSchema.parse({ ...validRecord, schema_version: "2.3.1" })
    ).not.toThrow();
  });

  it("rejects non-semver schema_version", () => {
    expect(() =>
      BaseRecordSchema.parse({ ...validRecord, schema_version: "v2" })
    ).toThrow();
  });
});
