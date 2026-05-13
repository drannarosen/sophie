import { describe, expect, it } from "vitest";
import { ModuleSchema } from "./module.ts";

describe("ModuleSchema", () => {
  it("accepts a minimum-valid module (slug, title, order)", () => {
    const result = ModuleSchema.safeParse({
      slug: "foundations",
      title: "Foundations",
      order: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional description", () => {
    const result = ModuleSchema.safeParse({
      slug: "foundations",
      title: "Foundations",
      order: 1,
      description: "The shared vocabulary every later module assumes.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing slug", () => {
    const result = ModuleSchema.safeParse({
      title: "Foundations",
      order: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = ModuleSchema.safeParse({
      slug: "foundations",
      order: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing order", () => {
    const result = ModuleSchema.safeParse({
      slug: "foundations",
      title: "Foundations",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slug that isn't kebab-case", () => {
    for (const bad of ["UPPER", "with space", "trailing-", "a--b"]) {
      const result = ModuleSchema.safeParse({
        slug: bad,
        title: "T",
        order: 0,
      });
      expect(result.success, `expected slug "${bad}" to be rejected`).toBe(
        false
      );
    }
  });

  it("rejects empty title", () => {
    const result = ModuleSchema.safeParse({
      slug: "x",
      title: "",
      order: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative or non-integer order", () => {
    expect(
      ModuleSchema.safeParse({ slug: "x", title: "T", order: -1 }).success
    ).toBe(false);
    expect(
      ModuleSchema.safeParse({ slug: "x", title: "T", order: 1.5 }).success
    ).toBe(false);
  });
});
