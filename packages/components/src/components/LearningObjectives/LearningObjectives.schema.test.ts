import { describe, expect, it } from "vitest";
import { LearningObjectivesPropsSchema } from "./LearningObjectives.schema.ts";

describe("LearningObjectivesPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "lo",
    objectives: [{ id: "o1", verb: "State", body: "the thesis." }],
  };

  it("accepts the minimal valid shape", () => {
    expect(LearningObjectivesPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an optional heading", () => {
    expect(
      LearningObjectivesPropsSchema.safeParse({
        ...valid,
        heading: "Today's Objectives",
      }).success
    ).toBe(true);
  });

  it("rejects empty heading when heading is provided", () => {
    expect(
      LearningObjectivesPropsSchema.safeParse({ ...valid, heading: "" }).success
    ).toBe(false);
  });

  it("rejects empty required strings", () => {
    for (const field of ["course", "chapter", "id"] as const) {
      expect(
        LearningObjectivesPropsSchema.safeParse({ ...valid, [field]: "" })
          .success
      ).toBe(false);
    }
  });

  it("accepts an empty objectives array (zero-objective chapter)", () => {
    expect(
      LearningObjectivesPropsSchema.safeParse({ ...valid, objectives: [] })
        .success
    ).toBe(true);
  });

  it("rejects an objective missing id / verb / body", () => {
    expect(
      LearningObjectivesPropsSchema.safeParse({
        ...valid,
        objectives: [{ verb: "State", body: "x" }],
      }).success
    ).toBe(false);
    expect(
      LearningObjectivesPropsSchema.safeParse({
        ...valid,
        objectives: [{ id: "o1", body: "x" }],
      }).success
    ).toBe(false);
    expect(
      LearningObjectivesPropsSchema.safeParse({
        ...valid,
        objectives: [{ id: "o1", verb: "State" }],
      }).success
    ).toBe(false);
  });
});
