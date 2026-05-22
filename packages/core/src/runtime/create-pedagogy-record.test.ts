import { describe, expect, it } from "vitest";
import { createPedagogyRecord } from "./create-pedagogy-record.js";

describe("createPedagogyRecord", () => {
  it("injects user_id + course_id + schema_version + timestamps + state_type", () => {
    const record = createPedagogyRecord({
      user_id: "browser-uuid-7f3a",
      course_id: "astr201-sp26",
      state_type: "bkt_mastery",
      schema_version: "1.0.0",
      payload: { skill_id: "math-logarithms", p_learned: 0.42 },
    });
    expect(record.user_id).toBe("browser-uuid-7f3a");
    expect(record.course_id).toBe("astr201-sp26");
    expect(record.state_type).toBe("bkt_mastery");
    expect(record.schema_version).toBe("1.0.0");
    expect(record.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(record.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(record.skill_id).toBe("math-logarithms");
    expect(record.p_learned).toBe(0.42);
  });

  it("sets created_at === updated_at on initial create", () => {
    const record = createPedagogyRecord({
      user_id: "u",
      course_id: "c",
      state_type: "t",
      schema_version: "1.0.0",
      payload: {},
    });
    expect(record.created_at).toBe(record.updated_at);
  });

  it("merges payload at the top level (no nesting)", () => {
    const record = createPedagogyRecord({
      user_id: "u",
      course_id: "c",
      state_type: "t",
      schema_version: "1.0.0",
      payload: { a: 1, b: "two", c: [3, 4] },
    });
    expect(record.a).toBe(1);
    expect(record.b).toBe("two");
    expect(record.c).toEqual([3, 4]);
  });
});
