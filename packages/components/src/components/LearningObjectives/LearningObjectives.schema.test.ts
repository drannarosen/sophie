import { describe, expect, it } from "vitest";
import { LearningObjectivesPropsSchema } from "./LearningObjectives.schema.ts";

describe("LearningObjectivesPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "lo",
    children: null,
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
});
