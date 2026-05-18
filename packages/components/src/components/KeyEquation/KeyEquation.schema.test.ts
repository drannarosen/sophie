import { describe, expect, it } from "vitest";
import { KeyEquationPropsSchema } from "./KeyEquation.schema.ts";

describe("KeyEquationPropsSchema (ADR 0060 registry-shaped)", () => {
  const valid = {
    refId: "wiens-law",
  };

  it("accepts the minimal valid shape (refId only)", () => {
    expect(KeyEquationPropsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty refId (must resolve to a registry entry)", () => {
    expect(
      KeyEquationPropsSchema.safeParse({ ...valid, refId: "" }).success
    ).toBe(false);
  });

  it("rejects missing refId", () => {
    const { refId: _refId, ...rest } = valid;
    expect(KeyEquationPropsSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts optional showDerivation flag", () => {
    expect(
      KeyEquationPropsSchema.safeParse({ ...valid, showDerivation: true })
        .success
    ).toBe(true);
    expect(
      KeyEquationPropsSchema.safeParse({ ...valid, showDerivation: false })
        .success
    ).toBe(true);
  });

  it("accepts optional hideRelated flag", () => {
    expect(
      KeyEquationPropsSchema.safeParse({ ...valid, hideRelated: true }).success
    ).toBe(true);
  });

  it("accepts optional children (chapter framing prose)", () => {
    expect(
      KeyEquationPropsSchema.safeParse({ ...valid, children: "framing" })
        .success
    ).toBe(true);
  });

  it("rejects the legacy {id, title} shape (post-ADR-0060 hard rename)", () => {
    expect(
      KeyEquationPropsSchema.safeParse({
        id: "wiens-law",
        title: "Wien's Law",
      }).success
    ).toBe(false);
  });
});
