import { slugify } from "@sophie/core/schema";
import { toHtml } from "hast-util-to-html";
import { toHast } from "mdast-util-to-hast";
import rehypeKatex from "rehype-katex";

/**
 * Minimal mdxJsxFlowElement shape we read. The unified ecosystem's
 * `mdast-util-mdx-jsx` ships the canonical types, but we only need
 * the attribute-by-name lookup so a narrow shape keeps this module
 * decoupled from the (large) mdx-types surface.
 */
export interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string | null;
  attributes: ReadonlyArray<{
    type: string;
    name: string;
    value: string | boolean | null | { type: string };
  }>;
  children: ReadonlyArray<unknown>;
}

export interface MisconceptionGraphFields {
  prerequisite_misconceptions?: string[];
  related_misconceptions?: string[];
  concept_refs?: string[];
  discipline_scope?: string[];
}

export interface AsideAttributes extends MisconceptionGraphFields {
  kind?: string;
  title?: string;
  id?: string;
  /**
   * Course-level canonical flag for `kind="definition"` (ADR 0086).
   * Boolean-presence prop; mirrors `FigureAttributes.canonical`.
   */
  canonical?: boolean;
  /**
   * `<Aside kind="misconception" name="…">` — the canonical
   * misconception-graph identifier per ADR 0044 (used in
   * `prerequisite_misconceptions` / `related_misconceptions` /
   * `<Intervention addresses="…">` references). The misconception
   * extractor uses `name` as a higher-precedence anchor source than
   * `slug(title)` so `addresses="this"` resolution (Intervention PR-γ)
   * lands on a matching `MisconceptionEntry.anchor`.
   */
  name?: string;
}

export interface FigureAttributes {
  name?: string;
  caption?: string;
  canonical?: boolean;
}

export interface ObjectiveAttributes {
  id?: string;
  verb?: string;
}

export interface CalloutAttributes extends MisconceptionGraphFields {
  variant?: string;
  title?: string;
  id?: string;
}

/**
 * Read a JSX expression-valued attribute as a list of strings.
 *
 * The four ADR-0044 misconception-graph fields are authored as JSX
 * expression attrs:
 *
 *   <Aside kind="misconception" prerequisite_misconceptions={["a", "b"]} ...>
 *
 * mdast surfaces these as `mdxJsxAttributeValueExpression` nodes
 * whose raw source lives on `attr.value.value` (the string between
 * `{` and `}`). We parse that source as JSON after a light
 * normalization (JS single-quoted string literals → JSON double-
 * quoted) so the common authoring shape `["x", "y"]` round-trips.
 * Anything that doesn't parse to an array of non-empty strings is
 * dropped (returns `undefined`); the schema-layer Zod validator is
 * the source of truth for shape enforcement, and undefined values
 * are pre-ADR-0044 schema-compatible.
 *
 * An empty array (`[]`) is preserved — per the schema reference
 * doc, `prerequisite_misconceptions: []` is meaningful (it asserts
 * "this is a root in the DAG").
 */
export function readStringListAttr(
  node: MdxJsxFlowElement,
  name: string
): string[] | undefined {
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name !== name) continue;
    const value = attr.value;
    if (!value || typeof value !== "object") continue;
    const v = value as { type?: string; value?: unknown };
    if (v.type !== "mdxJsxAttributeValueExpression") continue;
    if (typeof v.value !== "string") continue;
    // Normalize single-quoted string literals to JSON double-quoted form.
    // Authors commonly write `={['a', 'b']}`; JSON requires double quotes.
    // This is a deliberate one-shot normalization for the array-of-string
    // shape; arbitrary JS expressions are not supported.
    const normalized = v.value
      .trim()
      .replace(
        /'([^'\\]*)'/g,
        (_, inner) => `"${String(inner).replace(/"/g, '\\"')}"`
      );
    let parsed: unknown;
    try {
      parsed = JSON.parse(normalized);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") return undefined;
      const trimmed = item.trim();
      if (trimmed.length === 0) return undefined;
      out.push(trimmed);
    }
    return out;
  }
  return undefined;
}

export function readMisconceptionGraphFields(
  node: MdxJsxFlowElement
): MisconceptionGraphFields {
  const out: MisconceptionGraphFields = {};
  const prereqs = readStringListAttr(node, "prerequisite_misconceptions");
  if (prereqs !== undefined) out.prerequisite_misconceptions = prereqs;
  const related = readStringListAttr(node, "related_misconceptions");
  if (related !== undefined) out.related_misconceptions = related;
  const concepts = readStringListAttr(node, "concept_refs");
  if (concepts !== undefined) out.concept_refs = concepts;
  const disciplines = readStringListAttr(node, "discipline_scope");
  if (disciplines !== undefined) out.discipline_scope = disciplines;
  return out;
}

