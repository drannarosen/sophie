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

  it("passes through an absolute http(s) URL untouched", () => {
    expect(joinBase("/astr201", "https://cdn/x.png")).toBe("https://cdn/x.png");
  });

  it("passes through a data: URI untouched", () => {
    expect(joinBase("/astr201", "data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA"
    );
  });

  it("passes through a protocol-relative URL untouched", () => {
    expect(joinBase("/astr201", "//cdn/x.png")).toBe("//cdn/x.png");
  });

  it("still prefixes a normal internal path (regression)", () => {
    expect(joinBase("/astr201", "/figures/a.png")).toBe(
      "/astr201/figures/a.png"
    );
  });
});
