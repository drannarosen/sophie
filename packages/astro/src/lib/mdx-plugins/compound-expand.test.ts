import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { describe, expect, it } from "vitest";
import { COMPOUND_ISLANDS, expandCompoundIslands } from "./compound-expand.ts";

/**
 * Hand-built mdast (mirrors the formative extractor test convention) —
 * the compound-island transform consumes the *authored* `<MCQ>` shape
 * that `remark-math` has already lowered to `inlineMath` nodes by the
 * time the transform runs (last in the chain). Building the tree
 * directly keeps the test decoupled from `remark-math`'s `$…$` parser.
 */

type Attr = { type: "mdxJsxAttribute"; name: string; value: string | null };
type Child = MdxJsxFlowElement | Record<string, unknown>;

const a = (name: string, value: string | null = null): Attr => ({
  type: "mdxJsxAttribute",
  name,
  value,
});

const el = (
  name: string,
  attributes: Attr[] = [],
  children: ReadonlyArray<Child> = []
): MdxJsxFlowElement =>
  ({
    type: "mdxJsxFlowElement",
    name,
    attributes,
    children,
  }) as unknown as MdxJsxFlowElement;

const text = (value: string) => ({ type: "text", value });
const inlineMath = (value: string) => ({ type: "inlineMath", value });

const root = (children: ReadonlyArray<Child>): Root =>
  ({ type: "root", children }) as unknown as Root;

/** An MCQ with three choices: one text, two math-only (one correct). */
const sampleMcqTree = (): Root =>
  root([
    el(
      "MCQ",
      [a("course", "astr201"), a("unit", "atoms"), a("id", "q1")],
      [
        el(
          "MCQ.Prompt",
          [],
          [{ type: "paragraph", children: [text("Which transition?")] }]
        ),
        el("MCQ.Choice", [], [text("None of these")]),
        el("MCQ.Choice", [a("correct")], [inlineMath("n=2\\to n=1")]),
        el("MCQ.Choice", [], [inlineMath("n=3\\to n=2")]),
      ]
    ),
  ]);

function findFlow(node: unknown, name: string): MdxJsxFlowElement | undefined {
  let found: MdxJsxFlowElement | undefined;
  const walk = (n: unknown): void => {
    if (found || !n || typeof n !== "object") return;
    const m = n as { type?: string; name?: string; children?: unknown };
    if (m.type === "mdxJsxFlowElement" && m.name === name) {
      found = m as unknown as MdxJsxFlowElement;
      return;
    }
    if (Array.isArray(m.children)) for (const c of m.children) walk(c);
  };
  walk(node);
  return found;
}

function findAllFlow(node: unknown, name: string): MdxJsxFlowElement[] {
  const out: MdxJsxFlowElement[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    const m = n as { type?: string; name?: string; children?: unknown };
    if (m.type === "mdxJsxFlowElement" && m.name === name) {
      out.push(m as unknown as MdxJsxFlowElement);
    }
    if (Array.isArray(m.children)) for (const c of m.children) walk(c);
  };
  walk(node);
  return out;
}

function attrValue(
  el: MdxJsxFlowElement,
  name: string
): string | null | undefined {
  for (const at of el.attributes) {
    if (at.type === "mdxJsxAttribute" && at.name === name) {
      return at.value as string | null;
    }
  }
  return undefined;
}

function hasAttr(el: MdxJsxFlowElement, name: string): boolean {
  return el.attributes.some(
    (at) => at.type === "mdxJsxAttribute" && at.name === name
  );
}

/** Names imported from "@sophie/components" across all mdxjsEsm nodes. */
function importedNames(tree: Root): Set<string> {
  const names = new Set<string>();
  for (const child of tree.children) {
    if (child.type !== "mdxjsEsm") continue;
    const program = (
      child as unknown as {
        data?: {
          estree?: {
            body: ReadonlyArray<{
              type: string;
              source?: { value?: unknown };
              specifiers?: ReadonlyArray<{ imported?: { name?: string } }>;
            }>;
          } | null;
        };
      }
    ).data?.estree;
    if (!program) continue;
    for (const stmt of program.body) {
      if (stmt.type !== "ImportDeclaration") continue;
      if (stmt.source?.value !== "@sophie/components") continue;
      for (const spec of stmt.specifiers ?? []) {
        if (typeof spec.imported?.name === "string") {
          names.add(spec.imported.name);
        }
      }
    }
  }
  return names;
}

