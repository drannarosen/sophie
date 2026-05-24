import { describe, expect, it } from "vitest";
import { GridPropsSchema } from "./Grid.schema.ts";

describe("GridPropsSchema", () => {
  it("accepts cols=1|2|3|4", () => {
    for (const cols of [1, 2, 3, 4] as const) {
      expect(() =>
        GridPropsSchema.parse({ cols, children: "x" })
      ).not.toThrow();
    }
  });

  it("rejects cols outside 1..4", () => {
    expect(() => GridPropsSchema.parse({ cols: 0, children: "x" })).toThrow();
    expect(() => GridPropsSchema.parse({ cols: 5, children: "x" })).toThrow();
  });

  it("accepts responsive boolean (optional)", () => {
    expect(() =>
      GridPropsSchema.parse({ cols: 2, responsive: false, children: "x" })
    ).not.toThrow();
    expect(() =>
      GridPropsSchema.parse({ cols: 2, children: "x" })
    ).not.toThrow();
  });

  it("rejects non-boolean responsive", () => {
    expect(() =>
      GridPropsSchema.parse({ cols: 2, responsive: "no", children: "x" })
    ).toThrow();
  });

  it("accepts gap=sm|md|lg (optional)", () => {
    for (const gap of ["sm", "md", "lg"] as const) {
      expect(() =>
        GridPropsSchema.parse({ cols: 2, gap, children: "x" })
      ).not.toThrow();
    }
  });

  it("rejects gap outside the enum", () => {
    expect(() =>
      GridPropsSchema.parse({ cols: 2, gap: "huge", children: "x" })
    ).toThrow();
  });
});
