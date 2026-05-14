import { describe, expect, test } from "vitest";
import { transformLearningObjectives } from "./pedagogy-index-extractor.ts";

/**
 * Tests over synthetic mdast trees, matching the convention in
 * `pedagogy-index-extractor.test.ts`. We don't parse real MDX here;
 * the unified pipeline does that in integration. Each test builds
 * the minimum AST shape `transformLearningObjectives` consumes and
 * asserts the post-mutation parent shape: `children === []` and an
 * `objectives` mdxJsxAttribute carrying a JSON-stringified array of
 * `{ id, verb, body }` entries.
 */

interface MdxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: string;
}
interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: MdxAttribute[];
  children: ReadonlyArray<Record<string, unknown>>;
}
interface Root {
  type: "root";
  children: ReadonlyArray<Record<string, unknown>>;
}

const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

const root = (children: ReadonlyArray<Record<string, unknown>>): Root => ({
  type: "root",
  children,
});

const mdxLearningObjectives = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name: "LearningObjectives",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

const mdxObjective = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name: "Objective",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

function findLO(tree: Root): MdxJsxFlowElement | undefined {
  for (const node of tree.children) {
    const n = node as MdxJsxFlowElement;
    if (n.type === "mdxJsxFlowElement" && n.name === "LearningObjectives") {
      return n;
    }
  }
  return undefined;
}

function readObjectivesAttribute(lo: MdxJsxFlowElement): unknown {
  const attr = lo.attributes.find(
    (a) => a.type === "mdxJsxAttribute" && a.name === "objectives"
  );
  if (!attr) throw new Error("no `objectives` attribute on parent");
  // The transform writes an mdxJsxAttributeValueExpression whose `value`
  // is a JS-literal string. JSON.parse round-trips it since the literal
  // is JSON-shaped (string + nested string-only objects).
  const v = (attr as unknown as { value: { value: string } }).value;
  return JSON.parse(v.value);
}

describe("transformLearningObjectives", () => {
  test("rewrites a single-Objective LO block to a props-driven shape", () => {
    const tree = root([
      mdxLearningObjectives({ course: "astr201", chapter: "ch", id: "lo" }, [
        mdxObjective({ id: "thesis", verb: "State" }, [
          para("the course thesis"),
        ]),
      ]),
    ]);

    transformLearningObjectives(tree as never, "ch");

    const lo = findLO(tree);
    expect(lo).toBeDefined();
    expect(lo?.children).toEqual([]);
    expect(readObjectivesAttribute(lo as MdxJsxFlowElement)).toEqual([
      {
        id: "thesis",
        verb: "State",
        body: expect.stringContaining("thesis"),
      },
    ]);
  });

  test("preserves source order across multiple Objectives", () => {
    const tree = root([
      mdxLearningObjectives({ id: "lo" }, [
        mdxObjective({ id: "a", verb: "State" }, [para("first")]),
        mdxObjective({ id: "b", verb: "Explain" }, [para("second")]),
        mdxObjective({ id: "c", verb: "Apply" }, [para("third")]),
      ]),
    ]);

    transformLearningObjectives(tree as never, "ch");

    const lo = findLO(tree);
    const items = readObjectivesAttribute(lo as MdxJsxFlowElement) as Array<{
      id: string;
    }>;
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  test("throws on an empty <LearningObjectives> block", () => {
    const tree = root([mdxLearningObjectives({ id: "lo" }, [])]);
    expect(() => transformLearningObjectives(tree as never, "ch")).toThrow(
      /empty|no.*Objective/i
    );
  });

  test("throws on a non-Objective JSX flow sibling", () => {
    const tree = root([
      mdxLearningObjectives({ id: "lo" }, [
        mdxObjective({ id: "a", verb: "State" }, [para("body")]),
        {
          type: "mdxJsxFlowElement",
          name: "Aside",
          attributes: [],
          children: [para("stray")],
        },
      ]),
    ]);
    expect(() => transformLearningObjectives(tree as never, "ch")).toThrow(
      /unexpected child|Aside|only.*Objective/i
    );
  });

  test("throws on duplicate Objective id within one LO", () => {
    const tree = root([
      mdxLearningObjectives({ id: "lo" }, [
        mdxObjective({ id: "dup", verb: "State" }, [para("first")]),
        mdxObjective({ id: "dup", verb: "Explain" }, [para("second")]),
      ]),
    ]);
    expect(() => transformLearningObjectives(tree as never, "ch")).toThrow(
      /duplicate/i
    );
  });

  test("throws when an <Objective> is missing a non-empty `id`", () => {
    const tree = root([
      mdxLearningObjectives({ id: "lo" }, [
        mdxObjective({ verb: "State" }, [para("body")]),
      ]),
    ]);
    expect(() => transformLearningObjectives(tree as never, "ch")).toThrow(
      /missing.*`?id`?/i
    );
  });

  test("throws when an <Objective> is missing a non-empty `verb`", () => {
    const tree = root([
      mdxLearningObjectives({ id: "lo" }, [
        mdxObjective({ id: "a" }, [para("body")]),
      ]),
    ]);
    expect(() => transformLearningObjectives(tree as never, "ch")).toThrow(
      /missing.*`?verb`?/i
    );
  });

  test("throws when an <Objective> has an empty body", () => {
    const tree = root([
      mdxLearningObjectives({ id: "lo" }, [
        mdxObjective({ id: "a", verb: "State" }, []),
      ]),
    ]);
    expect(() => transformLearningObjectives(tree as never, "ch")).toThrow(
      /empty.*body/i
    );
  });

  test("ignores whitespace-only text nodes between Objectives", () => {
    const tree = root([
      mdxLearningObjectives({ id: "lo" }, [
        { type: "text", value: "\n  " },
        mdxObjective({ id: "a", verb: "State" }, [para("first")]),
        { type: "text", value: "\n  " },
        mdxObjective({ id: "b", verb: "Explain" }, [para("second")]),
        { type: "text", value: "\n" },
      ]),
    ]);

    transformLearningObjectives(tree as never, "ch");

    const lo = findLO(tree);
    const items = readObjectivesAttribute(lo as MdxJsxFlowElement) as Array<{
      id: string;
    }>;
    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});
