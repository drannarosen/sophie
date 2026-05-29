import { describe, expect, it } from "vitest";
import { joinBase } from "./join-base.ts";

describe("joinBase", () => {
  it("returns the path unchanged at root base", () => {
    expect(joinBase("/", "/units/x")).toBe("/units/x");
  });

  it("prefixes a trailing-slash base", () => {
    expect(joinBase("/astr201/", "/units/x")).toBe("/astr201/units/x");
  });

  it("prefixes a no-trailing-slash base", () => {
    expect(joinBase("/astr201", "/units/x")).toBe("/astr201/units/x");
  });

  it("preserves a hash fragment on the path", () => {
    expect(joinBase("/astr201", "/units/x#a")).toBe("/astr201/units/x#a");
  });

  it("adds a leading slash to a path that lacks one", () => {
    expect(joinBase("/astr201", "units/x")).toBe("/astr201/units/x");
  });

  it("treats an empty-string base as root", () => {
    expect(joinBase("", "/units/x")).toBe("/units/x");
  });
});
