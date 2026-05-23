import { describe, expect, it } from "vitest";
import { ReflectionPropsSchema } from "./Reflection.schema.ts";

describe("ReflectionPropsSchema", () => {
  const valid = {
    course: "test",
    unit: "test",
    id: "refl-1",
    prompt: "What surprised you?",
  };

  it("accepts the minimal valid shape (placeholder omitted)", () => {
    expect(ReflectionPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an optional placeholder", () => {
    expect(
      ReflectionPropsSchema.safeParse({
        ...valid,
        placeholder: "Type your thought here…",
      }).success
    ).toBe(true);
  });

  it("rejects empty required strings", () => {
    for (const field of ["course", "unit", "id", "prompt"] as const) {
      expect(
        ReflectionPropsSchema.safeParse({ ...valid, [field]: "" }).success
      ).toBe(false);
    }
  });
});
