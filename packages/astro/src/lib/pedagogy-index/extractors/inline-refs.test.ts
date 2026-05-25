import { beforeEach, describe, expect, test } from "vitest";
import { mdxInlineJsx, root } from "../_test-helpers.ts";
import { extractInlineRefUsages, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("extractInlineRefUsages (pure)", () => {
  test("produces one entry per <GlossaryTerm>, <EquationRef>, <FigureRef>, <ChapterRef>", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "See " },
          mdxInlineJsx("GlossaryTerm", {
            name: "Parallax",
            "client:load": "true",
          }),
          { type: "text", value: " and " },
          mdxInlineJsx("EquationRef", {
            refId: "wiens-law",
            "client:load": "true",
          }),
          { type: "text", value: " and " },
          mdxInlineJsx("FigureRef", {
            name: "hr-diagram",
            "client:load": "true",
          }),
          { type: "text", value: " and " },
          mdxInlineJsx("ChapterRef", {
            slug: "hydrostatic-equilibrium",
            "client:load": "true",
          }),
          { type: "text", value: "." },
        ],
      },
    ]);

    const { usages } = extractInlineRefUsages(tree as never, "spoiler-alerts");

    expect(usages).toHaveLength(4);
    expect(usages).toEqual(
      expect.arrayContaining([
        {
          kind: "glossary-term",
          refKey: "Parallax",
          unit: "spoiler-alerts",
        },
        {
          kind: "eq-ref",
          refKey: "wiens-law",
          unit: "spoiler-alerts",
        },
        {
          kind: "figure-ref",
          refKey: "hr-diagram",
          unit: "spoiler-alerts",
        },
        {
          kind: "chapter-ref",
          refKey: "hydrostatic-equilibrium",
          unit: "spoiler-alerts",
        },
      ])
    );
  });

  test("also captures block-level <ChapterRef> (mdxJsxFlowElement)", () => {
    const tree = root([
      mdxInlineJsx(
        "ChapterRef",
        { slug: "hydrostatic-equilibrium", "client:load": "true" },
        "mdxJsxFlowElement"
      ),
    ]);

    const { usages } = extractInlineRefUsages(tree as never, "ch");
    expect(usages).toHaveLength(1);
    expect(usages[0]).toEqual({
      kind: "chapter-ref",
      refKey: "hydrostatic-equilibrium",
      unit: "ch",
    });
  });

  test("missing/empty lookup prop is silently skipped (audit catches it separately)", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", { "client:load": "true" }), // missing name
          mdxInlineJsx("EquationRef", {
            refId: "",
            "client:load": "true",
          }), // empty refId
          mdxInlineJsx("FigureRef", {
            name: "valid",
            "client:load": "true",
          }),
        ],
      },
    ]);

    const { usages } = extractInlineRefUsages(tree as never, "ch");
    expect(usages).toHaveLength(1);
    expect(usages[0]).toEqual({
      kind: "figure-ref",
      refKey: "valid",
      unit: "ch",
    });
  });

  test("skips JSX elements that aren't one of the four inline-ref components", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("Strong", { foo: "bar" }),
          mdxInlineJsx("GlossaryTerm", {
            name: "Parallax",
            "client:load": "true",
          }),
        ],
      },
    ]);

    const { usages } = extractInlineRefUsages(tree as never, "ch");
    expect(usages).toHaveLength(1);
    expect(usages[0]?.kind).toBe("glossary-term");
  });

  test("produces multiple entries when the same refKey appears more than once", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", {
            name: "Parallax",
            "client:load": "true",
          }),
          mdxInlineJsx("GlossaryTerm", {
            name: "Parallax",
            "client:load": "true",
          }),
          mdxInlineJsx("GlossaryTerm", {
            name: "Parallax",
            "client:load": "true",
          }),
        ],
      },
    ]);

    const { usages } = extractInlineRefUsages(tree as never, "ch");
    expect(usages).toHaveLength(3);
    expect(
      usages.every((e) => e.kind === "glossary-term" && e.refKey === "Parallax")
    ).toBe(true);
  });
});

describe("CL1 — missing client:* directive on store-backed inline-refs", () => {
  test("emits one ERROR finding per bare inline-ref callsite (4 of 4 components)", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          // All four bare — must each trigger CL1.
          mdxInlineJsx("GlossaryTerm", { name: "dimensions" }),
          mdxInlineJsx("EquationRef", { refId: "bohr-energy" }),
          mdxInlineJsx("FigureRef", { name: "kepler-orbit" }),
          mdxInlineJsx("ChapterRef", { slug: "next-lecture" }),
        ],
      },
    ]);

    const { usages, findings } = extractInlineRefUsages(
      tree as never,
      "missing-client-load"
    );

    expect(usages).toHaveLength(4);
    expect(findings).toHaveLength(4);
    expect(findings.every((f) => f.code === "CL1")).toBe(true);
    expect(findings.every((f) => f.severity === "ERROR")).toBe(true);
    expect(
      findings.every((f) => f.location?.unit === "missing-client-load")
    ).toBe(true);
    expect(findings.map((f) => f.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("<GlossaryTerm>"),
        expect.stringContaining("<EquationRef>"),
        expect.stringContaining("<FigureRef>"),
        expect.stringContaining("<ChapterRef>"),
      ])
    );
  });

  test("recognises any client:* directive (load / visible / idle / only / media)", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", {
            name: "a",
            "client:load": "true",
          }),
          mdxInlineJsx("GlossaryTerm", {
            name: "b",
            "client:visible": "true",
          }),
          mdxInlineJsx("GlossaryTerm", {
            name: "c",
            "client:idle": "true",
          }),
          mdxInlineJsx("GlossaryTerm", {
            name: "d",
            "client:only": "react",
          }),
          mdxInlineJsx("GlossaryTerm", {
            name: "e",
            "client:media": "(min-width: 768px)",
          }),
        ],
      },
    ]);

    const { usages, findings } = extractInlineRefUsages(tree as never, "ch");
    expect(usages).toHaveLength(5);
    expect(findings).toHaveLength(0);
  });

  test("mixed: 5 bare + 2 gated → 5 findings, 7 usages", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          // Bare — 4 of the inline-ref components
          mdxInlineJsx("GlossaryTerm", { name: "dimensions" }),
          mdxInlineJsx("GlossaryTerm", {
            name: "other",
            "client:load": "true",
          }),
          mdxInlineJsx("EquationRef", { refId: "bohr-energy" }),
          mdxInlineJsx("FigureRef", { name: "kepler-orbit" }),
          mdxInlineJsx("ChapterRef", { slug: "next-lecture" }),
        ],
      },
    ]);

    const { usages, findings } = extractInlineRefUsages(
      tree as never,
      "missing-client-load"
    );
    expect(usages).toHaveLength(5);
    expect(findings).toHaveLength(4);
  });
});
