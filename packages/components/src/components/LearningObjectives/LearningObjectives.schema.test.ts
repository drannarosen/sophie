import { describe, expect, it } from "vitest";
import {
  LearningObjectivesPropsSchema,
  ObjectiveSchema,
} from "./LearningObjectives.schema.ts";

describe("ObjectiveSchema", () => {
  const valid = { id: "thesis", verb: "State", body: "the thesis" };

  it("accepts a complete objective", () => {
    expect(ObjectiveSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty id, verb, or body", () => {
    for (const field of ["id", "verb", "body"] as const) {
      expect(ObjectiveSchema.safeParse({ ...valid, [field]: "" }).success).toBe(
        false
      );
    }
  });
});

describe("LearningObjectivesPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "lo",
    objectives: [{ id: "a", verb: "x", body: "y" }],
  };

  it("accepts the minimal valid shape (one objective)", () => {
    expect(LearningObjectivesPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty objectives array (min(1))", () => {
    expect(
      LearningObjectivesPropsSchema.safeParse({ ...valid, objectives: [] })
        .success
    ).toBe(false);
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
