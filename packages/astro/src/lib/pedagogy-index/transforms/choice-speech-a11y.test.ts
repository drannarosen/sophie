// @vitest-environment node
//
// This suite exercises the real `rehype-katex` → `rehypeKatexSpeech`
// pipeline so the choice labels carry genuine SRE ClearSpeak
// `aria-label`s before `rehypeChoiceSpeech` reads them. SRE loads its
// locale JSON from disk via Node `fs` (see `speech-engine.test.ts`), so
// the suite is pinned to `node` like `katex-speech-a11y.test.ts`.
import type { Element, Root } from "hast";
import rehypeKatex from "rehype-katex";
import { visit } from "unist-util-visit";
import { describe, expect, test } from "vitest";
import { rehypeChoiceSpeech } from "./choice-speech-a11y.ts";
import { rehypeKatexSpeech } from "./katex-speech-a11y.ts";

/**
 * Build a `.katex` subtree for `latex` by running the real
 * `rehype-katex` over a fresh single-expression tree and lifting the
 * produced `.katex` element. Mirrors `katex-speech-a11y.test.ts`'s
 * fixture builder — no HTML parser dependency required.
 */
async function katexSpan(latex: string): Promise<Element> {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["math", "math-inline"] },
        children: [{ type: "text", value: latex }],
      },
    ],
  };
  const fileStub = { message: () => undefined };
  await rehypeKatex()(
    tree,
    fileStub as unknown as Parameters<ReturnType<typeof rehypeKatex>>[1]
  );
  let katex: Element | undefined;
  visit(tree, "element", (node: Element) => {
    const className = node.properties?.className;
    if (Array.isArray(className) && className.includes("katex")) {
      katex = node;
    }
  });
  if (katex === undefined) {
    throw new Error(`fixture: no .katex element produced for ${latex}`);
  }
  return katex;
}

/**
 * Assemble the EXACT post-compound-expand, post-katex shape for a single
 * choice. `compound-expand` emits the label/input/span as **MDX JSX**
 * nodes (`mdxJsxFlowElement` / `mdxJsxTextElement`), not hast `element`
 * nodes — they're compiled to JSX by recma downstream. The `.katex`
 * subtree inside the span IS hast (rehype-katex produces real hast). The
 * tree the rehype plugin actually sees is therefore mixed-type, which is
 * what this fixture reproduces. `content` are the hast/text children of
 * the choice's `<span>`.
 */
function choiceLabel(content: unknown[]): unknown {
  return {
    type: "mdxJsxFlowElement",
    name: "label",
    attributes: [],
    children: [
      {
        type: "mdxJsxFlowElement",
        name: "input",
        attributes: [
          { type: "mdxJsxAttribute", name: "type", value: "radio" },
          { type: "mdxJsxAttribute", name: "name", value: "mcq-q1" },
          { type: "mdxJsxAttribute", name: "value", value: "choice" },
          { type: "mdxJsxAttribute", name: "data-choice-input", value: null },
        ],
        children: [],
      },
      {
        type: "mdxJsxFlowElement",
        name: "span",
        attributes: [],
        children: content,
      },
    ],
  };
}

function rootOf(...labels: unknown[]): Root {
  return { type: "root", children: labels as Root["children"] };
}

/** Find the MDX-JSX `<input>` node anywhere in the tree. */
function inputOf(tree: Root): { attributes: AttrLike[] } | undefined {
  let found: { attributes: AttrLike[] } | undefined;
  visit(tree as never, (node: unknown) => {
    const n = node as { type?: string; name?: string; attributes?: AttrLike[] };
    if (n.type === "mdxJsxFlowElement" && n.name === "input") {
      found = n as { attributes: AttrLike[] };
    }
  });
  return found;
}

interface AttrLike {
  type: string;
  name: string;
  value: string | null;
}

function ariaLabelOf(
  input: { attributes: AttrLike[] } | undefined
): string | undefined {
  const a = input?.attributes.find(
    (x) => x.type === "mdxJsxAttribute" && x.name === "aria-label"
  );
  return a && typeof a.value === "string" ? a.value : undefined;
}

describe("rehypeChoiceSpeech", () => {
  test("labels a math-only choice input with the math's SRE speech", async () => {
    const katex = await katexSpan("n=3 \\to n=2");
    const tree = rootOf(choiceLabel([katex]));
    await rehypeKatexSpeech()(tree);
    rehypeChoiceSpeech()(tree);

    const label = ariaLabelOf(inputOf(tree));
    expect(label).toBeDefined();
    expect((label ?? "").length).toBeGreaterThan(0);
    // ClearSpeak phrasing for the transition expression.
    expect((label ?? "").toLowerCase()).toContain("equals");
  });

  test("interleaves text and math speech in document order", async () => {
    const katex = await katexSpan("n=3 \\to n=2");
    const tree = rootOf(
      choiceLabel([
        { type: "text", value: "H-alpha (" },
        katex,
        { type: "text", value: ")" },
      ])
    );
    await rehypeKatexSpeech()(tree);
    rehypeChoiceSpeech()(tree);

    const label = ariaLabelOf(inputOf(tree)) ?? "";
    expect(label.startsWith("H-alpha (")).toBe(true);
    expect(label.endsWith(")")).toBe(true);
    expect(label.toLowerCase()).toContain("equals");
  });

  test("does NOT label a pure-text choice (label already names it)", async () => {
    const tree = rootOf(
      choiceLabel([{ type: "text", value: "A line in the spectrum" }])
    );
    await rehypeKatexSpeech()(tree);
    rehypeChoiceSpeech()(tree);

    expect(ariaLabelOf(inputOf(tree))).toBeUndefined();
  });

  test("idempotent: a second pass leaves the labeled input unchanged", async () => {
    const katex = await katexSpan("n=3 \\to n=2");
    const tree = rootOf(choiceLabel([katex]));
    await rehypeKatexSpeech()(tree);
    rehypeChoiceSpeech()(tree);
    const first = ariaLabelOf(inputOf(tree));

    rehypeChoiceSpeech()(tree);
    expect(ariaLabelOf(inputOf(tree))).toBe(first);
    // No duplicate aria-label attribute was appended.
    const count = inputOf(tree)?.attributes.filter(
      (a) => a.name === "aria-label"
    ).length;
    expect(count).toBe(1);
  });

  test("ignores inputs without the data-choice-input marker", async () => {
    const katex = await katexSpan("n=3 \\to n=2");
    const tree = rootOf({
      type: "mdxJsxFlowElement",
      name: "label",
      attributes: [],
      children: [
        {
          type: "mdxJsxTextElement",
          name: "input",
          attributes: [
            { type: "mdxJsxAttribute", name: "type", value: "text" },
            { type: "mdxJsxAttribute", name: "data-fb-slot", value: null },
          ],
          children: [],
        },
        {
          type: "mdxJsxFlowElement",
          name: "span",
          attributes: [],
          children: [katex],
        },
      ],
    });
    await rehypeKatexSpeech()(tree);
    rehypeChoiceSpeech()(tree);

    // The fill-blank slot input is not a choice input → untouched.
    let fbInput: { attributes: AttrLike[] } | undefined;
    visit(tree as never, (node: unknown) => {
      const n = node as {
        type?: string;
        name?: string;
        attributes?: AttrLike[];
      };
      if (n.name === "input") fbInput = n as { attributes: AttrLike[] };
    });
    expect(ariaLabelOf(fbInput)).toBeUndefined();
  });
});
