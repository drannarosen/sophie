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

  // PR-δ' bundle (ADR 0043 §R5) — author-declared symbols.
  it("accepts the optional `symbols` array (author-declared canonical TeX-form symbols)", () => {
    expect(
      KeyEquationPropsSchema.safeParse({
        ...valid,
        symbols: ["T", "\\lambda_{peak}", "b"],
      }).success
    ).toBe(true);
  });

  it("accepts an empty `symbols` array", () => {
    expect(
      KeyEquationPropsSchema.safeParse({ ...valid, symbols: [] }).success
    ).toBe(true);
  });

  it("rejects empty-string entries in `symbols` (NonEmptyString)", () => {
    expect(
      KeyEquationPropsSchema.safeParse({
        ...valid,
        symbols: ["T", ""],
      }).success
    ).toBe(false);
  });
});
