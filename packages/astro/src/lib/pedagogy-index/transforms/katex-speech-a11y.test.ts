// @vitest-environment node
//
// SRE reads its locale JSON from disk via Node `fs` (see
// `speech-engine.test.ts` for the full rationale). The default jsdom
// environment makes SRE take the browser HTTP loader path and return
// empty maps, so this suite — which exercises real `speechFromMathml`
// through the plugin — is pinned to `node` to match the build-time
// runtime where `rehypeKatexSpeech` actually runs.
import type { Element, Root } from "hast";
import rehypeKatex from "rehype-katex";
import { visit } from "unist-util-visit";
import { describe, expect, test } from "vitest";
import { rehypeKatexSpeech } from "./katex-speech-a11y.ts";

/**
 * Build the real `rehype-katex` hast output for a `$…$`/`$$…$$`
 * expression. `rehype-katex` consumes the `math math-inline` /
 * `math math-display` text nodes that `remark-math` → `remark-rehype`
 * emit, so feeding it that shape reproduces the exact hast the plugin
 * sees in production — `.katex` containers wrapping a `.katex-mathml`
 * child whose only element is a real `<math>` subtree. No HTML parser
 * (and so no new dependency) is needed.
 */
async function katexTree(latex: string, displayMode: boolean): Promise<Root> {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "span",
        properties: {
          className: ["math", displayMode ? "math-display" : "math-inline"],
        },
        children: [{ type: "text", value: latex }],
      },
    ],
  };
  // `rehype-katex`'s transformer is typed `(tree, file)`. It only touches
  // `file` to push a `file.message(...)` diagnostic on a KaTeX *render*
  // failure — unreachable for the valid expressions this fixture renders —
  // so a stub bearing only `message` satisfies the call. Cast to the
  // transformer's param type rather than pulling in `vfile` (not a direct
  // dependency of @sophie/astro).
  const fileStub = { message: () => undefined };
  await rehypeKatex()(
    tree,
    fileStub as unknown as Parameters<ReturnType<typeof rehypeKatex>>[1]
  );
  return tree;
}

function findByClass(tree: Root, needle: string): Element | undefined {
  let found: Element | undefined;
  visit(tree, "element", (node: Element) => {
    const className = node.properties?.className;
    if (Array.isArray(className) && className.includes(needle)) {
      found = node;
    }
  });
  return found;
}

describe("rehypeKatexSpeech", () => {
  test("labels a display .katex container with ClearSpeak speech + role=math", async () => {
    const tree = await katexTree("R^2", true);
    await rehypeKatexSpeech()(tree);

    const katex = findByClass(tree, "katex");
    expect(katex).toBeDefined();
    expect(katex?.properties?.role).toBe("math");
    expect(String(katex?.properties?.ariaLabel).toLowerCase()).toContain(
      "squared"
    );
  });

  test("labels an inline .katex container too", async () => {
    const tree = await katexTree("R^2", false);
    await rehypeKatexSpeech()(tree);

    const katex = findByClass(tree, "katex");
    expect(String(katex?.properties?.ariaLabel).toLowerCase()).toContain(
      "squared"
    );
    expect(katex?.properties?.role).toBe("math");
  });

  test("hides the .katex-mathml child from the a11y tree", async () => {
    const tree = await katexTree("R^2", true);
    await rehypeKatexSpeech()(tree);

    const mathml = findByClass(tree, "katex-mathml");
    expect(mathml).toBeDefined();
    expect(mathml?.properties?.ariaHidden).toBe("true");
  });

  test("idempotent: a second pass leaves the labeled node unchanged", async () => {
    const tree = await katexTree("R^2", true);
    await rehypeKatexSpeech()(tree);
    const katex = findByClass(tree, "katex");
    const labelAfterFirst = katex?.properties?.ariaLabel;

    await rehypeKatexSpeech()(tree);
    const katexAfterSecond = findByClass(tree, "katex");
    expect(katexAfterSecond?.properties?.ariaLabel).toBe(labelAfterFirst);
    expect(katexAfterSecond?.properties?.role).toBe("math");
    // The raw MathML stays hidden across re-runs (the skip-guard fires
    // before the mathml child is reached, so it is never un-hidden).
    expect(findByClass(tree, "katex-mathml")?.properties?.ariaHidden).toBe(
      "true"
    );
  });

  test("leaves a .katex node with no .katex-mathml child without an aria-label", async () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["katex"] },
          children: [
            {
              type: "element",
              tagName: "span",
              properties: { className: ["katex-html"] },
              children: [],
            },
          ],
        },
      ],
    };
    await rehypeKatexSpeech()(tree);
    const katex = findByClass(tree, "katex");
    expect(katex?.properties?.ariaLabel).toBeUndefined();
    expect(katex?.properties?.role).toBeUndefined();
  });

  test("leaves the node unchanged when speech resolves empty", async () => {
    // A `.katex-mathml` whose `<math>` has no speakable content: SRE
    // returns "" and the plugin must not stamp an empty aria-label.
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["katex"] },
          children: [
            {
              type: "element",
              tagName: "span",
              properties: { className: ["katex-mathml"] },
              children: [
                {
                  type: "element",
                  tagName: "math",
                  properties: {},
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };
    await rehypeKatexSpeech()(tree);
    const katex = findByClass(tree, "katex");
    expect(katex?.properties?.ariaLabel).toBeUndefined();
  });
});
