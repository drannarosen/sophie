import { describe, expect, it } from "vitest";
import { CollapsibleCardPropsSchema } from "./CollapsibleCard.schema.ts";

describe("CollapsibleCardPropsSchema", () => {
  const valid = {
    course: "test",
    unit: "test",
    id: "card-1",
    title: "Deep Dive",
    children: null,
  };

  it("accepts the minimal valid shape (defaultOpen omitted)", () => {
    expect(CollapsibleCardPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts defaultOpen=true and defaultOpen=false", () => {
    expect(
      CollapsibleCardPropsSchema.safeParse({ ...valid, defaultOpen: true })
        .success
    ).toBe(true);
    expect(
      CollapsibleCardPropsSchema.safeParse({ ...valid, defaultOpen: false })
        .success
    ).toBe(true);
  });

  it("rejects empty required strings (course, chapter, id, title)", () => {
    for (const field of ["course", "unit", "id", "title"] as const) {
      expect(
        CollapsibleCardPropsSchema.safeParse({ ...valid, [field]: "" }).success
      ).toBe(false);
    }
  });
});
