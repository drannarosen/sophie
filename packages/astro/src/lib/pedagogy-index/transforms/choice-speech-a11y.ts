import type { Root } from "hast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin — stamp an explicit `aria-label` on math-bearing
 * formative choice `<input>`s so screen readers (and axe's `label` rule)
 * get a correct accessible name.
 *
 * Why this transform exists. `compound-expand.ts` lowers `<MCQ.Choice>` /
 * `<MultiSelect.Choice>` to `<label><input data-choice-input/><span>…choice
 * content…</span></label>`. When the choice content is math, that span
 * holds a `.katex` subtree. Browsers compute the input's accessible name
 * from the wrapping label — including the KaTeX presentation MathML — so
 * real AT names the radio correctly ("n equals 3 …"). But axe-core does
 * NOT implement accessible-name computation for MathML, so it reports the
 * math-only choice radios as nameless (a tooling blind-spot, not a real
 * a11y bug). Baking an explicit `aria-label` — sourced from the speech
 * the sibling `rehypeKatexSpeech` already computed — closes that gap and
 * lets the `label` rule run strict platform-wide (the lone disable in
 * `formative-render.spec.ts`).
 *
 * Mixed-node tree. The label/input/span `compound-expand` emits are MDX
 * JSX nodes (`mdxJsxFlowElement` / `mdxJsxTextElement`) — they survive the
 * rehype phase as JSX and are compiled by recma, NOT converted to hast
 * `element` nodes. Only the `.katex` subtree inside the span is real hast
 * (`rehype-katex` produces it). So this plugin visits every node (not just
 * `element`), reads the marker + writes `aria-label` via the MDX JSX
 * `attributes` array on the input, and reads the speech off the hast
 * `.katex` `properties.ariaLabel`. (Contrast `katex-speech-a11y.ts` /
 * `katex-display-a11y.ts`, which only touch the pure-hast `.katex*`
 * elements and can filter on `"element"`.)
 *
 * Why it does NOT recompute SRE speech. `rehypeKatexSpeech` runs earlier
 * in the same rehype chain and stamps each `.katex` container with its
 * ClearSpeak `aria-label`. This plugin reads those existing labels rather
 * than re-invoking SRE — one speech computation per expression, and the
 * choice's accessible name stays byte-identical to the inline math's.
 *
 * Why an explicit marker. `compound-expand` stamps `data-choice-input` on
 * exactly the choice radios/checkboxes (not FillBlank's `data-fb-slot`
 * text inputs, not any author `<input>`). Selecting on that marker is
 * decoupled from the `name`-prefix scheme and any future control type —
 * the robust identifier, not a brittle name match.
 *
 * Scope: only choices whose content contains math (≥1 `.katex`) get an
 * `aria-label`. Pure-text choices already get a correct accessible name
 * from the wrapping `<label>`, so adding one would be redundant (W2) and
 * risks double-speak.
 *
 * Idempotent. A choice input already carrying a non-empty `aria-label`
 * (MDX attribute) is skipped, so re-runs and dev-mode HMR don't reprocess.
 *
 * Pure tree transform — no filesystem access, no module-scoped caches, no
 * HMR considerations (R8 N/A).
 */
const KATEX_CLASS = "katex";
const CHOICE_MARKER = "data-choice-input";
const ARIA_LABEL = "aria-label";

interface MdxJsxNode {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name?: string | null;
  attributes?: MdxJsxAttribute[];
  children?: unknown[];
}

interface HastElement {
  type: "element";
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
}

function isMdxJsx(node: unknown): node is MdxJsxNode {
  const t = (node as { type?: string }).type;
  return t === "mdxJsxFlowElement" || t === "mdxJsxTextElement";
}

function hasJsxAttr(node: MdxJsxNode, name: string): boolean {
  return (node.attributes ?? []).some(
    (a) => a.type === "mdxJsxAttribute" && a.name === name
  );
}

function readJsxAttr(node: MdxJsxNode, name: string): string | undefined {
  for (const a of node.attributes ?? []) {
    if (a.type === "mdxJsxAttribute" && a.name === name) {
      return typeof a.value === "string" ? a.value : undefined;
    }
  }
  return undefined;
}

function isChoiceInput(node: unknown): node is MdxJsxNode {
  return (
    isMdxJsx(node) && node.name === "input" && hasJsxAttr(node, CHOICE_MARKER)
  );
}

function classListIncludes(className: unknown, needle: string): boolean {
  if (Array.isArray(className)) {
    return className.some((c) => c === needle);
  }
  if (typeof className === "string") {
    return className.split(/\s+/).includes(needle);
  }
  return false;
}

function isKatex(node: unknown): node is HastElement {
  return (
    (node as { type?: string }).type === "element" &&
    classListIncludes((node as HastElement).properties?.className, KATEX_CLASS)
  );
}

/**
 * Accumulate the input's accessible name from its label content, in
 * document order: each text node's text verbatim, each `.katex`
 * container's existing hast `aria-label` (the speech), and `hasMath`
 * flips true on the first `.katex` seen. The choice input itself is
 * skipped. Whitespace is collapsed by the caller.
 */
function collectName(
  nodes: unknown[],
  parts: string[],
  state: { hasMath: boolean }
): void {
  for (const node of nodes) {
    if ((node as { type?: string }).type === "text") {
      parts.push((node as { value: string }).value);
      continue;
    }
    if (isChoiceInput(node)) continue;
    if (isKatex(node)) {
      const label = node.properties?.ariaLabel;
      if (typeof label === "string" && label.length > 0) {
        parts.push(label);
      }
      state.hasMath = true;
      // Don't descend into the `.katex` subtree — its glyph spans would
      // double-count the expression the aria-label already represents.
      continue;
    }
    const children = (node as { children?: unknown[] }).children;
    if (Array.isArray(children)) {
      collectName(children, parts, state);
    }
  }
}

export function rehypeChoiceSpeech() {
  return (tree: Root): void => {
    visit(tree as never, (node: unknown) => {
      if (!isMdxJsx(node) || node.name !== "label") return;

      const children = node.children ?? [];
      const input = children.find(isChoiceInput);
      if (input === undefined) return;

      const existing = readJsxAttr(input, ARIA_LABEL);
      if (existing !== undefined && existing.length > 0) return;

      const parts: string[] = [];
      const state = { hasMath: false };
      collectName(children, parts, state);
      if (!state.hasMath) return;

      const name = parts.join("").replace(/\s+/g, " ").trim();
      if (name.length === 0) return;

      input.attributes = input.attributes ?? [];
      input.attributes.push({
        type: "mdxJsxAttribute",
        name: ARIA_LABEL,
        value: name,
      });
    });
  };
}
