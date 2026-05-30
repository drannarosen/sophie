import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { describe, expect, it } from "vitest";
import {
  a,
  attrValue,
  type Child,
  el,
  findAllFlow,
  findAllText,
  findFlow,
  hasAttr,
  importedNames,
  root,
  sampleFillBlankTree,
  text,
  textEl,
} from "./compound-expand.test-helpers.ts";
import { expandCompoundIslands } from "./compound-expand.ts";

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
