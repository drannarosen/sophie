import { describe, expect, it } from "vitest";
import { TabPropsSchema, TabsPropsSchema } from "./Tabs.schema.ts";

describe("TabsPropsSchema", () => {
  it("accepts the minimal shape (children only)", () => {
    expect(() => TabsPropsSchema.parse({ children: "panels" })).not.toThrow();
  });

  it("accepts the full shape (defaultLabel + id + className + children)", () => {
    expect(() =>
      TabsPropsSchema.parse({
        defaultLabel: "Spectra",
        id: "anchor",
        className: "extra",
        children: "panels",
      })
    ).not.toThrow();
  });

  it("rejects non-string defaultLabel", () => {
    expect(() =>
      TabsPropsSchema.parse({ defaultLabel: 42, children: "x" })
    ).toThrow();
  });
});

describe("TabPropsSchema", () => {
  it("requires a non-empty label", () => {
    expect(() => TabPropsSchema.parse({ children: "x" })).toThrow();
    expect(() => TabPropsSchema.parse({ label: "", children: "x" })).toThrow();
  });

  it("accepts label + children", () => {
    expect(() =>
      TabPropsSchema.parse({ label: "Line spectra", children: "body" })
    ).not.toThrow();
  });
});
