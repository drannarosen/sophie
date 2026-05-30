import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";

/**
 * Shared hand-built mdast fixtures + assertion walkers for the
 * compound-expand test pair (`compound-expand.test.ts` — choice paths +
 * registry + robustness; `compound-expand.islands.test.ts` — FillBlank +
 * Tabs). Split out per ADR 0061 so neither test file re-declares the
 * builders (R9-test canonical import). The transform consumes the
 * *authored* shape that `remark-math` has already lowered to
 * `inlineMath` nodes; building the tree directly keeps the tests
 * decoupled from `remark-math`'s `$…$` parser.
 */

export type Attr = {
  type: "mdxJsxAttribute";
  name: string;
  value: string | null;
};
export type Child = MdxJsxFlowElement | Record<string, unknown>;

export const a = (name: string, value: string | null = null): Attr => ({
  type: "mdxJsxAttribute",
  name,
  value,
});

export const el = (
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

/**
 * Inline (`mdxJsxTextElement`) JSX builder — the variant a
 * `<FillBlank.Slot>` takes when authored inline inside prose. Mirrors
 * `el` but for phrasing content.
 */
export const textEl = (
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

export const text = (value: string) => ({ type: "text", value });
export const inlineMath = (value: string) => ({ type: "inlineMath", value });

export const root = (children: ReadonlyArray<Child>): Root =>
  ({ type: "root", children }) as unknown as Root;

/** An MCQ with three choices: one text, two math-only (one correct). */
export const sampleMcqTree = (): Root =>
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
export const sampleMultiSelectTree = (): Root =>
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

/**
 * A FillBlank with two inline slots inside a paragraph + a Solution.
 * Slots are authored INLINE inside prose, so the tree builds the real
 * shape: a `<FillBlank.Prompt>` whose only child is a `paragraph`
 * containing text + inline `<FillBlank.Slot>` (`mdxJsxTextElement`)
 * markers.
 */
export const sampleFillBlankTree = (): Root =>
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

export function findFlow(
  node: unknown,
  name: string
): MdxJsxFlowElement | undefined {
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

export function findAllFlow(node: unknown, name: string): MdxJsxFlowElement[] {
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

/** Like `findAllFlow` but matches inline `mdxJsxTextElement` nodes. */
export function findAllText(node: unknown, name: string): MdxJsxFlowElement[] {
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

export function attrValue(
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

export function hasAttr(el: MdxJsxFlowElement, name: string): boolean {
  return el.attributes.some(
    (at) => at.type === "mdxJsxAttribute" && at.name === name
  );
}

/** Names imported from "@sophie/components" across all mdxjsEsm nodes. */
export function importedNames(tree: Root): Set<string> {
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
