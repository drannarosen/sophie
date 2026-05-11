import { describe, expect, it } from "vitest";
import { ConfidenceCheckPropsSchema } from "./ConfidenceCheck.schema.ts";

describe("ConfidenceCheckPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "cc-1",
    prompt: "How sure are you?",
  };

  it("accepts the minimal valid shape (scale omitted, defaults in component)", () => {
    expect(ConfidenceCheckPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts scale=5 and scale=7", () => {
    expect(
      ConfidenceCheckPropsSchema.safeParse({ ...valid, scale: 5 }).success
    ).toBe(true);
    expect(
      ConfidenceCheckPropsSchema.safeParse({ ...valid, scale: 7 }).success
    ).toBe(true);
  });

  it("rejects scale values other than 5 or 7", () => {
    for (const bad of [3, 4, 6, 8, 10, 0, -1]) {
      expect(
        ConfidenceCheckPropsSchema.safeParse({ ...valid, scale: bad }).success
      ).toBe(false);
    }
  });

  it("rejects empty required strings", () => {
    for (const field of ["course", "chapter", "id", "prompt"] as const) {
      expect(
        ConfidenceCheckPropsSchema.safeParse({ ...valid, [field]: "" }).success
      ).toBe(false);
    }
  });
});
