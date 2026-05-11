import { describe, expect, it } from "vitest";
import { InteractiveCheckboxPropsSchema } from "./InteractiveCheckbox.schema.ts";

describe("InteractiveCheckboxPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "ic-1",
    children: "Mark as done",
  };

  it("accepts the minimal valid shape", () => {
    expect(InteractiveCheckboxPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts initial=true and initial=false", () => {
    expect(
      InteractiveCheckboxPropsSchema.safeParse({ ...valid, initial: true })
        .success
    ).toBe(true);
    expect(
      InteractiveCheckboxPropsSchema.safeParse({ ...valid, initial: false })
        .success
    ).toBe(true);
  });

  it("rejects empty required strings (course, chapter, id)", () => {
    for (const field of ["course", "chapter", "id"] as const) {
      expect(
        InteractiveCheckboxPropsSchema.safeParse({ ...valid, [field]: "" })
          .success
      ).toBe(false);
    }
  });
});