export function readAsideAttributes(node: MdxJsxFlowElement): AsideAttributes {
  const out: AsideAttributes = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    // `canonical` is a boolean-presence prop (`<Aside ... canonical />`,
    // mdast `value: null`), so it must be read BEFORE the string guard
    // below. Mirrors `readFigureAttributes` (ADR 0086 / F3).
    if (attr.name === "canonical") {
      out.canonical = attr.value === null || attr.value === true;
      continue;
    }
    if (typeof attr.value !== "string") continue;
    if (attr.name === "kind") out.kind = attr.value;
    if (attr.name === "title") out.title = attr.value;
    if (attr.name === "id") out.id = attr.value;
    if (attr.name === "name") out.name = attr.value;
  }
  Object.assign(out, readMisconceptionGraphFields(node));
  return out;
}

export function readFigureAttributes(
  node: MdxJsxFlowElement
): FigureAttributes {
  const out: FigureAttributes = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name === "name" && typeof attr.value === "string") {
      out.name = attr.value;
    }
    if (attr.name === "caption" && typeof attr.value === "string") {
      out.caption = attr.value;
    }
    // `canonical` is a boolean-presence JSX prop: `<Figure name="X" canonical />`
    // surfaces in the mdast as `value: null` (no `=`), while
    // `canonical={true}` may surface as either `true` or an expression node.
    // We accept both shapes; anything else (including an explicit `false`
    // string or expression) leaves `canonical` undefined.
    if (attr.name === "canonical") {
      out.canonical = attr.value === null || attr.value === true;
    }
  }
  return out;
}

export function readObjectiveAttributes(
  node: MdxJsxFlowElement
): ObjectiveAttributes {
  const out: ObjectiveAttributes = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (typeof attr.value !== "string") continue;
    if (attr.name === "id") out.id = attr.value;
    if (attr.name === "verb") out.verb = attr.value;
  }
  return out;
}

/**
 * Read a single string-valued attribute by name. Returns the trimmed
 * value, or undefined when the attribute is absent / non-string / empty.
 * Used by `extractInlineRefUsages` to read the lookup prop on each of
 * the four inline-ref components.
 */
export function readStringAttr(
  node: {
    attributes?: ReadonlyArray<{ type: string; name: string; value: unknown }>;
  },
  name: string
): string | undefined {
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name !== name) continue;
    if (typeof attr.value !== "string") continue;
    const trimmed = attr.value.trim();
    if (trimmed.length === 0) return undefined;
    return trimmed;
  }
  return undefined;
}

export function readCalloutAttributes(
  node: MdxJsxFlowElement
): CalloutAttributes {
  const out: CalloutAttributes = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (typeof attr.value !== "string") continue;
    if (attr.name === "variant") out.variant = attr.value;
    if (attr.name === "title") out.title = attr.value;
    if (attr.name === "id") out.id = attr.value;
  }
  Object.assign(out, readMisconceptionGraphFields(node));
  return out;
}

export function renderChildrenToHtml(children: ReadonlyArray<unknown>): string {
  // Wrap in a synthetic root so mdast-util-to-hast can process the
  // body as a top-level subtree. Returns the empty string when no
  // children (definitions are allowed to be header-only).
  //
  // Per 2026-05-19 architecture audit P2 #8: throw when toHast bails
  // on a non-empty subtree. The previous silent-fallback `return ""`
  // co-mingled "subtree malformed" with "author intentionally left
  // body empty" — both produced the same dev warning from the
  // pedagogy extractors (D3 / M3 / K3). Throwing makes the empty-body
  // warning load-bearing: empty body in the index = author intent;
  // hast-conversion failure = surface to the build immediately.
  if (children.length === 0) return "";
  const synthetic = {
    type: "root" as const,
    children: children as never,
  };
  const hast = toHast(synthetic);
  if (!hast) {
    throw new Error(
      `renderChildrenToHtml: mdast-util-to-hast returned null for a ${children.length}-child subtree. This indicates a malformed mdast subtree the extractor pipeline cannot serialize. (Audit P2 #8.)`
    );
  }
  // Run rehype-katex over the extracted subtree before serialization.
  // The pedagogy index plugin runs in the remark chain between
  // remark-math (which produces `inlineMath`/`math` nodes → hast
  // `<code class="language-math">`) and the main rehype-katex pass.
  // Subtrees harvested for OMIFlow slots, Aside/Callout bodies, and
  // ChapterGlossary aggregation never reach the main rehype pipeline,
  // so without this hop math round-trips as raw `\frac{...}` text in
  // every downstream consumer.
  (rehypeKatex() as (tree: typeof hast) => void)(hast);
  return toHtml(hast);
}