describe("COMPOUND_ISLANDS registry", () => {
  it("is MCQ-only for Task 2 (no MultiSelect/FillBlank/Tabs rows yet)", () => {
    expect(COMPOUND_ISLANDS.map((r) => r.parent)).toEqual(["MCQ"]);
    expect(COMPOUND_ISLANDS[0]).toMatchObject({
      parent: "MCQ",
      promptName: "MCQ.Prompt",
      choiceName: "MCQ.Choice",
      controllerName: "MCQController",
      controlType: "radio",
    });
  });
});

describe("expandCompoundIslands — MCQ expansion", () => {
  it("replaces <MCQ> with a <section data-pedagogy-role aria-labelledby>", () => {
    const tree = sampleMcqTree();
    expandCompoundIslands(tree);
    expect(findFlow(tree, "MCQ")).toBeUndefined();
    const section = findFlow(tree, "section");
    expect(section).toBeDefined();
    expect(attrValue(section as MdxJsxFlowElement, "data-pedagogy-role")).toBe(
      "mcq"
    );
    expect(
      attrValue(section as MdxJsxFlowElement, "data-formative-anchor")
    ).toBe("q1");
    expect(attrValue(section as MdxJsxFlowElement, "aria-labelledby")).toBe(
      "q1-label"
    );
  });

  it("emits a <fieldset role=radiogroup> with three radio inputs", () => {
    const tree = sampleMcqTree();
    expandCompoundIslands(tree);
    const fieldset = findFlow(tree, "fieldset");
    expect(fieldset).toBeDefined();
    expect(attrValue(fieldset as MdxJsxFlowElement, "role")).toBe("radiogroup");
    const inputs = findAllFlow(fieldset, "input");
    expect(inputs).toHaveLength(3);
    for (const input of inputs) {
      expect(attrValue(input, "type")).toBe("radio");
    }
  });

  it("derives distinct, non-empty slugs incl. the math-only choices", () => {
    const tree = sampleMcqTree();
    expandCompoundIslands(tree);
    const inputs = findAllFlow(tree, "input");
    const values = inputs.map((i) => attrValue(i, "value"));
    expect(values).toEqual(["none-of-these", "n-2-to-n-1", "n-3-to-n-2"]);
    for (const v of values) expect(v).not.toBe("");
  });

  it("marks only the correct choice's input with data-correct", () => {
    const tree = sampleMcqTree();
    expandCompoundIslands(tree);
    const inputs = findAllFlow(tree, "input");
    const correctInputs = inputs.filter((i) => hasAttr(i, "data-correct"));
    expect(correctInputs).toHaveLength(1);
    expect(attrValue(correctInputs[0] as MdxJsxFlowElement, "value")).toBe(
      "n-2-to-n-1"
    );
  });

  it("emits a childless <MCQController> with client:load + course/unit/id", () => {
    const tree = sampleMcqTree();
    expandCompoundIslands(tree);
    const controller = findFlow(tree, "MCQController");
    expect(controller).toBeDefined();
    const ctrl = controller as MdxJsxFlowElement;
    expect(ctrl.children).toHaveLength(0);
    expect(hasAttr(ctrl, "client:load")).toBe(true);
    expect(attrValue(ctrl, "course")).toBe("astr201");
    expect(attrValue(ctrl, "unit")).toBe("atoms");
    expect(attrValue(ctrl, "id")).toBe("q1");
  });

  it("self-injects MCQController into the @sophie/components import", () => {
    const tree = sampleMcqTree();
    expandCompoundIslands(tree);
    expect(importedNames(tree).has("MCQController")).toBe(true);
  });
});

