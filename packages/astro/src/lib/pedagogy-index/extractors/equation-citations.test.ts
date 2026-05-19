import { beforeEach, describe, expect, test } from "vitest";
import { mdxKeyEquationCitation, para, root } from "../_test-helpers.ts";
import { extractEquationCitations, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("extractEquationCitations (pure, chapter walker)", () => {
  test("returns one EquationCitationEntry for a self-closing <KeyEquation refId>", () => {
    const tree = root([mdxKeyEquationCitation("wiens-law")]);
    const citations = extractEquationCitations(tree as never, "spoiler-alerts");
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      chapter: "spoiler-alerts",
      refId: "wiens-law",
      anchor: "wiens-law-citation-1",
      number: 1,
    });
    expect(citations[0]?.framingHtml).toBeUndefined();
  });

  test("renders chapter framing prose children to framingHtml", () => {
    const tree = root([
      mdxKeyEquationCitation("wiens-law", [
        para("We've seen Wien's law before; here we apply it to dust."),
      ]),
    ]);
    const citations = extractEquationCitations(tree as never, "spoiler-alerts");
    expect(citations[0]?.framingHtml).toContain("We've seen Wien's law before");
  });

  test("assigns per-chapter number 1, 2, 3 in source order across three citations", () => {
    const tree = root([
      mdxKeyEquationCitation("wiens-law"),
      mdxKeyEquationCitation("stefan-boltzmann"),
      mdxKeyEquationCitation("planck-distribution"),
    ]);
    const citations = extractEquationCitations(tree as never, "ch");
    expect(citations).toHaveLength(3);
    expect(citations.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(citations.map((c) => c.refId)).toEqual([
      "wiens-law",
      "stefan-boltzmann",
      "planck-distribution",
    ]);
  });

  test("two citations of the same refId in one chapter get distinct anchors", () => {
    // Important for valid DOM ids when an author cites the same equation
    // twice in different sections of a chapter.
    const tree = root([
      mdxKeyEquationCitation("wiens-law"),
      mdxKeyEquationCitation("wiens-law"),
    ]);
    const citations = extractEquationCitations(tree as never, "ch");
    expect(citations).toHaveLength(2);
    expect(citations[0]?.anchor).toBe("wiens-law-citation-1");
    expect(citations[1]?.anchor).toBe("wiens-law-citation-2");
    expect(citations[0]?.anchor).not.toBe(citations[1]?.anchor);
  });

  test("throws when <KeyEquation> is missing refId", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "KeyEquation",
        attributes: [],
        children: [],
      },
    ]);
    expect(() => extractEquationCitations(tree as never, "ch")).toThrow(
      /refId/
    );
  });

  test("skips non-KeyEquation JSX elements", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [
          { type: "mdxJsxAttribute", name: "variant", value: "info" },
        ],
        children: [para("not a KeyEquation")],
      },
      mdxKeyEquationCitation("real-eq"),
    ]);
    const citations = extractEquationCitations(tree as never, "ch");
    expect(citations).toHaveLength(1);
    expect(citations[0]?.refId).toBe("real-eq");
  });
});
