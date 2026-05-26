import type { Element, Root } from "hast";
import { describe, expect, test } from "vitest";
import { rehypeKatexDisplayA11y } from "./katex-display-a11y.ts";

/**
 * Synthetic hast trees that mimic `rehype-katex`'s output shape (a
 * top-level element with `className` including "katex-display"
 * wrapping the equation body). The plugin is run once per tree and
 * we inspect the mutated properties directly — no roundtrip through
 * a full unified pipeline since this transform's invariant is
 * local to the visited element.
 */

const root = (children: Element[]): Root => ({ type: "root", children });

const el = (
  tagName: string,
  className: string[] | string | undefined,
  children: Element[] = []
): Element => ({
  type: "element",
  tagName,
  properties: className === undefined ? {} : { className },
  children,
});

describe("rehypeKatexDisplayA11y", () => {
  test("adds tabindex+role+aria-label to a .katex-display span (array className)", () => {
    const tree = root([el("span", ["katex-display"], [el("span", "katex")])]);
    rehypeKatexDisplayA11y()(tree);
    const display = tree.children[0];
    expect(display).toBeDefined();
    expect(display).toMatchObject({
      properties: {
        className: ["katex-display"],
        tabIndex: 0,
        role: "group",
        ariaLabel: "Equation, scrollable",
      },
    });
  });

  test("recognizes string-form className", () => {
    const tree = root([el("div", "katex-display extra-class")]);
    rehypeKatexDisplayA11y()(tree);
    const display = tree.children[0];
    expect(display).toMatchObject({
      properties: {
        tabIndex: 0,
        role: "group",
        ariaLabel: "Equation, scrollable",
      },
    });
  });

  test("does not stamp inline math (.katex without -display)", () => {
    const tree = root([el("span", ["katex"])]);
    rehypeKatexDisplayA11y()(tree);
    const inline = tree.children[0];
    expect(inline?.properties).toEqual({ className: ["katex"] });
  });

  test("does not stamp arbitrary elements", () => {
    const tree = root([el("p", undefined), el("div", ["sophie-content"])]);
    rehypeKatexDisplayA11y()(tree);
    expect(tree.children[0]?.properties).toEqual({});
    expect(tree.children[1]?.properties).toEqual({
      className: ["sophie-content"],
    });
  });

  test("preserves author-supplied tabindex / role / aria-label overrides", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "span",
          properties: {
            className: ["katex-display"],
            tabIndex: -1,
            role: "region",
            ariaLabel: "Custom label",
          },
          children: [],
        },
      ],
    };
    rehypeKatexDisplayA11y()(tree);
    expect(tree.children[0]).toMatchObject({
      properties: {
        tabIndex: -1,
        role: "region",
        ariaLabel: "Custom label",
      },
    });
  });

  test("descends into nested elements", () => {
    const tree = root([
      el("div", ["wrapper"], [el("span", ["katex-display"])]),
    ]);
    rehypeKatexDisplayA11y()(tree);
    const wrapper = tree.children[0];
    const display = wrapper?.children[0] as Element;
    expect(display.properties).toMatchObject({
      tabIndex: 0,
      role: "group",
      ariaLabel: "Equation, scrollable",
    });
  });
});
