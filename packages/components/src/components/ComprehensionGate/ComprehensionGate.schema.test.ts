import { describe, expect, it } from "vitest";
import { ComprehensionGatePropsSchema } from "./ComprehensionGate.schema.ts";

describe("ComprehensionGatePropsSchema", () => {
  const valid = {
    course: "test",
    unit: "test",
    id: "cg-1",
    prompt: "How comfortable are you with this section?",
  };

  it("accepts the minimal valid shape", () => {
    expect(ComprehensionGatePropsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty required strings", () => {
    for (const field of ["course", "unit", "id", "prompt"] as const) {
      expect(
        ComprehensionGatePropsSchema.safeParse({ ...valid, [field]: "" })
          .success
      ).toBe(false);
    }
  });
});
