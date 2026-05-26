import { describe, expect, test } from "vitest";
import { extractMultiReps, transformMultiRep } from "../index.ts";
import type { MdxJsxFlowElement } from "../jsx-utils.ts";

/**
 * Synthetic-mdast tests for `extractMultiReps` + `transformMultiRep`,
 * mirroring the `transform-learning-objectives.test.ts` convention.
 * We don't parse real MDX here; the unified pipeline does that in
 * integration. Each test builds the minimum AST shape the extractor/
 * transform consumes and asserts the post-mutation parent shape.
 *
 * Per the 2026-05-17 MultiRep design hardening §D5: extractor produces
 * `MultiRepIndexEntry[]` (raw refs, no audit-time resolution); transform
 * serializes children into a `reps` mdxJsxAttribute and empties children,
 * paralleling the LearningObjectives pattern.
 */

/**
 * `MdastChild` + `TestRoot` are the test-side synthetic-tree shape we
 * hand to `extractMultiReps` / `transformMultiRep` via `tree as never`.
 * `MdxJsxFlowElement` is imported from the canonical home
 * (`../jsx-utils.ts`) per R9-test. `TestRoot` stays test-local because
 * mdast's `Root` types `children` as `BlockContent[]`, which is wider
 * than the factory-output union we need to keep assignment-checked at
 * construction sites.
 */
type MdastChild = MdxJsxFlowElement | Record<string, unknown>;
interface TestRoot {
  type: "root";
  children: ReadonlyArray<MdastChild>;
}

const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

const root = (children: ReadonlyArray<MdastChild>): TestRoot => ({
  type: "root",
  children,
});

const mdxFlow = (
  name: string,
  attrs: Record<string, string>,
  children: ReadonlyArray<MdastChild> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: Object.entries(attrs).map(([n, v]) => ({
    type: "mdxJsxAttribute",
    name: n,
    value: v,
  })),
  children,
});

const mdxMultiRep = (
  attrs: Record<string, string>,
  children: ReadonlyArray<MdastChild> = []
): MdxJsxFlowElement => mdxFlow("MultiRep", attrs, children);

const mdxRepVerbal = (body: string): MdxJsxFlowElement =>
  mdxFlow("RepVerbal", {}, [para(body)]);

const mdxRepEquation = (attrs: Record<string, string>): MdxJsxFlowElement =>
  mdxFlow("RepEquation", attrs, []);

const mdxRepFigure = (attrs: Record<string, string>): MdxJsxFlowElement =>
  mdxFlow("RepFigure", attrs, []);

function findMultiRep(tree: TestRoot): MdxJsxFlowElement | undefined {
  for (const node of tree.children) {
    const n = node as unknown as MdxJsxFlowElement;
    if (n.type === "mdxJsxFlowElement" && n.name === "MultiRep") {
      return n;
    }
  }
  return undefined;
}

function readRepsAttribute(mr: MdxJsxFlowElement): unknown {
  const attr = mr.attributes.find(
    (a) => a.type === "mdxJsxAttribute" && a.name === "reps"
  );
  if (!attr) throw new Error("no `reps` attribute on <MultiRep>");
  const v = (attr as unknown as { value: { value: string } }).value;
  return JSON.parse(v.value);
}

