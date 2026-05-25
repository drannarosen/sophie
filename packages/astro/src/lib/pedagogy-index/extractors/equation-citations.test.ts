import { beforeEach, describe, expect, test } from "vitest";
import { mdxKeyEquationCitation, para, root } from "../_test-helpers.ts";
import { extractEquationCitations, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("extractEquationCitations (pure, chapter walker)", () => {
  test("returns one EquationCitationEntry for a self-closing <KeyEquation refId>", () => {
    const tree = root([mdxKeyEquationCitation("wiens-law")]);
    const { entries } = extractEquationCitations(
      tree as never,
      "spoiler-alerts"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      unit: "spoiler-alerts",
      refId: "wiens-law",
      anchor: "wiens-law-citation-1",
      number: 1,
    });
    expect(entries[0]?.framingHtml).toBeUndefined();
  });

  test("renders chapter framing prose children to framingHtml", () => {
    const tree = root([
      mdxKeyEquationCitation("wiens-law", [
        para("We've seen Wien's law before; here we apply it to dust."),
      ]),
    ]);
    const { entries } = extractEquationCitations(
      tree as never,
      "spoiler-alerts"
    );
    expect(entries[0]?.framingHtml).toContain("We've seen Wien's law before");
  });

  test("assigns per-chapter number 1, 2, 3 in source order across three citations", () => {
    const tree = root([
      mdxKeyEquationCitation("wiens-law"),
      mdxKeyEquationCitation("stefan-boltzmann"),
      mdxKeyEquationCitation("planck-distribution"),
    ]);
    const { entries } = extractEquationCitations(tree as never, "ch");
    expect(entries).toHaveLength(3);
    expect(entries.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(entries.map((c) => c.refId)).toEqual([
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
    const { entries } = extractEquationCitations(tree as never, "ch");
    expect(entries).toHaveLength(2);
    expect(entries[0]?.anchor).toBe("wiens-law-citation-1");
    expect(entries[1]?.anchor).toBe("wiens-law-citation-2");
    expect(entries[0]?.anchor).not.toBe(entries[1]?.anchor);
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
    const { entries } = extractEquationCitations(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.refId).toBe("real-eq");
  });
});

describe("CL1 — missing client:* directive on <KeyEquation>", () => {
  test("emits ERROR finding when <KeyEquation> has refId but no client:*", () => {
    const tree = root([
      mdxKeyEquationCitation("newtons-second-law", [], {
        clientDirective: false,
      }),
    ]);
    const { entries, findings } = extractEquationCitations(
      tree as never,
      "missing-client-load"
    );
    expect(entries).toHaveLength(1);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: "CL1",
      severity: "ERROR",
      location: { unit: "missing-client-load" },
    });
    expect(findings[0]?.message).toContain("<KeyEquation");
    expect(findings[0]?.message).toContain("newtons-second-law");
  });

  test("emits NO finding when <KeyEquation> declares client:load", () => {
    const tree = root([mdxKeyEquationCitation("properly-gated-equation")]);
    const { entries, findings } = extractEquationCitations(
      tree as never,
      "ok-chapter"
    );
    expect(entries).toHaveLength(1);
    expect(findings).toHaveLength(0);
  });

  test("recognises any client:* directive (visible / idle / only / media)", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "KeyEquation",
        attributes: [
          { type: "mdxJsxAttribute", name: "refId", value: "eq-a" },
          { type: "mdxJsxAttribute", name: "client:visible", value: null },
        ],
        children: [],
      },
      {
        type: "mdxJsxFlowElement",
        name: "KeyEquation",
        attributes: [
          { type: "mdxJsxAttribute", name: "refId", value: "eq-b" },
          { type: "mdxJsxAttribute", name: "client:idle", value: null },
        ],
        children: [],
      },
      {
        type: "mdxJsxFlowElement",
        name: "KeyEquation",
        attributes: [
          { type: "mdxJsxAttribute", name: "refId", value: "eq-c" },
          { type: "mdxJsxAttribute", name: "client:only", value: "react" },
        ],
        children: [],
      },
      {
        type: "mdxJsxFlowElement",
        name: "KeyEquation",
        attributes: [
          { type: "mdxJsxAttribute", name: "refId", value: "eq-d" },
          {
            type: "mdxJsxAttribute",
            name: "client:media",
            value: "(min-width: 768px)",
          },
        ],
        children: [],
      },
    ]);
    const { entries, findings } = extractEquationCitations(
      tree as never,
      "ok-chapter"
    );
    expect(entries).toHaveLength(4);
    expect(findings).toHaveLength(0);
  });

  test("mixed: one bare + one gated → 1 CL1 finding, 2 entries", () => {
    const tree = root([
      mdxKeyEquationCitation("bare-eq", [], { clientDirective: false }),
      mdxKeyEquationCitation("gated-eq"),
    ]);
    const { entries, findings } = extractEquationCitations(
      tree as never,
      "missing-client-load"
    );
    expect(entries).toHaveLength(2);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("bare-eq");
  });
});
