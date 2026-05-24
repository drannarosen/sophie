import { describe, expect, it } from "vitest";
import { CardPropsSchema } from "./Card.schema.ts";

describe("CardPropsSchema", () => {
  it("accepts the minimal shape (children only)", () => {
    expect(() => CardPropsSchema.parse({ children: "body" })).not.toThrow();
  });

  it("accepts the full shape (title + id + className + children)", () => {
    expect(() =>
      CardPropsSchema.parse({
        title: "Header",
        id: "anchor",
        className: "extra",
        children: "body",
      })
    ).not.toThrow();
  });

  it("rejects non-string title", () => {
    expect(() =>
      CardPropsSchema.parse({ title: 42, children: "body" })
    ).toThrow();
  });

  it("rejects non-string id", () => {
    expect(() => CardPropsSchema.parse({ id: 42, children: "body" })).toThrow();
  });
});
