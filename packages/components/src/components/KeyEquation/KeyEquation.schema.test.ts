import { describe, expect, it } from "vitest";
import { KeyEquationPropsSchema } from "./KeyEquation.schema.ts";

describe("KeyEquationPropsSchema", () => {
  const valid = {
    id: "wiens-law",
    title: "Wien's Law",
    children: null,
  };

  it("accepts the minimal valid shape", () => {
    expect(KeyEquationPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty id (hash-anchor target must be non-empty)", () => {
    expect(KeyEquationPropsSchema.safeParse({ ...valid, id: "" }).success).toBe(
      false
    );
  });

  it("rejects empty title (accessible name must be non-empty)", () => {
    expect(
      KeyEquationPropsSchema.safeParse({ ...valid, title: "" }).success
    ).toBe(false);
  });

  it("rejects missing id and missing title", () => {
    const { id: _id, ...noId } = valid;
    expect(KeyEquationPropsSchema.safeParse(noId).success).toBe(false);
    const { title: _title, ...noTitle } = valid;
    expect(KeyEquationPropsSchema.safeParse(noTitle).success).toBe(false);
  });
});
