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

/** A MultiSelect with three choices, TWO of which are correct. */
const sampleMultiSelectTree = (): Root =>
  root([
    el(
      "MultiSelect",
      [a("course", "astr201"), a("unit", "planets"), a("id", "ms1")],
      [
        el(
          "MultiSelect.Prompt",
          [],
          [{ type: "paragraph", children: [text("Which are terrestrial?")] }]
        ),
        el("MultiSelect.Choice", [a("correct")], [text("Mercury")]),
        el("MultiSelect.Choice", [], [text("Jupiter")]),
        el("MultiSelect.Choice", [a("correct")], [text("Mars")]),
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
  it("holds the MCQ + MultiSelect rows (FillBlank + Tabs have their own paths)", () => {
    expect(COMPOUND_ISLANDS.map((r) => r.parent)).toEqual([
      "MCQ",
      "MultiSelect",
    ]);
    expect(COMPOUND_ISLANDS[0]).toMatchObject({
      parent: "MCQ",
      promptName: "MCQ.Prompt",
      choiceName: "MCQ.Choice",
      controllerName: "MCQController",
      controlType: "radio",
      pedagogyRole: "mcq",
      heading: "Multiple choice",
    });
    expect(COMPOUND_ISLANDS[1]).toMatchObject({
      parent: "MultiSelect",
      promptName: "MultiSelect.Prompt",
      choiceName: "MultiSelect.Choice",
      controllerName: "MultiSelectController",
      controlType: "checkbox",
      pedagogyRole: "multi-select",
      heading: "Select all that apply",
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

describe("expandCompoundIslands — MultiSelect expansion", () => {
  it("replaces <MultiSelect> with a <section data-pedagogy-role='multi-select'>", () => {
    const tree = sampleMultiSelectTree();
    expandCompoundIslands(tree);
    expect(findFlow(tree, "MultiSelect")).toBeUndefined();
    const section = findFlow(tree, "section");
    expect(section).toBeDefined();
    expect(attrValue(section as MdxJsxFlowElement, "data-pedagogy-role")).toBe(
      "multi-select"
    );
    expect(
      attrValue(section as MdxJsxFlowElement, "data-formative-anchor")
    ).toBe("ms1");
    expect(attrValue(section as MdxJsxFlowElement, "aria-labelledby")).toBe(
      "ms1-label"
    );
  });

  it("emits the 'Select all that apply' heading", () => {
    const tree = sampleMultiSelectTree();
    expandCompoundIslands(tree);
    const h3 = findFlow(tree, "h3");
    expect(h3).toBeDefined();
    const child = (h3 as MdxJsxFlowElement).children[0] as { value?: string };
    expect(child?.value).toBe("Select all that apply");
  });

  it("emits a plain <fieldset> (NO role=radiogroup) with three checkbox inputs", () => {
    const tree = sampleMultiSelectTree();
    expandCompoundIslands(tree);
    const fieldset = findFlow(tree, "fieldset");
    expect(fieldset).toBeDefined();
    // Checkbox group must NOT be a radiogroup — multi-select is not
    // mutually exclusive; a plain <fieldset> is an implicit group.
    expect(attrValue(fieldset as MdxJsxFlowElement, "role")).toBeUndefined();
    expect(attrValue(fieldset as MdxJsxFlowElement, "aria-labelledby")).toBe(
      "ms1-label"
    );
    const inputs = findAllFlow(fieldset, "input");
    expect(inputs).toHaveLength(3);
    for (const input of inputs) {
      expect(attrValue(input, "type")).toBe("checkbox");
    }
  });

  it("stamps the multiselect-<id> name scheme the controller queries", () => {
    const tree = sampleMultiSelectTree();
    expandCompoundIslands(tree);
    const inputs = findAllFlow(tree, "input");
    for (const input of inputs) {
      expect(attrValue(input, "name")).toBe("multiselect-ms1");
    }
  });

  it("marks EVERY correct choice's input with data-correct (multi-correct)", () => {
    const tree = sampleMultiSelectTree();
    expandCompoundIslands(tree);
    const inputs = findAllFlow(tree, "input");
    const correctInputs = inputs.filter((i) => hasAttr(i, "data-correct"));
    expect(correctInputs.map((i) => attrValue(i, "value"))).toEqual([
      "mercury",
      "mars",
    ]);
  });

  it("emits a childless <MultiSelectController> with client:load + course/unit/id", () => {
    const tree = sampleMultiSelectTree();
    expandCompoundIslands(tree);
    const controller = findFlow(tree, "MultiSelectController");
    expect(controller).toBeDefined();
    const ctrl = controller as MdxJsxFlowElement;
    expect(ctrl.children).toHaveLength(0);
    expect(hasAttr(ctrl, "client:load")).toBe(true);
    expect(attrValue(ctrl, "course")).toBe("astr201");
    expect(attrValue(ctrl, "unit")).toBe("planets");
    expect(attrValue(ctrl, "id")).toBe("ms1");
  });

  it("self-injects MultiSelectController into the @sophie/components import", () => {
    const tree = sampleMultiSelectTree();
    expandCompoundIslands(tree);
    expect(importedNames(tree).has("MultiSelectController")).toBe(true);
  });
});

/**
 * FillBlank uses the slot-based `expandFillBlank` path, not the
 * choice-based `expandIsland`. Slots are authored INLINE inside prose,
 * so the test builds the real shape: a `<FillBlank.Prompt>` whose only
 * child is a `paragraph` containing text + inline `<FillBlank.Slot>`
 * (`mdxJsxTextElement`) markers.
 */
const textEl = (
  name: string,
  attributes: Attr[] = [],
  children: ReadonlyArray<Child> = []
): MdxJsxFlowElement =>
  ({
    type: "mdxJsxTextElement",
    name,
    attributes,
    children,
  }) as unknown as MdxJsxFlowElement;

/** A FillBlank with two inline slots inside a paragraph + a Solution. */
const sampleFillBlankTree = (): Root =>
  root([
    el(
      "FillBlank",
      [a("course", "smoke"), a("unit", "fb-unit"), a("id", "fb1")],
      [
        el(
          "FillBlank.Prompt",
          [],
          [
            {
              type: "paragraph",
              children: [
                text("The H-alpha line has wavelength "),
                textEl("FillBlank.Slot", [
                  a("id", "lambda"),
                  a("correct", "656.3"),
                ]),
                text(" nm and ends at "),
                textEl("FillBlank.Slot", [
                  a("id", "nlower"),
                  a("correct", "2"),
                ]),
              ],
            } as unknown as Child,
          ]
        ),
        el("Solution", [], [text("656.3 nm; n=2")]),
      ]
    ),
  ]);

function findAllText(node: unknown, name: string): MdxJsxFlowElement[] {
  const out: MdxJsxFlowElement[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    const m = n as { type?: string; name?: string; children?: unknown };
    if (m.type === "mdxJsxTextElement" && m.name === name) {
      out.push(m as unknown as MdxJsxFlowElement);
    }
    if (Array.isArray(m.children)) for (const c of m.children) walk(c);
  };
  walk(node);
  return out;
}

describe("expandCompoundIslands — FillBlank expansion", () => {
  it("replaces <FillBlank> with a <section data-pedagogy-role='fill-blank'>", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    expect(findFlow(tree, "FillBlank")).toBeUndefined();
    const section = findFlow(tree, "section");
    expect(section).toBeDefined();
    expect(attrValue(section as MdxJsxFlowElement, "data-pedagogy-role")).toBe(
      "fill-blank"
    );
    expect(
      attrValue(section as MdxJsxFlowElement, "data-formative-anchor")
    ).toBe("fb1");
    expect(attrValue(section as MdxJsxFlowElement, "aria-labelledby")).toBe(
      "fb1-label"
    );
  });

  it("emits the 'Fill in the blank' heading", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    const h3 = findFlow(tree, "h3");
    const child = (h3 as MdxJsxFlowElement).children[0] as { value?: string };
    expect(child?.value).toBe("Fill in the blank");
  });

  it("replaces each inline slot with an inline <input data-fb-slot data-slot-id>", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    // Slots gone; inline inputs present (text elements, not flow).
    expect(findAllText(tree, "FillBlank.Slot")).toHaveLength(0);
    const inputs = findAllText(tree, "input");
    expect(inputs).toHaveLength(2);
    expect(inputs.map((i) => attrValue(i, "data-slot-id"))).toEqual([
      "lambda",
      "nlower",
    ]);
    for (const input of inputs) {
      expect(attrValue(input, "type")).toBe("text");
      expect(hasAttr(input, "data-fb-slot")).toBe(true);
    }
    expect(attrValue(inputs[0] as MdxJsxFlowElement, "aria-label")).toBe(
      "blank lambda"
    );
  });

  it("NEVER emits the `correct` answer into the DOM (no answer leak)", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    const inputs = findAllText(tree, "input");
    for (const input of inputs) {
      expect(hasAttr(input, "correct")).toBe(false);
    }
    // Belt-and-suspenders: the correct values never appear anywhere in
    // the serialized post-transform tree (the Solution still legitimately
    // names them, so we check only the input attributes above — but the
    // input `value` attr must also be absent).
    for (const input of inputs) {
      expect(attrValue(input, "value")).toBeUndefined();
    }
  });

  it("keeps surrounding prose live (text nodes survive the rewrite)", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    const section = findFlow(tree, "section") as MdxJsxFlowElement;
    const serialized = JSON.stringify(section);
    expect(serialized).toContain("The H-alpha line has wavelength");
    expect(serialized).toContain(" nm and ends at ");
  });

  it("emits a childless <FillBlankController> with client:load + course/unit/id", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    const controller = findFlow(tree, "FillBlankController");
    expect(controller).toBeDefined();
    const ctrl = controller as MdxJsxFlowElement;
    expect(ctrl.children).toHaveLength(0);
    expect(hasAttr(ctrl, "client:load")).toBe(true);
    expect(attrValue(ctrl, "course")).toBe("smoke");
    expect(attrValue(ctrl, "unit")).toBe("fb-unit");
    expect(attrValue(ctrl, "id")).toBe("fb1");
  });

  it("self-injects FillBlankController into the @sophie/components import", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    expect(importedNames(tree).has("FillBlankController")).toBe(true);
  });

  it("preserves the <Solution> reveal after the controller", () => {
    const tree = sampleFillBlankTree();
    expandCompoundIslands(tree);
    expect(findFlow(tree, "Solution")).toBeDefined();
  });

  it("a zero-slot prompt is valid — emits prose, no inputs, no throw", () => {
    const tree = root([
      el(
        "FillBlank",
        [a("course", "smoke"), a("unit", "u"), a("id", "fb-no-slots")],
        [
          el(
            "FillBlank.Prompt",
            [],
            [
              {
                type: "paragraph",
                children: [text("A prompt with no inline slots.")],
              } as unknown as Child,
            ]
          ),
        ]
      ),
    ]);
    expandCompoundIslands(tree);
    expect(findFlow(tree, "section")).toBeDefined();
    expect(findAllText(tree, "input")).toHaveLength(0);
  });

  it("throws on a duplicate slot id, naming the parent id", () => {
    const tree = root([
      el(
        "FillBlank",
        [a("id", "fbdup")],
        [
          el(
            "FillBlank.Prompt",
            [],
            [
              {
                type: "paragraph",
                children: [
                  textEl("FillBlank.Slot", [a("id", "x"), a("correct", "a")]),
                  textEl("FillBlank.Slot", [a("id", "x"), a("correct", "b")]),
                ],
              } as unknown as Child,
            ]
          ),
        ]
      ),
    ]);
    expect(() => expandCompoundIslands(tree)).toThrow(/fbdup/);
    expect(() =>
      expandCompoundIslands(
        root([
          el(
            "FillBlank",
            [a("id", "fbdup")],
            [
              el(
                "FillBlank.Prompt",
                [],
                [
                  {
                    type: "paragraph",
                    children: [
                      textEl("FillBlank.Slot", [
                        a("id", "x"),
                        a("correct", "a"),
                      ]),
                      textEl("FillBlank.Slot", [
                        a("id", "x"),
                        a("correct", "b"),
                      ]),
                    ],
                  } as unknown as Child,
                ]
              ),
            ]
          ),
        ])
      )
    ).toThrow(/duplicate slot id/i);
  });
});

/**
 * Tabs uses the `expandTabs` path (chrome — NOT a formative parent). The
 * authored shape is `<Tabs><Tab label="X">body</Tab>…</Tabs>` with no
 * `course`/`unit`/`id` namespace; the transform emits an ARIA-tabs
 * structure (a `<div role="tablist">` of `<button role="tab">`
 * triggers + sibling `<div role="tabpanel">` panels + a
 * `<TabsController>` island) with NO persistence. The bug this test
 * block exists to catch: in the pre-Task-6 Radix-based `<Tabs>`, the
 * React component introspected its children at runtime and rendered an
 * EMPTY `<div role="tablist">` because the Children.toArray walk found
 * no `<Tab>` instances (the same island-children introspection problem
 * the formative parents had). The CRITICAL assertion is that the
 * transformed tree contains exactly N `role="tab"` buttons for an
 * N-child `<Tabs>`.
 */
const sampleTabsTree = (): Root =>
  root([
    el(
      "Tabs",
      [a("id", "tabs-1"), a("defaultLabel", "Beta")],
      [
        el("Tab", [a("label", "Alpha")], [text("Alpha body")]),
        el("Tab", [a("label", "Beta")], [text("Beta body")]),
        el("Tab", [a("label", "Gamma")], [text("Gamma body")]),
      ]
    ),
  ]);

describe("expandCompoundIslands — Tabs expansion", () => {
  it("REGRESSION (latent-bug shield): emits exactly N role='tab' buttons for N <Tab> children", () => {
    // This is the assertion that would have caught the empty-tablist bug
    // in the pre-Task-6 Radix component. Two <Tab> in → two role="tab"
    // out, with the correct labels.
    const tree = root([
      el(
        "Tabs",
        [],
        [
          el("Tab", [a("label", "A")], [text("a")]),
          el("Tab", [a("label", "B")], [text("b")]),
        ]
      ),
    ]);
    expandCompoundIslands(tree);
    // Belt: the transform fully consumed every <Tab> JSX node — if a
    // future change ever lets <Tab> survive expansion it'd ship as the
    // broken React component again, with the old empty-tablist symptom.
    expect(findFlow(tree, "Tab")).toBeUndefined();
    // Suspenders: count the post-transform role="tab" buttons + labels.
    const buttons = findAllFlow(tree, "button").filter(
      (b) => attrValue(b, "role") === "tab"
    );
    expect(buttons).toHaveLength(2);
    const labels = buttons.map((b) => {
      const c = b.children[0] as { value?: string };
      return c?.value;
    });
    expect(labels).toEqual(["A", "B"]);
  });

  it("replaces <Tabs> with a <div data-sophie-tabs data-tabs-id>", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    expect(findFlow(tree, "Tabs")).toBeUndefined();
    expect(findFlow(tree, "Tab")).toBeUndefined();
    // The wrapper is the FIRST div under root (the tablist is a nested
    // div); find by data attribute.
    const all = findAllFlow(tree, "div");
    const wrapper = all.find((d) => hasAttr(d, "data-sophie-tabs"));
    expect(wrapper).toBeDefined();
    expect(attrValue(wrapper as MdxJsxFlowElement, "data-tabs-id")).toBe(
      "tabs-1"
    );
  });

  it("emits a <div role='tablist' aria-label='Tabs'> over the buttons", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    const tablist = findAllFlow(tree, "div").find(
      (d) => attrValue(d, "role") === "tablist"
    );
    expect(tablist).toBeDefined();
    expect(attrValue(tablist as MdxJsxFlowElement, "aria-label")).toBe("Tabs");
    const buttons = (tablist as MdxJsxFlowElement).children.filter(
      (c) =>
        (c as { type?: string }).type === "mdxJsxFlowElement" &&
        (c as { name?: string }).name === "button"
    );
    expect(buttons).toHaveLength(3);
  });

  it("derives distinct tab + panel ids by slugifying each <Tab> label", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    const buttons = findAllFlow(tree, "button").filter(
      (b) => attrValue(b, "role") === "tab"
    );
    expect(buttons.map((b) => attrValue(b, "id"))).toEqual([
      "tabs-1-tab-alpha",
      "tabs-1-tab-beta",
      "tabs-1-tab-gamma",
    ]);
    expect(buttons.map((b) => attrValue(b, "aria-controls"))).toEqual([
      "tabs-1-panel-alpha",
      "tabs-1-panel-beta",
      "tabs-1-panel-gamma",
    ]);
  });

  it("stamps aria-selected/tabindex on the defaultLabel's tab", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    const buttons = findAllFlow(tree, "button").filter(
      (b) => attrValue(b, "role") === "tab"
    );
    // Default is "Beta" (the second tab).
    expect(buttons.map((b) => attrValue(b, "aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(buttons.map((b) => attrValue(b, "tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
    ]);
  });

  it("stamps `hidden` on every panel except the default's", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    const panels = findAllFlow(tree, "div").filter(
      (d) => attrValue(d, "role") === "tabpanel"
    );
    expect(panels).toHaveLength(3);
    // alpha → hidden; beta → not hidden; gamma → hidden.
    expect(hasAttr(panels[0] as MdxJsxFlowElement, "hidden")).toBe(true);
    expect(hasAttr(panels[1] as MdxJsxFlowElement, "hidden")).toBe(false);
    expect(hasAttr(panels[2] as MdxJsxFlowElement, "hidden")).toBe(true);
  });

  it("keeps tab panel bodies LIVE (children survive verbatim, nested islands hydrate)", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    const panels = findAllFlow(tree, "div").filter(
      (d) => attrValue(d, "role") === "tabpanel"
    );
    const bodies = panels.map((p) => JSON.stringify(p.children));
    expect(bodies[0]).toContain("Alpha body");
    expect(bodies[1]).toContain("Beta body");
    expect(bodies[2]).toContain("Gamma body");
  });

  it("defaults to the FIRST tab when defaultLabel is omitted", () => {
    const tree = root([
      el(
        "Tabs",
        [a("id", "t2")],
        [
          el("Tab", [a("label", "One")], [text("1")]),
          el("Tab", [a("label", "Two")], [text("2")]),
        ]
      ),
    ]);
    expandCompoundIslands(tree);
    const buttons = findAllFlow(tree, "button").filter(
      (b) => attrValue(b, "role") === "tab"
    );
    expect(attrValue(buttons[0] as MdxJsxFlowElement, "aria-selected")).toBe(
      "true"
    );
    expect(attrValue(buttons[1] as MdxJsxFlowElement, "aria-selected")).toBe(
      "false"
    );
  });

  it("generates a stable auto-id `sophie-tabs-N` when `id` is omitted", () => {
    const tree = root([
      el("Tabs", [], [el("Tab", [a("label", "A")], [text("a")])]),
      el("Tabs", [], [el("Tab", [a("label", "B")], [text("b")])]),
    ]);
    expandCompoundIslands(tree);
    const wrappers = findAllFlow(tree, "div").filter((d) =>
      hasAttr(d, "data-sophie-tabs")
    );
    expect(wrappers.map((w) => attrValue(w, "data-tabs-id"))).toEqual([
      "sophie-tabs-1",
      "sophie-tabs-2",
    ]);
  });

  it("emits a childless <TabsController> with client:load + id", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    const controller = findFlow(tree, "TabsController");
    expect(controller).toBeDefined();
    const ctrl = controller as MdxJsxFlowElement;
    expect(ctrl.children).toHaveLength(0);
    expect(hasAttr(ctrl, "client:load")).toBe(true);
    expect(attrValue(ctrl, "id")).toBe("tabs-1");
  });

  it("self-injects TabsController into the @sophie/components import", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    expect(importedNames(tree).has("TabsController")).toBe(true);
  });

  it("introduces NO landmark element (R10 — chrome inside <main>)", () => {
    const tree = sampleTabsTree();
    expandCompoundIslands(tree);
    // The wrapper is a <div data-sophie-tabs>, never <section> /
    // <article> / <main>.
    expect(findFlow(tree, "section")).toBeUndefined();
    expect(findFlow(tree, "article")).toBeUndefined();
    expect(findFlow(tree, "main")).toBeUndefined();
  });

  it("throws on a duplicate tab slug, naming the parent id", () => {
    const tree = root([
      el(
        "Tabs",
        [a("id", "dupTabs")],
        [
          el("Tab", [a("label", "Same Name")], [text("a")]),
          el("Tab", [a("label", "same-name")], [text("b")]),
        ]
      ),
    ]);
    expect(() => expandCompoundIslands(tree)).toThrow(/dupTabs/);
    expect(() =>
      expandCompoundIslands(
        root([
          el(
            "Tabs",
            [a("id", "dupTabs")],
            [
              el("Tab", [a("label", "Same Name")], [text("a")]),
              el("Tab", [a("label", "same-name")], [text("b")]),
            ]
          ),
        ])
      )
    ).toThrow(/duplicate tab slug/i);
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
    const result = extractFormative(tree, "atoms", "reading");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      kind: "mcq",
      answer: { type: "single-choice", correct: "n-2-to-n-1" },
    });
    expect(result.findings).toEqual([]);
  });
});