describe("extractMultiReps", () => {
  test("emits a MultiRepIndexEntry for a single MultiRep block with verbal + equation + figure", () => {
    const tree = root([
      mdxMultiRep({ concept: "orbital-radius" }, [
        mdxRepVerbal("The distance from the central mass."),
        mdxRepEquation({ refKey: "kepler-3rd-law", symbol: "r" }),
        mdxRepFigure({ refName: "orbit-geometry", symbolLabel: "r" }),
      ]),
    ]);

    const { entries, inlineRefUsages } = extractMultiReps(
      tree as never,
      "module-02/lecture-04"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      concept: "orbital-radius",
      id: "mr-orbital-radius",
      unit: "module-02/lecture-04",
      reps: [
        { kind: "verbal" },
        { kind: "equation", refKey: "kepler-3rd-law", symbol: "r" },
        {
          kind: "figure",
          refName: "orbit-geometry",
          symbolLabel: "r",
        },
      ],
    });
    // WS B+D (#191) — RepFigure / RepEquation children also emit
    // InlineRefUsageEntry records so F4 / R-series invariants count
    // MultiRep references as first-class citations.
    expect(inlineRefUsages).toEqual([
      {
        kind: "rep-equation",
        refKey: "kepler-3rd-law",
        unit: "module-02/lecture-04",
      },
      {
        kind: "rep-figure",
        refKey: "orbit-geometry",
        unit: "module-02/lecture-04",
      },
    ]);
  });

  test("auto-derives anchor id from concept slug when `id` is omitted", () => {
    const tree = root([
      mdxMultiRep({ concept: "redshift" }, [mdxRepVerbal("body")]),
    ]);
    const { entries } = extractMultiReps(tree as never, "ch");
    expect(entries[0]).toMatchObject({ id: "mr-redshift" });
  });

  test("uses author-supplied `id` when present (overrides auto-derive)", () => {
    const tree = root([
      mdxMultiRep({ concept: "redshift", id: "binding-1" }, [
        mdxRepVerbal("body"),
      ]),
    ]);
    const { entries } = extractMultiReps(tree as never, "ch");
    expect(entries[0]).toMatchObject({ id: "binding-1" });
  });

  test("preserves source order within the reps array (extractor is order-faithful)", () => {
    const tree = root([
      mdxMultiRep({ concept: "x" }, [
        mdxRepFigure({ refName: "fig" }),
        mdxRepEquation({ refKey: "eq", symbol: "x" }),
        mdxRepVerbal("body"),
      ]),
    ]);
    const { entries } = extractMultiReps(tree as never, "ch");
    expect(entries[0]?.reps.map((r) => r.kind)).toEqual([
      "figure",
      "equation",
      "verbal",
    ]);
  });

  test("carries optional equivalent_to + via on equation reps", () => {
    const tree = root([
      mdxMultiRep({ concept: "peak-thermal-wavelength" }, [
        mdxRepEquation({
          refKey: "wiens-law-frequency",
          symbol: "\\nu_{peak}",
          equivalent_to: "wiens-law-wavelength",
          via: "planck-substitution",
        }),
      ]),
    ]);
    const { entries } = extractMultiReps(tree as never, "ch");
    expect(entries[0]?.reps[0]).toMatchObject({
      kind: "equation",
      refKey: "wiens-law-frequency",
      symbol: "\\nu_{peak}",
      equivalent_to: "wiens-law-wavelength",
      via: "planck-substitution",
    });
  });

  test("ignores whitespace text nodes between Rep children (mdast emits these around source)", () => {
    const tree = root([
      mdxMultiRep({ concept: "x" }, [
        { type: "text", value: "\n  " } as Record<string, unknown>,
        mdxRepVerbal("body"),
        { type: "text", value: "\n  " } as Record<string, unknown>,
        mdxRepEquation({ refKey: "eq", symbol: "r" }),
      ]),
    ]);
    const { entries } = extractMultiReps(tree as never, "ch");
    expect(entries[0]?.reps).toHaveLength(2);
  });

  test("throws on missing concept attr", () => {
    const tree = root([mdxMultiRep({}, [mdxRepVerbal("body")])]);
    expect(() => extractMultiReps(tree as never, "ch")).toThrow(/concept/i);
  });

  test("throws on empty MultiRep (no Rep children)", () => {
    const tree = root([mdxMultiRep({ concept: "x" }, [])]);
    expect(() => extractMultiReps(tree as never, "ch")).toThrow(
      /empty|no Rep/i
    );
  });

  test("throws on missing refKey or symbol on RepEquation", () => {
    expect(() =>
      extractMultiReps(
        root([
          mdxMultiRep({ concept: "x" }, [mdxRepEquation({ symbol: "r" })]),
        ]) as never,
        "ch"
      )
    ).toThrow(/refKey/i);
    expect(() =>
      extractMultiReps(
        root([
          mdxMultiRep({ concept: "x" }, [mdxRepEquation({ refKey: "k" })]),
        ]) as never,
        "ch"
      )
    ).toThrow(/symbol/i);
  });

  test("throws on missing refName on RepFigure", () => {
    expect(() =>
      extractMultiReps(
        root([
          mdxMultiRep({ concept: "x" }, [mdxRepFigure({ symbolLabel: "r" })]),
        ]) as never,
        "ch"
      )
    ).toThrow(/refName/i);
  });

  test("throws on empty RepVerbal body", () => {
    const tree = root([
      mdxMultiRep({ concept: "x" }, [
        // RepVerbal with no text content — empty body trips the audit.
        mdxFlow("RepVerbal", {}, []),
      ]),
    ]);
    expect(() => extractMultiReps(tree as never, "ch")).toThrow(/empty/i);
  });

  test("throws on RepCode children (deferred from v1 per design §D1)", () => {
    const tree = root([
      mdxMultiRep({ concept: "x" }, [
        mdxFlow("RepCode", { refName: "orbit-sim", symbol: "r_au" }),
      ]),
    ]);
    expect(() => extractMultiReps(tree as never, "ch")).toThrow(
      /RepCode.*deferred|deferred.*RepCode|CodeCell/i
    );
  });

  test("throws on unexpected JSX child (non-Rep flow elements)", () => {
    const tree = root([
      mdxMultiRep({ concept: "x" }, [
        mdxFlow("Aside", { kind: "note" }, [para("stray")]),
      ]),
    ]);
    expect(() => extractMultiReps(tree as never, "ch")).toThrow(
      /unexpected child|Aside/i
    );
  });

  test("throws on within-chapter auto-id collision (two <MultiRep concept='x'> in one chapter)", () => {
    // Both auto-derive `mr-x`; the accumulator's Map keys collide. Surface
    // the error at extract-time so the message can reference the JSX
    // context (vs the accumulator only knowing the key string).
    const tree = root([
      mdxMultiRep({ concept: "x" }, [mdxRepVerbal("first binding")]),
      mdxMultiRep({ concept: "x" }, [mdxRepVerbal("second binding")]),
    ]);
    expect(() => extractMultiReps(tree as never, "ch")).toThrow(
      /id collision|anchor "mr-x"/i
    );
  });

  test("throws on within-chapter explicit-id collision (two <MultiRep id='binding-1'>)", () => {
    const tree = root([
      mdxMultiRep({ concept: "x", id: "binding-1" }, [mdxRepVerbal("first")]),
      mdxMultiRep({ concept: "y", id: "binding-1" }, [mdxRepVerbal("second")]),
    ]);
    expect(() => extractMultiReps(tree as never, "ch")).toThrow(
      /id collision|anchor "binding-1"/i
    );
  });

  test("allows two <MultiRep> blocks with different concepts (no collision)", () => {
    const tree = root([
      mdxMultiRep({ concept: "apparent-magnitude" }, [
        mdxRepVerbal("apparent body"),
      ]),
      mdxMultiRep({ concept: "absolute-magnitude" }, [
        mdxRepVerbal("absolute body"),
      ]),
    ]);
    const { entries } = extractMultiReps(tree as never, "ch");
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.id)).toEqual([
      "mr-apparent-magnitude",
      "mr-absolute-magnitude",
    ]);
  });
});