describe("expandCompoundIslands — robustness", () => {
  it("is idempotent: a second run produces a stable tree", () => {
    const tree = sampleMcqTree();
    expandCompoundIslands(tree);
    const once = JSON.stringify(tree);
    expandCompoundIslands(tree);
    expect(JSON.stringify(tree)).toBe(once);
    expect(findAllFlow(tree, "MCQController")).toHaveLength(1);
    expect(
      [...importedNames(tree)].filter((n) => n === "MCQController")
    ).toHaveLength(1);
  });

  it("leaves a tree with no compound nodes untouched", () => {
    const tree = root([{ type: "paragraph", children: [text("just prose")] }]);
    const before = JSON.stringify(tree);
    expandCompoundIslands(tree);
    expect(JSON.stringify(tree)).toBe(before);
  });

  it("throws on a duplicate choice slug, naming the parent id", () => {
    const tree = root([
      el(
        "MCQ",
        [a("id", "dup")],
        [
          el("MCQ.Prompt", [], [text("q")]),
          el("MCQ.Choice", [a("correct")], [text("Same")]),
          el("MCQ.Choice", [], [text("Same")]),
        ]
      ),
    ]);
    expect(() => expandCompoundIslands(tree)).toThrow(/dup/);
    expect(() =>
      expandCompoundIslands(
        root([
          el(
            "MCQ",
            [a("id", "dup")],
            [
              el("MCQ.Prompt", [], [text("q")]),
              el("MCQ.Choice", [a("correct")], [text("Same")]),
              el("MCQ.Choice", [], [text("Same")]),
            ]
          ),
        ])
      )
    ).toThrow(/duplicate choice slug/i);
  });
});

/**
 * Ordering invariant (lighter structural approach, per the task's
 * either/or). Wiring the full Astro remark chain in a unit test is
 * heavy (the pedagogy extractor is filesystem-path-routed and mutates
 * a module-scoped accumulator), so instead we assert the ordering
 * STRUCTURALLY — `mdx-config.ts` lists `sophieCompoundExpandRemarkPlugin`
 * after `pedagogyIndexRemarkPlugin` — AND unit-test that the formative
 * extractor still reads an UN-expanded `<MCQ>` tree (the shape it sees
 * because expansion runs after it). Together these prove "extractor
 * sees authored shape; transform runs after."
 */
describe("ordering invariant — expand runs after the pedagogy extractor", () => {
  it("mdx-config lists sophieCompoundExpandRemarkPlugin after pedagogyIndexRemarkPlugin", () => {
    // Vitest runs with cwd at the package root (`packages/astro`).
    const src = readFileSync(
      resolve(process.cwd(), "src/mdx-config.ts"),
      "utf8"
    );
    const pedaIdx = src.indexOf("pedagogyIndexRemarkPlugin,");
    const expandIdx = src.indexOf("sophieCompoundExpandRemarkPlugin,");
    expect(pedaIdx).toBeGreaterThan(-1);
    expect(expandIdx).toBeGreaterThan(-1);
    expect(expandIdx).toBeGreaterThan(pedaIdx);
  });

  it("the formative extractor reads an un-expanded <MCQ> (authored shape)", async () => {
    const { extractFormative } = await import(
      "../pedagogy-index/extractors/formative.ts"
    );
    // Authored shape — the choice name the extractor reads is MCQ.Choice
    // (member-access child tag, per Task 3).
    const tree = root([
      el(
        "MCQ",
        [a("id", "q1")],
        [
          el(
            "MCQ.Prompt",
            [],
            [{ type: "paragraph", children: [text("Which transition?")] }]
          ),
          el("MCQ.Choice", [], [text("None")]),
          el("MCQ.Choice", [a("correct")], [inlineMath("n=2\\to n=1")]),
          el("MCQ.Choice", [], [inlineMath("n=3\\to n=2")]),
        ]
      ),
    ]) as unknown as Parameters<typeof extractFormative>[0];
    const result = extractFormative(tree, "atoms");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      kind: "mcq",
      answer: { type: "single-choice", correct: "n-2-to-n-1" },
    });
    expect(result.findings).toEqual([]);
  });
});
