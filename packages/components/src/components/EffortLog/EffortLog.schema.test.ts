import { describe, expect, it } from "vitest";
import { EffortLogPropsSchema } from "./EffortLog.schema.ts";

describe("EffortLogPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "el-1",
    prompt: "How much effort did you give this section?",
  };

  it("accepts the minimal valid shape", () => {
    expect(EffortLogPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty required strings", () => {
    for (const field of ["course", "chapter", "id", "prompt"] as const) {
      expect(
        EffortLogPropsSchema.safeParse({ ...valid, [field]: "" }).success
      ).toBe(false);
    }
  });
});
