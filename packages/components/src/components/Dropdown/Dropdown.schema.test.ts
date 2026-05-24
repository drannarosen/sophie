import { describe, expect, it } from "vitest";
import {
  DropdownItemPropsSchema,
  DropdownPropsSchema,
} from "./Dropdown.schema.ts";

describe("DropdownPropsSchema", () => {
  it("accepts the minimal shape (course + unit + id + children)", () => {
    expect(() =>
      DropdownPropsSchema.parse({
        course: "c",
        unit: "u",
        id: "i",
        children: "body",
      })
    ).not.toThrow();
  });

  it("requires non-empty course / unit / id", () => {
    expect(() =>
      DropdownPropsSchema.parse({
        course: "",
        unit: "u",
        id: "i",
        children: "x",
      })
    ).toThrow();
    expect(() =>
      DropdownPropsSchema.parse({
        course: "c",
        unit: "",
        id: "i",
        children: "x",
      })
    ).toThrow();
    expect(() =>
      DropdownPropsSchema.parse({
        course: "c",
        unit: "u",
        id: "",
        children: "x",
      })
    ).toThrow();
  });

  it("accepts label + defaultOpen + allowMultiple", () => {
    expect(() =>
      DropdownPropsSchema.parse({
        course: "c",
        unit: "u",
        id: "i",
        label: "X",
        defaultOpen: ["x"],
        allowMultiple: true,
        children: "body",
      })
    ).not.toThrow();
  });

  it("rejects non-array defaultOpen", () => {
    expect(() =>
      DropdownPropsSchema.parse({
        course: "c",
        unit: "u",
        id: "i",
        defaultOpen: "x",
        children: "body",
      })
    ).toThrow();
  });
});

describe("DropdownItemPropsSchema", () => {
  it("requires a non-empty label", () => {
    expect(() => DropdownItemPropsSchema.parse({ children: "x" })).toThrow();
    expect(() =>
      DropdownItemPropsSchema.parse({ label: "", children: "x" })
    ).toThrow();
  });

  it("accepts label + children + optional id", () => {
    expect(() =>
      DropdownItemPropsSchema.parse({
        label: "X",
        id: "anchor",
        children: "body",
      })
    ).not.toThrow();
  });
});
