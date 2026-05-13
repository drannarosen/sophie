import { describe, expect, it } from "vitest";
import { AsideKind, AsidePropsSchema } from "./Aside.schema.ts";

describe("AsideKind enum", () => {
  it("accepts the four expected kinds", () => {
    for (const kind of ["note", "definition", "digression", "key-insight"]) {
      expect(AsideKind.safeParse(kind).success).toBe(true);
    }
  });

  it("rejects unknown kinds", () => {
    for (const kind of ["", "tip", "warning", "info", "callout", "marginal"]) {
      expect(AsideKind.safeParse(kind).success).toBe(false);
    }
  });
});

describe("AsidePropsSchema", () => {
  it("accepts the minimal shape (no kind, no title, children)", () => {
    // Mirrors Callout's pattern: `kind` defaults at render time, not
    // in the schema. children is a ReactNode placeholder.
    expect(AsidePropsSchema.safeParse({ children: null }).success).toBe(true);
  });

  it("accepts kind only", () => {
    expect(
      AsidePropsSchema.safeParse({ kind: "definition", children: null }).success
    ).toBe(true);
  });

  it("accepts kind + title together", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "definition",
        title: "Parallax",
        children: null,
      }).success
    ).toBe(true);
  });

  it("accepts title without kind", () => {
    // Title is meaningful for any kind; render defaults kind to "note".
    expect(
      AsidePropsSchema.safeParse({ title: "On observation", children: null })
        .success
    ).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "not-a-kind",
        children: null,
      }).success
    ).toBe(false);
  });

  it("rejects a non-string title", () => {
    expect(
      AsidePropsSchema.safeParse({ title: 123, children: null }).success
    ).toBe(false);
  });
});
