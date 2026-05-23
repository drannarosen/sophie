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
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
          { type: "text", value: " and " },
          mdxInlineJsx("EquationRef", { refId: "wiens-law" }),
          { type: "text", value: " and " },
          mdxInlineJsx("FigureRef", { name: "hr-diagram" }),
          { type: "text", value: " and " },
          mdxInlineJsx("ChapterRef", { slug: "hydrostatic-equilibrium" }),
          { type: "text", value: "." },
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(4);
    expect(entries).toEqual(
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
        { slug: "hydrostatic-equilibrium" },
        "mdxJsxFlowElement"
      ),
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
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
          mdxInlineJsx("GlossaryTerm", {}), // missing name
          mdxInlineJsx("EquationRef", { refId: "" }), // empty refId
          mdxInlineJsx("FigureRef", { name: "valid" }),
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
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
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.kind).toBe("glossary-term");
  });

  test("produces multiple entries when the same refKey appears more than once", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(3);
    expect(
      entries.every(
        (e) => e.kind === "glossary-term" && e.refKey === "Parallax"
      )
    ).toBe(true);
  });
});