describe("transformMultiRep", () => {
  test("rewrites a single MultiRep block to a props-driven `reps` shape", () => {
    const tree = root([
      mdxMultiRep({ concept: "orbital-radius" }, [
        mdxRepVerbal("body"),
        mdxRepEquation({ refKey: "kepler-3rd-law", symbol: "r" }),
      ]),
    ]);

    transformMultiRep(tree as never, "ch");

    const mr = findMultiRep(tree);
    expect(mr).toBeDefined();
    expect(mr?.children).toEqual([]);
    expect(readRepsAttribute(mr as MdxJsxFlowElement)).toEqual([
      { kind: "verbal", body: expect.stringContaining("body") },
      { kind: "equation", refKey: "kepler-3rd-law", symbol: "r" },
    ]);
  });

  test("preserves source order across multiple reps", () => {
    const tree = root([
      mdxMultiRep({ concept: "x" }, [
        mdxRepFigure({ refName: "fig", symbolLabel: "r" }),
        mdxRepEquation({ refKey: "eq", symbol: "r" }),
        mdxRepVerbal("body"),
      ]),
    ]);

    transformMultiRep(tree as never, "ch");

    const mr = findMultiRep(tree);
    const reps = readRepsAttribute(mr as MdxJsxFlowElement) as Array<{
      kind: string;
    }>;
    expect(reps.map((r) => r.kind)).toEqual(["figure", "equation", "verbal"]);
  });

  test("the serialized payload writes `data.estree` for downstream lowering", () => {
    const tree = root([mdxMultiRep({ concept: "x" }, [mdxRepVerbal("body")])]);

    transformMultiRep(tree as never, "ch");

    const mr = findMultiRep(tree) as MdxJsxFlowElement;
    const attr = mr.attributes.find((a) => a.name === "reps") as unknown as {
      value: { type: string; data?: { estree?: { type?: string } } };
    };
    // Per the LO precedent: hast-util-to-estree reads `data.estree` not
    // the string `value`. Missing `data.estree` would compile the prop
    // to `reps={}` → undefined → SSR crash.
    expect(attr.value.type).toBe("mdxJsxAttributeValueExpression");
    expect(attr.value.data?.estree?.type).toBe("Program");
  });

  test("throws on an empty <MultiRep> block", () => {
    const tree = root([mdxMultiRep({ concept: "x" }, [])]);
    expect(() => transformMultiRep(tree as never, "ch")).toThrow(
      /empty|no Rep/i
    );
  });

  test("throws on RepCode children (deferred per design §D1)", () => {
    const tree = root([
      mdxMultiRep({ concept: "x" }, [
        mdxFlow("RepCode", { refName: "x", symbol: "x" }),
      ]),
    ]);
    expect(() => transformMultiRep(tree as never, "ch")).toThrow(
      /RepCode|CodeCell/i
    );
  });

  test("throws on missing concept attr", () => {
    const tree = root([mdxMultiRep({}, [mdxRepVerbal("body")])]);
    expect(() => transformMultiRep(tree as never, "ch")).toThrow(/concept/i);
  });
});
