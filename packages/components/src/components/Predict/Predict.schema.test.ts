import { describe, expect, it } from "vitest";
import { PredictPromptSchema, PredictPropsSchema } from "./Predict.schema.ts";

describe("PredictPromptSchema", () => {
  it("accepts a complete prompt", () => {
    expect(
      PredictPromptSchema.safeParse({ id: "p1", label: "Predict X" }).success
    ).toBe(true);
  });

  it("rejects empty id or label", () => {
    expect(
      PredictPromptSchema.safeParse({ id: "", label: "Predict X" }).success
    ).toBe(false);
    expect(PredictPromptSchema.safeParse({ id: "p1", label: "" }).success).toBe(
      false
    );
  });
});

describe("PredictPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "predict-1",
    prompts: [{ id: "p1", label: "Predict X" }],
  };

  it("accepts the minimal valid shape (one prompt, no children)", () => {
    expect(PredictPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty prompts array (min(1))", () => {
    expect(
      PredictPropsSchema.safeParse({ ...valid, prompts: [] }).success
    ).toBe(false);
  });

  it("rejects empty optional strings when provided", () => {
    for (const field of ["description", "closing", "heading"] as const) {
      expect(
        PredictPropsSchema.safeParse({ ...valid, [field]: "" }).success
      ).toBe(false);
    }
  });

  it("rejects empty required strings (course, chapter, id)", () => {
    for (const field of ["course", "chapter", "id"] as const) {
      expect(
        PredictPropsSchema.safeParse({ ...valid, [field]: "" }).success
      ).toBe(false);
    }
  });
});
