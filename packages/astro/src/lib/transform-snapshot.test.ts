import { describe, expect, test } from "vitest";
import {
  pedagogyIndexRemarkPlugin,
  resetIndexAccumulator,
} from "./pedagogy-index-extractor.ts";

/**
 * Layer 1.5 — plugin round-trip snapshot test. See design doc
 * §4 "Layer 1.5: Plugin round-trip snapshot". The Layer-1 unit tests
 * (transform-learning-objectives.test.ts) cover the transform in
 * isolation against minimal LO-only trees. This snapshot test covers
 * the *full plugin invocation* against a tree that mixes prose,
 * headings, links, an LO block, and an unrelated `<Aside>` JSX
 * element — so the snapshot pins down two things at once:
 *
 *   (snapshot)   The whole post-transform tree shape, including
 *                exactly how the LO block was rewritten and how
 *                every non-LO node round-tripped untouched.
 *
 *   (predicates) Explicit "what we actually care about" assertions
 *                that don't depend on snapshot interpretation:
 *                  - LO children emptied
 *                  - LO has an `objectives` attribute
 *                  - Aside preserved
 *
 * The snapshot is the *catch-net* (regressions surface as diffs);
 * the predicates are the *contract* (humans read these to know
 * what the test enforces). Per errata #3 + #4, we build the input
 * mdast manually here — no `remark` / `remark-mdx` deps in tests.
 */

interface MdxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: unknown;
}
interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: MdxAttribute[];
  children: ReadonlyArray<MdastChild>;
}
/**
 * `MdastChild` is the test-side union of node shapes we hand to
 * `pedagogyIndexRemarkPlugin` via `tree as never`. Factory functions
 * return `MdxJsxFlowElement`, while inline text/paragraph/link nodes
 * flow through as the open `Record<string, unknown>` shape. The union
 * keeps factory outputs assignable to `children` slots without
 * weakening the structural types the assertions read.
 */
type MdastChild = MdxJsxFlowElement | Record<string, unknown>;
interface Root {
  type: "root";
  children: Array<MdastChild>;
}

const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

const root = (children: ReadonlyArray<MdastChild>): Root => ({
  type: "root",
  children: [...children],
});

const mdxLearningObjectives = (
  attrs: Record<string, string>,
  children: ReadonlyArray<MdastChild> = []
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
  children: ReadonlyArray<MdastChild> = []
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

function findByName(tree: Root, name: string): MdxJsxFlowElement | undefined {
  for (const node of tree.children) {
    const n = node as unknown as MdxJsxFlowElement;
    if (n.type === "mdxJsxFlowElement" && n.name === name) {
      return n;
    }
  }
  return undefined;
}

describe("pedagogyIndexRemarkPlugin round-trip", () => {
  test("transforms LO in place while leaving every non-LO node intact", () => {
    resetIndexAccumulator();

    const asideChildren = [para("untouched aside body")];
    const tree = root([
      {
        type: "heading",
        depth: 1,
        children: [{ type: "text", value: "Chapter title" }],
      },
      {
        type: "paragraph",
        children: [
          { type: "text", value: "Prose with " },
          {
            type: "strong",
            children: [{ type: "text", value: "bold" }],
          },
          { type: "text", value: " and a " },
          {
            type: "link",
            url: "https://example.com",
            children: [{ type: "text", value: "link" }],
          },
          { type: "text", value: "." },
        ],
      },
      mdxLearningObjectives({ course: "c", chapter: "ch", id: "lo" }, [
        mdxObjective({ id: "o1", verb: "State" }, [para("the thesis")]),
        mdxObjective({ id: "o2", verb: "Explain" }, [para("the reason")]),
      ]),
      para("More prose after."),
      {
        type: "mdxJsxFlowElement",
        name: "Aside",
        attributes: [{ type: "mdxJsxAttribute", name: "title", value: "x" }],
        children: asideChildren,
      },
    ]);

    const transform = pedagogyIndexRemarkPlugin({
      getChapterSlug: () => "ch",
    });
    transform(tree as never, { path: "ch.mdx" } as never);

    // Assertion B — explicit contract for the LO rewrite. Humans read
    // this to know what the transform must do, independent of snapshot
    // formatting. This is the predicate that carries the RED signal
    // during TDD: it fails until Task 6 wires the transform into the
    // plugin pipeline.
    const lo = findByName(tree, "LearningObjectives");
    expect(lo).toBeDefined();
    const loNode = lo as MdxJsxFlowElement;
    expect(loNode.children.length).toBe(0);
    const objectivesAttr = loNode.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "objectives"
    );
    expect(objectivesAttr).toBeDefined();
    // The objectives attribute value is an mdxJsxAttributeValueExpression
    // whose .value is a JSON-literal string. Round-trip + content check
    // bonds Layer 1.5 to Layer 1's content contract.
    const expr = (objectivesAttr as { value: { value: string } } | undefined)
      ?.value;
    expect(expr).toBeDefined();
    const parsed = JSON.parse((expr as { value: string }).value) as Array<{
      id: string;
      verb: string;
      body: string;
    }>;
    expect(parsed.map((p) => p.id)).toEqual(["o1", "o2"]);
    expect(parsed.map((p) => p.verb)).toEqual(["State", "Explain"]);

    // Assertion C — preservation. The Aside JSX element must round-trip
    // verbatim (same children references, same name).
    const aside = findByName(tree, "Aside");
    expect(aside).toBeDefined();
    const asideNode = aside as MdxJsxFlowElement;
    expect(asideNode.name).toBe("Aside");
    expect(asideNode.children).toBe(asideChildren);

    // Assertion A (gated) — full-tree snapshot. Only runs when the
    // transform has actually fired (LO children emptied). Gated so the
    // RED phase doesn't write a snapshot of the un-transformed tree
    // (which would commit a wrong baseline if a developer staged the
    // file). The gate opens once Task 6 lands the wiring; from then on,
    // the snapshot pins down every byte of the post-transform shape so
    // any accidental mutation of non-LO nodes shows up as a diff.
    if (loNode.children.length === 0) {
      expect(JSON.stringify(tree, null, 2)).toMatchSnapshot();
    }
  });
});
