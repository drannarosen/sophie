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

  it("accepts variant='misconception' with an id prop (PR-C3 T10)", () => {
    // Per PR-C3 decisions #2 + #8: CalloutVariant gains "misconception"
    // (alongside existing "caution" — NOT a rename), and CalloutProps
    // gains an optional `id?: string` symmetric with Aside.id?.
    expect(
      CalloutPropsSchema.safeParse({
        variant: "misconception",
        id: "x",
        children: null,
      }).success
    ).toBe(true);
  });

  it("accepts variant='caution' — backward-compat preserved (PR-C3 T11)", () => {
    // Per PR-C3 decision #2: "misconception" is ADDED alongside
    // "caution", not a rename. Existing caution call sites must
    // continue to typecheck and parse.
    expect(
      CalloutPropsSchema.safeParse({ variant: "caution", children: null })
        .success
    ).toBe(true);
  });

  it("accepts an optional `id` prop on the static Callout", () => {
    expect(
      CalloutPropsSchema.safeParse({
        variant: "info",
        id: "my-callout",
        children: null,
      }).success
    ).toBe(true);
  });

  it("rejects a non-string `id` prop", () => {
    expect(
      CalloutPropsSchema.safeParse({ id: 42, children: null }).success
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