/**
 * Concatenate the plain-text content of an mdast subtree (the
 * `<X.Prompt>` body for the formative extractor, ADR 0073 A1). Walks
 * `text` + `inlineCode` descendants — the two leaf node types that
 * carry author-visible characters — and joins their `.value`, then
 * trims. Math, JSX, and other structural nodes contribute nothing
 * (the index stores a searchable text summary, not rendered HTML, per
 * ADR 0038's "data, not HTML" principle).
 */
export function extractPlainText(node: unknown): string {
  const parts: string[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    const m = n as { type?: string; value?: unknown; children?: unknown };
    if (
      (m.type === "text" || m.type === "inlineCode") &&
      typeof m.value === "string"
    ) {
      parts.push(m.value);
    }
    if (Array.isArray(m.children)) {
      for (const child of m.children) walk(child);
    }
  };
  walk(node);
  return parts.join("").trim();
}

/**
 * Like `extractPlainText`, but ALSO concatenates the LaTeX `.value` of
 * `math` (display) and `inlineMath` nodes. Used for slug derivation,
 * where a math-only choice (`$n=2\to n=1$`) must produce a non-empty,
 * distinct slug — `extractPlainText` is deliberately math-blind (it
 * builds the index's searchable prompt summary per ADR 0038, where raw
 * LaTeX is noise), so a separate walker is the correct shape here.
 *
 * Walks the four author-character-bearing leaf types: `text`,
 * `inlineCode`, `math`, `inlineMath`. Other structural nodes
 * contribute nothing.
 */
export function extractSlugText(node: unknown): string {
  const parts: string[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    const m = n as { type?: string; value?: unknown; children?: unknown };
    if (
      (m.type === "text" ||
        m.type === "inlineCode" ||
        m.type === "math" ||
        m.type === "inlineMath") &&
      typeof m.value === "string"
    ) {
      parts.push(m.value);
    }
    if (Array.isArray(m.children)) {
      for (const child of m.children) walk(child);
    }
  };
  walk(node);
  return parts.join("").trim();
}

/**
 * Slug for a choice element (MCQ / MultiSelect): an explicit `id` attr
 * wins; otherwise the slug of the choice's math-aware text. Shared by
 * the formative extractor (`collectChoices`) and the compound-island
 * transform (`compound-expand.ts`) so both derive identical slugs —
 * the extractor's index anchor and the transform's `<input value>` /
 * `data-correct` attribution must agree. Math-only choices slug via
 * `extractSlugText` (not `extractPlainText`, which would return `""`
 * and collide).
 */
export function choiceSlug(node: {
  attributes?: ReadonlyArray<{ type: string; name?: string; value?: unknown }>;
}): string {
  const explicit = readStringAttr(
    node as {
      attributes?: ReadonlyArray<{
        type: string;
        name: string;
        value: unknown;
      }>;
    },
    "id"
  );
  return explicit ?? slugify(extractSlugText(node));
}

/**
 * Recursively collect every `<FillBlank.Slot>` node within a
 * `<FillBlank.Prompt>` subtree, in document order.
 *
 * Slots are authored INLINE inside prose, so MDX nests them as
 * `mdxJsxTextElement` (phrasing content) under a `paragraph` child of
 * the prompt — they are grandchildren of the prompt, not direct
 * children, and they are text nodes, not flow nodes. A direct-children
 * scan (the pre-recursion shape) silently missed them, mis-firing AS-3
 * on real authored fills. This walker descends the whole subtree and
 * matches `FillBlank.Slot` regardless of flow-vs-text node type.
 *
 * Shared by the formative extractor (`materializeAnswer`'s FillBlank
 * case) and the compound-island transform (`expandFillBlank`) so both
 * derive the SAME slot list from the SAME authored shape (R9). Returns
 * the raw nodes; callers read `id` / `correct` via `readStringAttr`.
 */
export function findFillBlankSlots(promptNode: unknown): MdxJsxFlowElement[] {
  const out: MdxJsxFlowElement[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    const m = n as { type?: string; name?: string; children?: unknown };
    if (
      (m.type === "mdxJsxFlowElement" || m.type === "mdxJsxTextElement") &&
      m.name === "FillBlank.Slot"
    ) {
      out.push(m as unknown as MdxJsxFlowElement);
      // A slot is a leaf marker (`<FillBlank.Slot id correct />`); no
      // need to descend into it.
      return;
    }
    if (Array.isArray(m.children)) {
      for (const child of m.children) walk(child);
    }
  };
  walk(promptNode);
  return out;
}

export function isWhitespaceTextNode(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { type?: string; value?: string };
  return n.type === "text" && (n.value ?? "").trim() === "";
}
