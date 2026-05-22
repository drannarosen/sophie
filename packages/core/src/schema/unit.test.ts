import { describe, expect, it } from "vitest";
import { UnitSchema, UnitTypeSchema } from "./unit.js";

describe("UnitTypeSchema", () => {
  it("accepts each declared variant", () => {
    for (const t of ["lecture", "project", "lab", "topic", "skill"]) {
      expect(() => UnitTypeSchema.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => UnitTypeSchema.parse("lab-report")).toThrow();
  });
});

describe("UnitSchema", () => {
  const minimalLecture = {
    id: "l1-why-different",
    type: "lecture",
    title: "Why ASTR 201 is Different",
    order: 1,
  };

  it("accepts a minimal lecture", () => {
    expect(() => UnitSchema.parse(minimalLecture)).not.toThrow();
  });

  it("accepts a project with prereqs + estimated_duration_weeks", () => {
    expect(() =>
      UnitSchema.parse({
        id: "p1-stellar-populations",
        type: "project",
        title: "Stellar Populations",
        order: 1,
        prereqs: ["math-logarithms", "physics-newton-2"],
        estimated_duration_weeks: 1.5,
      })
    ).not.toThrow();
  });

  it("accepts a skill (bridge-only)", () => {
    expect(() =>
      UnitSchema.parse({
        id: "math-logarithms",
        type: "skill",
        title: "Logarithms",
        order: 1,
        topic_id: "math-logarithms",
      })
    ).not.toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => UnitSchema.parse({ id: "x", type: "lecture" })).toThrow();
  });

  it("rejects unknown type", () => {
    expect(() =>
      UnitSchema.parse({ ...minimalLecture, type: "mystery" })
    ).toThrow();
  });

  it("defaults prereqs to empty array when omitted", () => {
    const parsed = UnitSchema.parse(minimalLecture);
    expect(parsed.prereqs).toEqual([]);
  });
});
