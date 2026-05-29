import type { Element, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";
import { speechFromMathml } from "../../math-render/speech-engine.ts";
import { recordMathSurface } from "../../pedagogy-audit/math-speech-coverage.ts";

/**
 * Rehype plugin — stamp SRE ClearSpeak `aria-label`s onto KaTeX-rendered
 * inline and display math, and hide the raw MathML from the accessibility
 * tree.
 *
 * Why this transform exists. `rehype-katex` emits each expression as a
 * `<span class="katex">` containing a `.katex-mathml` (`<math>` for AT)
 * and a `.katex-html` (visual glyphs). Screen readers either read the
 * MathML's element-by-element default ("R superscript 2") or, when MathML
 * support is patchy, nothing useful. SRE's ClearSpeak ruleset produces the
 * learner-oriented phrasing ("R squared"). This plugin bakes that speech
 * into an `aria-label` on the `.katex` container and marks the `.katex-mathml`
 * `aria-hidden` so the label is read once, not alongside the raw MathML.
 * The build-time-over-runtime choice mirrors `katex-display-a11y.ts`:
 * static first-paint output, zero hydration-class regression risk.
 *
 * Composition with `rehypeKatexDisplayA11y` (mdx-config chain:
 * `[rehypeKatex, rehypeKatexSpeech, rehypeKatexDisplayA11y]`). The two
 * plugins touch *different* elements and never collide:
 * - This plugin labels the inner `.katex` container (`role="math"` +
 *   content `aria-label`) and hides its `.katex-mathml` child.
 * - `rehypeKatexDisplayA11y` labels the outer `.katex-display` scroll
 *   region (`role="group"` + generic "Equation, scrollable").
 * Per the plan's resolved-decision #2 the two labels coexist on the
 * wrapper vs. the container respectively (e2e validates no double-speak).
 *
 * Async transformer. `speechFromMathml` is async (SRE setup +
 * MathML→speech), so the transformer collects every `.katex` node
 * synchronously, then resolves speech for all of them via
 * `Promise.all`. unified runs async transformers in this MDX pipeline.
 *
 * Idempotent. A `.katex` node that already carries a non-empty
 * `aria-label` is skipped, so re-runs and dev-mode HMR don't reprocess
 * (and `speechFromMathml`'s own module-level cache makes repeats cheap).
 */
const KATEX_CLASS = "katex";
const KATEX_MATHML_CLASS = "katex-mathml";

function classListIncludes(className: unknown, needle: string): boolean {
  if (Array.isArray(className)) {
    return className.some((c) => c === needle);
  }
  if (typeof className === "string") {
    return className.split(/\s+/).includes(needle);
  }
  return false;
}

function findMathmlChild(node: Element): Element | undefined {
  return node.children.find(
    (child): child is Element =>
      child.type === "element" &&
      classListIncludes(child.properties?.className, KATEX_MATHML_CLASS)
  );
}

function findMathElement(mathml: Element): Element | undefined {
  return mathml.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "math"
  );
}

export function rehypeKatexSpeech() {
  return async (tree: Root): Promise<void> => {
    const targets: Element[] = [];
    visit(tree, "element", (node: Element) => {
      if (!classListIncludes(node.properties?.className, KATEX_CLASS)) return;
      const properties = node.properties ?? {};
      const existing = properties.ariaLabel;
      if (typeof existing === "string" && existing.length > 0) return;
      targets.push(node);
    });

    await Promise.all(
      targets.map(async (node) => {
        const mathml = findMathmlChild(node);
        const math = mathml === undefined ? undefined : findMathElement(mathml);
        const serialized = math === undefined ? "" : toHtml(math);
        const speech =
          serialized === "" ? "" : await speechFromMathml(serialized);

        recordMathSurface({
          kind: "mdx",
          labeled: speech.length > 0,
          detail: speech.length > 0 ? undefined : serialized || "(no mathml)",
        });
        if (mathml === undefined || speech.length === 0) return;

        const properties = node.properties ?? {};
        properties.ariaLabel = speech;
        properties.role = "math";
        node.properties = properties;

        const mathmlProperties = mathml.properties ?? {};
        mathmlProperties.ariaHidden = "true";
        mathml.properties = mathmlProperties;
      })
    );
  };
}
