import { describe, expect, it } from "vitest";
import { formatUnitTex } from "./format-unit-tex.ts";

describe("formatUnitTex", () => {
  it("re-enters math mode for `^{...}` segments inside \\text{}", () => {
    expect(formatUnitTex("cm s^{-1}")).toBe("\\text{cm s$^{-1}$}");
  });

  it("re-enters math mode for a single-char superscript", () => {
    expect(formatUnitTex("m^2")).toBe("\\text{m$^2$}");
  });

  it("re-enters math mode for `_{...}` subscript segments", () => {
    expect(formatUnitTex("X_{0}")).toBe("\\text{X$_{0}$}");
  });

  it("leaves a plain prose unit fully inside \\text{}", () => {
    expect(formatUnitTex("erg")).toBe("\\text{erg}");
  });
});
