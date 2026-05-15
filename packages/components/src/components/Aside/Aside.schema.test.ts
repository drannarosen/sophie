import { describe, expect, it } from "vitest";
import { AsideKind, AsidePropsSchema } from "./Aside.schema.ts";

describe("AsideKind enum", () => {
  it("accepts the five expected kinds", () => {
    for (const kind of [
      "note",
      "definition",
      "digression",
      "key-insight",
      "misconception",
    ]) {
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

  it("accepts kind='note' without a title", () => {
    expect(
      AsidePropsSchema.safeParse({ kind: "note", children: null }).success
    ).toBe(true);
  });

  it("accepts kind='digression' without a title", () => {
    expect(
      AsidePropsSchema.safeParse({ kind: "digression", children: null }).success
    ).toBe(true);
  });

  it("accepts kind='key-insight' without a title", () => {
    expect(
      AsidePropsSchema.safeParse({ kind: "key-insight", children: null })
        .success
    ).toBe(true);
  });

  it("accepts kind='misconception' without a title (PR-C3 T8)", () => {
    // Per PR-C3 decision #8: <Aside kind="misconception"> keeps title
    // optional (consistent with key-insight). No refinement change.
    expect(
      AsidePropsSchema.safeParse({ kind: "misconception", children: null })
        .success
    ).toBe(true);
  });

  it("rejects kind='definition' without a title — refinement unchanged (PR-C3 T9)", () => {
    // Regression: the existing definition refinement is unaffected
    // by adding the new "misconception" enum value.
    expect(
      AsidePropsSchema.safeParse({ kind: "definition", children: null }).success
    ).toBe(false);
  });

  it("rejects kind='definition' without a title (refinement)", () => {
    // PR-C1 introduces a Zod refinement: <Aside kind="definition"> must
    // carry a non-empty `title` because the title is canonical for term
    // identity in the pedagogy index (ADR 0038).
    const result = AsidePropsSchema.safeParse({
      kind: "definition",
      children: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(
        /title.*required.*definition/i
      );
    }
  });

  it("rejects kind='definition' with an empty title", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "definition",
        title: "",
        children: null,
      }).success
    ).toBe(false);
  });

  it("rejects kind='definition' with a whitespace-only title", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "definition",
        title: "   ",
        children: null,
      }).success
    ).toBe(false);
  });

  it("accepts kind='definition' with a non-empty title", () => {
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

  it("accepts an explicit `id` override prop", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "definition",
        title: "Parallax",
        id: "custom-slug",
        children: null,
      }).success
    ).toBe(true);
  });

  it("rejects a non-string `id` prop", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "definition",
        title: "Parallax",
        id: 42,
        children: null,
      }).success
    ).toBe(false);
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

  // ADR 0044 — misconception-graph fields.
  it("accepts kind='misconception' with all four graph fields populated", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "misconception",
        title: "Universe with a center",
        prerequisite_misconceptions: ["expansion-vs-motion-in-space"],
        related_misconceptions: ["big-bang-as-explosion-in-space"],
        concept_refs: ["redshift", "hubble-parameter"],
        discipline_scope: ["astronomy"],
        children: null,
      }).success
    ).toBe(true);
  });

  it("accepts kind='misconception' without any graph fields (pre-ADR-0044 shape)", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "misconception",
        children: null,
      }).success
    ).toBe(true);
  });

  it("accepts an empty prerequisite_misconceptions list (DAG root)", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "misconception",
        title: "Root misconception",
        prerequisite_misconceptions: [],
        children: null,
      }).success
    ).toBe(true);
  });

  it("rejects an empty-string slug inside related_misconceptions", () => {
    expect(
      AsidePropsSchema.safeParse({
        kind: "misconception",
        related_misconceptions: [""],
        children: null,
      }).success
    ).toBe(false);
  });
});
