import { describe, expect, it } from "vitest";
import {
  CalloutPropsSchema,
  InteractiveCalloutPropsSchema,
} from "./Callout.schema.ts";

describe("CalloutPropsSchema", () => {
  it("accepts an empty body and no variant (all fields optional except children placeholder)", () => {
    expect(CalloutPropsSchema.safeParse({ children: null }).success).toBe(true);
  });

  it("rejects an unknown variant", () => {
    expect(
      CalloutPropsSchema.safeParse({ variant: "not-a-variant", children: null })
        .success
    ).toBe(false);
  });
});

describe("InteractiveCalloutPropsSchema", () => {
  const valid = {
    course: "test",
    chapter: "test",
    id: "tip-1",
    children: null,
  };

  it("accepts the minimal valid shape", () => {
    expect(InteractiveCalloutPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing course/chapter/id", () => {
    const { course: _course, ...noCourse } = valid;
    expect(InteractiveCalloutPropsSchema.safeParse(noCourse).success).toBe(
      false
    );
    expect(
      InteractiveCalloutPropsSchema.safeParse({ ...valid, chapter: "" }).success
    ).toBe(false);
    expect(
      InteractiveCalloutPropsSchema.safeParse({ ...valid, id: "" }).success
    ).toBe(false);
  });

  it("rejects an unknown variant", () => {
    expect(
      InteractiveCalloutPropsSchema.safeParse({
        ...valid,
        variant: "not-a-variant",
      }).success
    ).toBe(false);
  });
});
