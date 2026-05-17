import {
  type AuditFinding,
  type ChapterEntry,
  type ContractValidationEntry,
  type DefinitionEntry,
  type EquationEntry,
  type FigureRegistryEntry,
  type FigureUsageEntry,
  type InlineRefKind,
  type InlineRefUsageEntry,
  type KeyInsightEntry,
  type MisconceptionEntry,
  type ModuleEntry,
  type MultiRepIndexEntry,
  type ObjectiveEntry,
  type PedagogyIndex,
  type SerializedRep,
  slugify,
} from "@sophie/core/schema";
import { valueToEstree } from "estree-util-value-to-estree";
import { toHtml } from "hast-util-to-html";
import type { Root } from "mdast";
import { toHast } from "mdast-util-to-hast";
import { visit } from "unist-util-visit";

/**
 * Pedagogy index extractor — the load-bearing primitive declared
 * by ADR 0038. PR-C1 implements the `definition` role; other roles
 * (equation, key-insight, figure, misconception) are extracted by
 * PRs C2–C3 using the same pattern.
 *
 * Two layers:
 *
 *   - `extractDefinitions(tree, chapterSlug)` is the **pure
 *     function** that walks one chapter's mdast tree and returns
 *     its `DefinitionEntry[]`. Throws on intra-chapter slug
 *     collisions or missing required titles. Tested with synthetic
 *     ASTs (no MDX parsing in the test loop).
 *
 *   - `indexAccumulator` is the **cross-chapter state**. The
 *     remark plugin (`pedagogyIndexExtractor`, exported below)
 *     calls `clearChapter` then `addDefinitions` for each chapter
 *     it parses. `addDefinitions` throws on cross-chapter slug
 *     collisions (audit invariant #1 — duplicate term across
 *     chapters).
 */

/**
 * Minimal mdxJsxFlowElement shape we read. The unified ecosystem's
 * `mdast-util-mdx-jsx` ships the canonical types, but we only need
 * the attribute-by-name lookup so a narrow shape keeps this module
 * decoupled from the (large) mdx-types surface.
 */
interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string | null;
  attributes: ReadonlyArray<{
    type: string;
    name: string;
    value: string | boolean | null | { type: string };
  }>;
  children: ReadonlyArray<unknown>;
}

interface MisconceptionGraphFields {
  prerequisite_misconceptions?: string[];
  related_misconceptions?: string[];
  concept_refs?: string[];
  discipline_scope?: string[];
}

interface AsideAttributes extends MisconceptionGraphFields {
  kind?: string;
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
function readStringListAttr(
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

function readMisconceptionGraphFields(
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

function readAsideAttributes(node: MdxJsxFlowElement): AsideAttributes {
  const out: AsideAttributes = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (typeof attr.value !== "string") continue;
    if (attr.name === "kind") out.kind = attr.value;
    if (attr.name === "title") out.title = attr.value;
    if (attr.name === "id") out.id = attr.value;
  }
  Object.assign(out, readMisconceptionGraphFields(node));
  return out;
}

interface KeyEquationAttributes {
  id?: string;
  title?: string;
}

function readKeyEquationAttributes(
  node: MdxJsxFlowElement
): KeyEquationAttributes {
  const out: KeyEquationAttributes = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (typeof attr.value !== "string") continue;
    if (attr.name === "id") out.id = attr.value;
    if (attr.name === "title") out.title = attr.value;
  }
  return out;
}

interface FigureAttributes {
  name?: string;
  caption?: string;
  canonical?: boolean;
}

function readFigureAttributes(node: MdxJsxFlowElement): FigureAttributes {
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

interface ObjectiveAttributes {
  id?: string;
  verb?: string;
}

function readObjectiveAttributes(node: MdxJsxFlowElement): ObjectiveAttributes {
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
function readStringAttr(
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

interface CalloutAttributes extends MisconceptionGraphFields {
  variant?: string;
  title?: string;
  id?: string;
}

function readCalloutAttributes(node: MdxJsxFlowElement): CalloutAttributes {
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

function renderChildrenToHtml(children: ReadonlyArray<unknown>): string {
  // Wrap in a synthetic root so mdast-util-to-hast can process the
  // body as a top-level subtree. Returns the empty string when no
  // children (definitions are allowed to be header-only).
  if (children.length === 0) return "";
  const synthetic = {
    type: "root" as const,
    children: children as never,
  };
  const hast = toHast(synthetic);
  if (!hast) return "";
  return toHtml(hast);
}

/**
 * Pure extractor. Walks an mdast tree, finds JSX elements named
 * "Aside" with `kind="definition"`, returns one DefinitionEntry
 * per match. Throws when:
 *
 *   - A definition aside is missing a non-empty `title` (the Aside
 *     Zod refinement already catches this at the schema layer; this
 *     is a defense-in-depth check inside the extractor).
 *   - Two definitions in the same chapter slug to the same anchor
 *     (audit invariant #2 — intra-chapter slug collision).
 */
export function extractDefinitions(
  tree: Root,
  chapterSlug: string
): DefinitionEntry[] {
  const out: DefinitionEntry[] = [];
  const seenSlugs = new Set<string>();

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "Aside") return;
    const attrs = readAsideAttributes(el);
    if (attrs.kind !== "definition") return;

    const title = attrs.title?.trim();
    if (!title) {
      throw new Error(
        `<Aside kind="definition"> in chapter "${chapterSlug}" is missing a non-empty title.`
      );
    }

    const slug = attrs.id ? slugify(attrs.id) : slugify(title);

    if (seenSlugs.has(slug)) {
      throw new Error(
        `Intra-chapter slug collision in chapter "${chapterSlug}": slug "${slug}" is generated by more than one <Aside kind="definition">. Resolution: add an explicit \`id\` prop to disambiguate.`
      );
    }
    seenSlugs.add(slug);

    out.push({
      term: title,
      slug,
      body: renderChildrenToHtml(el.children),
      chapter: chapterSlug,
      anchor: slug,
    });
  });

  return out;
}

/**
 * Extract the raw TeX source of the FIRST `$$...$$` math block in a
 * KeyEquation's children. Walks the children subtree via
 * `unist-util-visit` and returns the `value` of the first `math` node
 * (display math; the mdast node type produced by `remark-math` for
 * `$$...$$` blocks). Returns `null` when no math node exists —
 * callers treat this as the E6 categorization error.
 *
 * `inlineMath` (the `$x$` AST node type) is deliberately ignored:
 * only display math counts as the canonical-form equation tex.
 */
function extractFirstTex(children: ReadonlyArray<unknown>): string | null {
  let found: string | null = null;
  const synthetic = { type: "root" as const, children: children as never };
  visit(synthetic, "math", (node: { value?: string }) => {
    if (found !== null) return false;
    if (typeof node.value === "string" && node.value.trim().length > 0) {
      found = node.value;
      return false;
    }
    return undefined;
  });
  return found;
}

/**
 * Pure extractor. Walks an mdast tree, finds JSX elements named
 * "KeyEquation", returns one EquationEntry per match with
 * extractor-assigned `number` (per-chapter sequential, starting at
 * 1, in source order). Throws when:
 *
 *   - A KeyEquation is missing a non-empty `id` or `title` (the
 *     KeyEquation Zod props schema already catches this at the
 *     component layer; this is defense in depth inside the
 *     extractor — mirrors `extractDefinitions`'s explicit guard).
 *   - A KeyEquation contains zero `$$` math blocks (E6
 *     categorization error: should be a Callout, not a KeyEquation).
 *   - Two KeyEquations in the same chapter slug to the same anchor
 *     (intra-chapter slug collision; matches definitions' pattern).
 */
export function extractEquations(
  tree: Root,
  chapterSlug: string
): EquationEntry[] {
  const out: EquationEntry[] = [];
  const seenSlugs = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "KeyEquation") return;
    const attrs = readKeyEquationAttributes(el);

    const id = attrs.id?.trim();
    const title = attrs.title?.trim();
    if (!id) {
      throw new Error(
        `<KeyEquation> in chapter "${chapterSlug}" is missing a non-empty \`id\`.`
      );
    }
    if (!title) {
      throw new Error(
        `<KeyEquation id="${id}"> in chapter "${chapterSlug}" is missing a non-empty \`title\`.`
      );
    }

    const slug = slugify(id);
    if (seenSlugs.has(slug)) {
      throw new Error(
        `Intra-chapter slug collision in chapter "${chapterSlug}": slug "${slug}" is generated by more than one <KeyEquation>. Resolution: change one of the \`id\` props.`
      );
    }
    seenSlugs.add(slug);

    const tex = extractFirstTex(el.children);
    if (tex === null) {
      throw new Error(
        `<KeyEquation id="${id}"> in chapter "${chapterSlug}" contains no \`$$...$$\` math block. Categorization error: KeyEquation must lead with the canonical equation. Resolution: add a \`$$...$$\` block as the first math content, or convert to a <Callout>.`
      );
    }

    counter += 1;
    out.push({
      slug,
      title,
      number: counter,
      tex,
      body: renderChildrenToHtml(el.children),
      chapter: chapterSlug,
      anchor: slug,
    });
  });

  return out;
}

/**
 * Pure extractor. Walks an mdast tree, finds JSX elements named
 * "Aside" with `kind="key-insight"`, returns one KeyInsightEntry per
 * match. Per PR-C3 decisions row 7, the `title` prop is OPTIONAL on
 * key-insight asides; the anchor is derived from `id` > slug(title) >
 * `ki-${counter}` (counter is per-chapter sequential). The short
 * `ki-` prefix is the canonical auto-anchor shape; see the anchor
 * prefix table in `@sophie/core/schema/pedagogy-index.ts`.
 *
 * Throws on intra-chapter anchor collisions (defense-in-depth K1).
 * Warns (non-production) on empty body (defense-in-depth K2).
 */
export function extractKeyInsights(
  tree: Root,
  chapterSlug: string
): KeyInsightEntry[] {
  const out: KeyInsightEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "Aside") return;
    const attrs = readAsideAttributes(el);
    if (attrs.kind !== "key-insight") return;

    counter += 1;
    const titleSlug = attrs.title?.trim() ? slugify(attrs.title.trim()) : null;
    const explicitId = attrs.id?.trim() ? slugify(attrs.id.trim()) : null;
    const anchor = explicitId ?? titleSlug ?? `ki-${counter}`;

    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${chapterSlug}": key-insight anchor "${anchor}" is generated by more than one <Aside kind="key-insight">. Resolution: add an explicit \`id\` prop to disambiguate.`
      );
    }
    seenAnchors.add(anchor);

    const body = renderChildrenToHtml(el.children);
    if (body.trim().length === 0) {
      if (
        typeof process === "undefined" ||
        process.env?.NODE_ENV !== "production"
      ) {
        console.warn(
          `[pedagogy-index] <Aside kind="key-insight"> in chapter "${chapterSlug}" anchor "${anchor}" has empty body.`
        );
      }
    }

    out.push({
      title: attrs.title?.trim() || undefined,
      body,
      chapter: chapterSlug,
      anchor,
    });
  });

  return out;
}

/**
 * Pure extractor. Walks an mdast tree, finds JSX elements named
 * "Figure" with a `name` prop (registry-mode usages), returns one
 * FigureUsageEntry per match. Inline-mode `<Figure src="...">` (no
 * `name`) is skipped — those figures are one-off illustrations that
 * don't enter the registry. Per PR-C3 decisions row 3 (two-tier
 * model: registry + per-chapter usages) and row 6 (per-usage
 * sequential numbering, canonical flag from JSX prop).
 *
 * Each entry gets:
 *   - `number`: per-chapter sequential, starting at 1, source order
 *   - `anchor`: `fig-${slugify(name)}-${counter}` (counter-suffixed so
 *     repeated uses of the same registry name in one chapter get
 *     unique anchors; F5 invariant defense-in-depth, see below)
 *   - `canonical`: true when the author opts in via the boolean-
 *     presence `canonical` JSX prop; false by default
 *   - `captionOverride`: trimmed `caption` JSX prop value if present
 *
 * Throws on intra-chapter anchor collision (F5). The counter-suffixed
 * anchor shape makes collisions unreachable from the auto-anchor path
 * (each iteration increments the counter), but the guard exists for
 * defense-in-depth: a future schema extension allowing explicit
 * anchor overrides would route through the same code path.
 *
 * Cross-chapter F3 (multiple canonical for the same name) is the
 * accumulator's job; see `addFigureUsages`.
 */
export function extractFigures(
  tree: Root,
  chapterSlug: string
): FigureUsageEntry[] {
  const out: FigureUsageEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "Figure") return;
    const attrs = readFigureAttributes(el);
    const name = attrs.name?.trim();
    if (!name) return; // inline-mode `<Figure src="...">` doesn't index

    counter += 1;
    const anchor = `fig-${slugify(name)}-${counter}`;

    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${chapterSlug}": figure anchor "${anchor}" is generated by more than one <Figure name="${name}">. (F5 invariant.)`
      );
    }
    seenAnchors.add(anchor);

    out.push({
      name,
      chapter: chapterSlug,
      anchor,
      number: counter,
      canonical: attrs.canonical === true,
      captionOverride: attrs.caption?.trim() || undefined,
    });
  });

  return out;
}

/**
 * Pure extractor. Walks an mdast tree, finds misconception entries
 * from BOTH source primitives in a single pass:
 *
 *   - `<Aside kind="misconception">` → `length: "short"` (compact,
 *     marginal-style misconception correction)
 *   - `<Callout variant="misconception">` → `length: "long"` (full-
 *     width block-style misconception correction)
 *
 * Per PR-C3 decisions row 8: a single extractor walks both source
 * components so the misconceptions index is fully aggregated under
 * one pedagogy role (ADR 0038's role-aggregation principle); the
 * length discriminator preserves the source-component visual
 * treatment downstream (decisions row 12).
 *
 * Anchor derivation matches `extractKeyInsights`: explicit `id` >
 * slug(title) > `misc-${counter}` (counter is per-chapter
 * sequential, incremented once per matched element across BOTH
 * source primitives in source order). The short `misc-` prefix is
 * the canonical auto-anchor shape; see the anchor prefix table in
 * `@sophie/core/schema/pedagogy-index.ts`.
 *
 * Throws on intra-chapter anchor collisions (M1 invariant).
 * Warns (non-production) on empty body (M3 invariant — soft check).
 */
export function extractMisconceptions(
  tree: Root,
  chapterSlug: string
): MisconceptionEntry[] {
  const out: MisconceptionEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    let length: "short" | "long";
    let attrs: { title?: string; id?: string } & MisconceptionGraphFields;

    if (el.name === "Aside") {
      const a = readAsideAttributes(el);
      if (a.kind !== "misconception") return;
      length = "short";
      attrs = {
        title: a.title,
        id: a.id,
        prerequisite_misconceptions: a.prerequisite_misconceptions,
        related_misconceptions: a.related_misconceptions,
        concept_refs: a.concept_refs,
        discipline_scope: a.discipline_scope,
      };
    } else if (el.name === "Callout") {
      const c = readCalloutAttributes(el);
      if (c.variant !== "misconception") return;
      length = "long";
      attrs = {
        title: c.title,
        id: c.id,
        prerequisite_misconceptions: c.prerequisite_misconceptions,
        related_misconceptions: c.related_misconceptions,
        concept_refs: c.concept_refs,
        discipline_scope: c.discipline_scope,
      };
    } else {
      return;
    }

    counter += 1;
    const titleSlug = attrs.title?.trim() ? slugify(attrs.title.trim()) : null;
    const explicitId = attrs.id?.trim() ? slugify(attrs.id.trim()) : null;
    const anchor = explicitId ?? titleSlug ?? `misc-${counter}`;

    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${chapterSlug}": misconception anchor "${anchor}" generated by more than one source. (M1 invariant.)`
      );
    }
    seenAnchors.add(anchor);

    const body = renderChildrenToHtml(el.children);
    if (body.trim().length === 0) {
      if (
        typeof process === "undefined" ||
        process.env?.NODE_ENV !== "production"
      ) {
        console.warn(
          `[pedagogy-index] misconception in chapter "${chapterSlug}" anchor "${anchor}" has empty body. (M3 warning.)`
        );
      }
    }

    const entry: MisconceptionEntry = {
      body,
      chapter: chapterSlug,
      anchor,
      length,
      label: attrs.title?.trim() || undefined,
    };
    // Graph fields (ADR 0044). Omit when undefined to keep the
    // pre-ADR-0044 shape on misconceptions that don't declare any
    // relationships. Empty arrays are preserved (meaningful per the
    // schema reference doc).
    if (attrs.prerequisite_misconceptions !== undefined) {
      entry.prerequisite_misconceptions = attrs.prerequisite_misconceptions;
    }
    if (attrs.related_misconceptions !== undefined) {
      entry.related_misconceptions = attrs.related_misconceptions;
    }
    if (attrs.concept_refs !== undefined) {
      entry.concept_refs = attrs.concept_refs;
    }
    if (attrs.discipline_scope !== undefined) {
      entry.discipline_scope = attrs.discipline_scope;
    }
    out.push(entry);
  });

  return out;
}

/**
 * Pure extractor. Walks an mdast tree for `<LearningObjectives>` flow
 * elements; for each, walks its direct children for `<Objective>` flow
 * elements. Returns one `ObjectiveEntry` per `<Objective>` match.
 *
 * Anchor convention: `lo-${id}` (passthrough). The `id` prop is
 * author-supplied and persists across edits — never auto-generated.
 *
 * Throws when:
 *   - An `<Objective>` is missing a non-empty `id` prop.
 *   - An `<Objective>` is missing a non-empty `verb` prop.
 *   - An `<Objective>` body renders to an empty / whitespace-only HTML
 *     string.
 *   - Two `<Objective>`s within the same chapter share an `id` (O1
 *     invariant — duplicate-id-within-chapter).
 *
 * Bare `<Objective>` elements outside a `<LearningObjectives>` parent
 * are ignored (not authoring-sanctioned shape).
 */
export function extractObjectives(
  tree: Root,
  chapterSlug: string
): ObjectiveEntry[] {
  const out: ObjectiveEntry[] = [];
  const seenIds = new Set<string>();

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const parent = node as MdxJsxFlowElement;
    if (parent.name !== "LearningObjectives") return;

    for (const child of parent.children) {
      const el = child as MdxJsxFlowElement;
      if (
        !el ||
        typeof el !== "object" ||
        el.type !== "mdxJsxFlowElement" ||
        el.name !== "Objective"
      ) {
        continue;
      }

      const attrs = readObjectiveAttributes(el);
      const id = attrs.id?.trim();
      const verb = attrs.verb?.trim();

      if (!id) {
        throw new Error(
          `<Objective> in chapter "${chapterSlug}" is missing a non-empty \`id\`.`
        );
      }
      if (!verb) {
        throw new Error(
          `<Objective id="${id}"> in chapter "${chapterSlug}" is missing a non-empty \`verb\`.`
        );
      }

      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `<Objective id="${id}"> in chapter "${chapterSlug}" has an empty body. Resolution: add objective text between the opening and closing tags.`
        );
      }

      if (seenIds.has(id)) {
        throw new Error(
          `O1 invariant: duplicate <Objective id="${id}"> within chapter "${chapterSlug}". Resolution: change one of the \`id\` props.`
        );
      }
      seenIds.add(id);

      out.push({
        id,
        verb,
        body,
        chapter: chapterSlug,
        anchor: `lo-${slugify(id)}`,
      });
    }
  });

  return out;
}

/**
 * Walks `<LearningObjectives>` JSX flow elements in the mdast tree.
 * For each, harvests `<Objective>` children into a JS array, then
 * mutates the parent node: clears children, appends an `objectives`
 * attribute holding the serialized array.
 *
 * Runs AFTER `extractObjectives` (which validates and harvests as a
 * read-only pass). Uses the same `readObjectiveAttributes` +
 * `renderChildrenToHtml` helpers as `extractObjectives` — single
 * source of truth for body serialization.
 *
 * Throws on:
 *   - Empty `<LearningObjectives>` block (no `<Objective>` children)
 *   - Non-`<Objective>` JSX flow children of `<LearningObjectives>`
 *   - Missing or empty `id` / `verb` / `body` on any `<Objective>`
 *   - Duplicate `<Objective id="...">` within one `<LearningObjectives>`
 *
 * The transform pattern is the durable answer for any future
 * `<Parent><Child>` source-component pair. See the design doc's
 * §10 "Pattern precedent" for codified guidance.
 */
export function transformLearningObjectives(
  tree: Root,
  chapterSlug: string
): void {
  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const parent = node as MdxJsxFlowElement & {
      attributes: Array<{
        type: string;
        name: string;
        value:
          | string
          | boolean
          | null
          | {
              type: string;
              value: string;
              data?: { estree?: unknown };
            };
      }>;
      children: Array<unknown>;
    };
    if (parent.name !== "LearningObjectives") return;

    const items: Array<{ id: string; verb: string; body: string }> = [];
    const seenIds = new Set<string>();

    for (const child of parent.children) {
      // mdast emits whitespace-only text nodes between JSX siblings for
      // source like `<Parent>\n  <Child>`; these carry no semantic
      // content and must not trip the "non-Objective child" check.
      if (isWhitespaceTextNode(child)) continue;

      const el = child as MdxJsxFlowElement;
      if (!el || typeof el !== "object" || el.type !== "mdxJsxFlowElement") {
        throw new Error(
          `transform: <LearningObjectives> in chapter "${chapterSlug}" contains a non-JSX child. Only <Objective> JSX flow elements are allowed.`
        );
      }
      if (el.name !== "Objective") {
        throw new Error(
          `transform: <LearningObjectives> in chapter "${chapterSlug}" contains an unexpected child <${el.name}>. Only <Objective> children are allowed.`
        );
      }

      const attrs = readObjectiveAttributes(el);
      const id = attrs.id?.trim();
      const verb = attrs.verb?.trim();
      if (!id) {
        throw new Error(
          `transform: <Objective> in chapter "${chapterSlug}" is missing a non-empty \`id\`.`
        );
      }
      if (!verb) {
        throw new Error(
          `transform: <Objective id="${id}"> in chapter "${chapterSlug}" is missing a non-empty \`verb\`.`
        );
      }
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <Objective id="${id}"> in chapter "${chapterSlug}" has an empty body.`
        );
      }
      if (seenIds.has(id)) {
        throw new Error(
          `transform O1: duplicate <Objective id="${id}"> within one <LearningObjectives> in chapter "${chapterSlug}".`
        );
      }
      seenIds.add(id);
      items.push({ id, verb, body });
    }

    if (items.length === 0) {
      throw new Error(
        `transform: <LearningObjectives> in chapter "${chapterSlug}" has no <Objective> children. An empty LO block is a content bug.`
      );
    }

    parent.children = [];
    // The downstream mdast→hast→estree lowering pass (`hast-util-to-estree`)
    // reads `value.data.estree` — an ESTree `Program` node — and ignores
    // the string `value` field when lowering JSX attribute expressions.
    // Pushing only the JSON.stringify'd string produces an attribute that
    // compiles to `objectives={}` (JSXEmptyExpression) → undefined at
    // runtime → SSR crash. We must hand the parsed ESTree form through
    // `data.estree`. `valueToEstree` (canonical helper, same unified-
    // ecosystem author as mdast/remark/hast) converts the JS array into
    // an ESTree Expression; we wrap it in a Program/ExpressionStatement
    // to match the shape `hast-util-to-estree` expects. The string
    // `value` is retained as a debugging fallback some tooling reads.
    // See design doc §2 "Why JSON.stringify is the right serialization"
    // and §10 "Pattern precedent" pitfall.
    const estreeExpression = valueToEstree(items);
    parent.attributes.push({
      type: "mdxJsxAttribute",
      name: "objectives",
      value: {
        type: "mdxJsxAttributeValueExpression",
        value: JSON.stringify(items),
        data: {
          estree: {
            type: "Program",
            sourceType: "module",
            body: [
              {
                type: "ExpressionStatement",
                expression: estreeExpression,
              },
            ],
          },
        },
      },
    });
  });
}

function isWhitespaceTextNode(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { type?: string; value?: string };
  return n.type === "text" && (n.value ?? "").trim() === "";
}

/**
 * Walk one `<MultiRep>` parent's children and produce the
 * `SerializedRep[]` payload that both `extractMultiReps` and
 * `transformMultiRep` consume. Single source of truth for child-walk
 * validation; throws on shape errors (the throws bubble up to the
 * caller, which contextualizes them with the chapter slug and concept).
 *
 * Whitespace text nodes between JSX siblings are skipped (mdast emits
 * them around `<Parent>\n  <Child>` source). Any other non-JSX child
 * or any JSX child whose name isn't a registered Rep is a hard error.
 *
 * RepCode (`kind: "code"`) is deferred per the 2026-05-17 MultiRep
 * design hardening §D1; encountering `<RepCode>` in source throws
 * with a clear "deferred — pending <CodeCell>" message so authors
 * don't silently lose the binding.
 */
function buildRepsFromMultiRepChildren(
  parent: { children: ReadonlyArray<unknown> },
  contextLabel: string
): SerializedRep[] {
  const reps: SerializedRep[] = [];

  for (const child of parent.children) {
    if (isWhitespaceTextNode(child)) continue;

    const el = child as MdxJsxFlowElement;
    if (!el || typeof el !== "object" || el.type !== "mdxJsxFlowElement") {
      throw new Error(
        `transform: ${contextLabel} contains a non-JSX child. Only <RepVerbal> / <RepEquation> / <RepFigure> JSX flow elements are allowed.`
      );
    }

    if (el.name === "RepCode") {
      throw new Error(
        `transform: ${contextLabel} contains <RepCode>, which is deferred from v1 (pending <CodeCell> per ADR 0018). Remove it for now or upgrade to a v2 MultiRep that ships RepCode.`
      );
    }

    if (el.name === "RepVerbal") {
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <RepVerbal> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      reps.push({ kind: "verbal", body });
      continue;
    }

    if (el.name === "RepEquation") {
      const refKey = readStringAttr(el, "refKey");
      const symbol = readStringAttr(el, "symbol");
      if (!refKey) {
        throw new Error(
          `transform: <RepEquation> in ${contextLabel} is missing a non-empty \`refKey\`.`
        );
      }
      if (!symbol) {
        throw new Error(
          `transform: <RepEquation refKey="${refKey}"> in ${contextLabel} is missing a non-empty \`symbol\`.`
        );
      }
      const equivalent_to = readStringAttr(el, "equivalent_to");
      const via = readStringAttr(el, "via");
      const rep: SerializedRep = {
        kind: "equation",
        refKey,
        symbol,
        ...(equivalent_to ? { equivalent_to } : {}),
        ...(via ? { via } : {}),
      };
      reps.push(rep);
      continue;
    }

    if (el.name === "RepFigure") {
      const refName = readStringAttr(el, "refName");
      if (!refName) {
        throw new Error(
          `transform: <RepFigure> in ${contextLabel} is missing a non-empty \`refName\`.`
        );
      }
      const symbolLabel = readStringAttr(el, "symbolLabel");
      const rep: SerializedRep = {
        kind: "figure",
        refName,
        ...(symbolLabel ? { symbolLabel } : {}),
      };
      reps.push(rep);
      continue;
    }

    throw new Error(
      `transform: ${contextLabel} contains an unexpected child <${el.name}>. Only <RepVerbal> / <RepEquation> / <RepFigure> children are allowed at v1.`
    );
  }

  return reps;
}

/**
 * Pure extractor. Walks the mdast tree for `mdxJsxFlowElement` nodes
 * named `MultiRep`. For each match, validates the `concept` attr and
 * builds a `MultiRepIndexEntry` with the serialized rep payloads.
 *
 * Resolution of `refKey` / `refName` against the chapter's equation /
 * figure indexes happens at audit-time (PR-δ), not here — keeps the
 * extractor cycle-free and matches the LO precedent. Same applies to
 * the registry concept lookup (audit invariant MR1).
 *
 * Auto-derived anchor: `mr-<concept>` if `id` is omitted (matches the
 * runtime MultiRep component default).
 */
export function extractMultiReps(
  tree: Root,
  chapterSlug: string
): MultiRepIndexEntry[] {
  const out: MultiRepIndexEntry[] = [];
  // Detect within-chapter id collisions at extract-time (vs at the
  // accumulator's `addMultiReps`, which only catches cross-batch
  // collisions). Two `<MultiRep concept="x">` in one chapter both
  // auto-derive `mr-x` and would silently clobber each other in the
  // accumulator's Map; surfacing the collision here gives an error
  // message with the JSX context.
  const seenIds = new Set<string>();

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const parent = node as MdxJsxFlowElement;
    if (parent.name !== "MultiRep") return;

    const concept = readStringAttr(parent, "concept");
    if (!concept) {
      throw new Error(
        `<MultiRep> in chapter "${chapterSlug}" is missing a non-empty \`concept\` attr.`
      );
    }
    const id = readStringAttr(parent, "id") ?? `mr-${concept}`;
    if (seenIds.has(id)) {
      throw new Error(
        `<MultiRep> id collision in chapter "${chapterSlug}": two bindings share anchor "${id}" (latest concept: "${concept}"). Resolution: set explicit \`id\` props to disambiguate, or consolidate into one <MultiRep> block.`
      );
    }
    seenIds.add(id);
    const layoutRaw = readStringAttr(parent, "layout");
    const layout =
      layoutRaw === "grid" || layoutRaw === "stack" ? layoutRaw : undefined;

    const reps = buildRepsFromMultiRepChildren(
      parent,
      `<MultiRep concept="${concept}"> in chapter "${chapterSlug}"`
    );

    if (reps.length === 0) {
      throw new Error(
        `<MultiRep concept="${concept}"> in chapter "${chapterSlug}" has no Rep children. An empty MultiRep is a content bug.`
      );
    }

    const entry: MultiRepIndexEntry = {
      concept,
      id,
      chapter: chapterSlug,
      reps,
      ...(layout ? { layout } : {}),
    };
    out.push(entry);
  });

  return out;
}

/**
 * Walks `<MultiRep>` JSX flow elements in the mdast tree. For each,
 * harvests `<RepVerbal>` / `<RepEquation>` / `<RepFigure>` children
 * into a JS array, then mutates the parent node: clears children,
 * appends a `reps` mdxJsxAttribute holding the serialized array.
 *
 * Runs AFTER `extractMultiReps` (the read-only pass). Uses the same
 * `buildRepsFromMultiRepChildren` helper so both passes produce
 * identical payloads — extractor + runtime agree on the shape.
 *
 * The ESTree-wrapped attribute value follows the
 * `transformLearningObjectives` precedent: lowering passes
 * (`hast-util-to-estree`) read `value.data.estree` and ignore the
 * string `value`. Without the `data.estree` form the runtime prop
 * compiles to `reps={}` (JSXEmptyExpression → undefined) and SSR
 * crashes.
 */
export function transformMultiRep(tree: Root, chapterSlug: string): void {
  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const parent = node as MdxJsxFlowElement & {
      attributes: Array<{
        type: string;
        name: string;
        value:
          | string
          | boolean
          | null
          | {
              type: string;
              value: string;
              data?: { estree?: unknown };
            };
      }>;
      children: Array<unknown>;
    };
    if (parent.name !== "MultiRep") return;

    const concept = readStringAttr(parent, "concept");
    if (!concept) {
      throw new Error(
        `transform: <MultiRep> in chapter "${chapterSlug}" is missing a non-empty \`concept\` attr.`
      );
    }

    const reps = buildRepsFromMultiRepChildren(
      parent,
      `<MultiRep concept="${concept}"> in chapter "${chapterSlug}"`
    );

    if (reps.length === 0) {
      throw new Error(
        `transform: <MultiRep concept="${concept}"> in chapter "${chapterSlug}" has no Rep children. An empty MultiRep is a content bug.`
      );
    }

    parent.children = [];

    const estreeExpression = valueToEstree(reps);
    parent.attributes.push({
      type: "mdxJsxAttribute",
      name: "reps",
      value: {
        type: "mdxJsxAttributeValueExpression",
        value: JSON.stringify(reps),
        data: {
          estree: {
            type: "Program",
            sourceType: "module",
            body: [
              {
                type: "ExpressionStatement",
                expression: estreeExpression,
              },
            ],
          },
        },
      },
    });
  });
}

/**
 * Map from JSX element name → (kind, lookup-prop-name) for the four
 * inline-ref components. Centralized so the extractor and any future
 * audit-config diagnostics share a single source of truth.
 */
const INLINE_REF_TARGETS: Record<
  string,
  { kind: InlineRefKind; prop: string }
> = {
  GlossaryTerm: { kind: "glossary-term", prop: "name" },
  EqRef: { kind: "eq-ref", prop: "slug" },
  FigureRef: { kind: "figure-ref", prop: "name" },
  ChapterRef: { kind: "chapter-ref", prop: "slug" },
};

/**
 * Pure extractor. Walks an mdast tree for BOTH `mdxJsxFlowElement` and
 * `mdxJsxTextElement` nodes whose name matches one of the four inline-
 * ref components (`<GlossaryTerm>`, `<EqRef>`, `<FigureRef>`,
 * `<ChapterRef>`). Returns one `InlineRefUsageEntry` per match.
 *
 * Inline-refs can appear inline within prose (mdxJsxTextElement) OR
 * standalone as block elements (mdxJsxFlowElement); both shapes count.
 *
 * Empty / missing lookup props are silently skipped — the audit pass
 * (D4 / E4 / F2 / C1) surfaces those as their own ERROR codes against
 * the populated target collections. Append-only: no dedup. The same
 * `refKey` referenced N times in one chapter yields N entries (useful
 * for usage-count facets later).
 */
export function extractInlineRefUsages(
  tree: Root,
  chapterSlug: string
): InlineRefUsageEntry[] {
  const out: InlineRefUsageEntry[] = [];

  const visitor = (node: unknown) => {
    const el = node as {
      name?: string | null;
      attributes?: ReadonlyArray<{
        type: string;
        name: string;
        value: unknown;
      }>;
    };
    if (!el.name) return;
    const target = INLINE_REF_TARGETS[el.name];
    if (!target) return;

    const refKey = readStringAttr(el, target.prop);
    if (!refKey) return;

    out.push({
      kind: target.kind,
      refKey,
      chapter: chapterSlug,
    });
  };

  visit(tree, "mdxJsxFlowElement", visitor);
  visit(tree, "mdxJsxTextElement", visitor);

  return out;
}

/**
 * Walks an mdast tree and marks the first `<GlossaryTerm name="...">`
 * per slug per chapter with `data-first-use="true"`. Mutates the tree
 * in place; idempotent (re-running yields the same shape).
 *
 * The slug is derived via the same `slugify(name)` helper used by
 * `lookupDefinition()` in the runtime store, so build-time marks and
 * runtime lookups stay consistent. Different-cased name props
 * (`"Luminosity"`, `"luminosity"`, `"LUMINOSITY"`) collapse to one
 * dedup key.
 *
 * Consumed by `GlossaryTerm.tsx`, which renders an inline footnote
 * span when `data-first-use="true"` is present on its element. CSS in
 * `textbook-layout.css` reveals the span under `@media print`.
 */
export function markFirstUseGlossaryTerms(
  tree: Root,
  _chapterSlug: string
): void {
  const seenSlugs = new Set<string>();

  const visitor = (node: unknown) => {
    const el = node as {
      name?: string | null;
      attributes?: Array<{
        type: string;
        name: string;
        value: unknown;
      }>;
    };
    if (el.name !== "GlossaryTerm") return;
    const name = readStringAttr(el, "name");
    if (!name) return;
    const slug = slugify(name);
    if (seenSlugs.has(slug)) return;
    seenSlugs.add(slug);

    const attrs = el.attributes ?? [];
    if (attrs.some((a) => a.name === "data-first-use")) return;
    attrs.push({
      type: "mdxJsxAttribute",
      name: "data-first-use",
      value: "true",
    });
    el.attributes = attrs;
  };

  visit(tree, "mdxJsxFlowElement", visitor);
  visit(tree, "mdxJsxTextElement", visitor);
}

/**
 * Cross-chapter accumulator — state lives on `globalThis` so it
 * survives across Vite environments within a single Astro build.
 *
 * Why globalThis instead of a module-level `Map`: Astro 6 / Vite 7
 * runs separate environments for client and SSR bundles. Each
 * environment has its own module-resolution graph, so a module-
 * level `new Map()` produces TWO independent maps in the same
 * Node process — one written by the MDX-parsing pass, the other
 * read by the page-rendering pass. `globalThis` is genuinely
 * per-process and bridges the environments. Observed during PR-C1
 * with a `pid` + accumulator-size trace.
 *
 * Per ADR 0038's role-aggregation principle. Future entry types
 * (equations, key-insights, figures, misconceptions) attach to
 * this same accumulator under their own collections; PR-C1 only
 * surfaces definitions.
 */
const GLOBAL_KEY = "__sophiePedagogyIndex";

interface GlobalIndexState {
  definitions: Map<string, DefinitionEntry>;
  equations: Map<string, EquationEntry>;
  keyInsights: Map<string, KeyInsightEntry>;
  figureUsages: Map<string, FigureUsageEntry>;
  misconceptions: Map<string, MisconceptionEntry>;
  /**
   * Consumer-supplied figure registry (two-tier model, PR-C3 decision
   * #3). Unlike the other collections, this is NOT populated by the
   * MDX extractor — `TextbookLayout` pushes it in via
   * `setFigureRegistry()` at SSR merge time after reading it from the
   * consumer's `content/figures.ts`. `<CourseFigures>` and
   * `<ChapterFigures>` then read it through `asPedagogyIndex()`
   * alongside `figureUsages` to resolve names → image src/alt/caption.
   */
  figureRegistry: ReadonlyArray<FigureRegistryEntry>;
  /**
   * Per-chapter learning objectives (PR-C4). Keyed by
   * `${chapter}#${anchor}` so different chapters can each declare an
   * objective with the same id (no semantic collision).
   */
  objectives: Map<string, ObjectiveEntry>;
  /**
   * Consumer-supplied chapters collection (PR-C4). Populated from
   * `getCollection('chapters')` at TextbookLayout SSR-merge time.
   * Last-write-wins; NOT touched by `clearChapter` (mirrors
   * `figureRegistry`).
   */
  chapters: ReadonlyArray<ChapterEntry>;
  /**
   * Consumer-supplied modules collection (PR-C4). Same shape as
   * `chapters`; populated from `getCollection('modules')`.
   */
  modules: ReadonlyArray<ModuleEntry>;
  /**
   * Per-chapter inline-ref callsites (PR-C4). Append-only array
   * (NOT a Map) — the audit consumes the whole list and
   * usage-count facets care about callsite counts, not dedup'd keys.
   * `clearChapter` filters out entries with the cleared chapter slug.
   */
  inlineRefUsages: InlineRefUsageEntry[];
  /**
   * Per-contract validation entries (ADR 0056 PR 3). Populated by
   * `validation-extractor.ts` via `setContractValidations`. Last-write-
   * wins, consumer-global, NOT touched by `clearChapter` (mirrors
   * `figureRegistry` / `chapters` / `modules` — the contract files
   * are external to chapter MDX so the per-chapter clear pass
   * doesn't apply).
   */
  contractValidations: ReadonlyArray<ContractValidationEntry>;
  /**
   * Extractor-layer audit findings (V0 + V8; ADR 0056 PR 3).
   * Populated together with `contractValidations`. Flows into
   * `PedagogyIndex.extractorFindings` so `runPedagogyAudit` can
   * merge them into the report at the same call.
   */
  extractorFindings: ReadonlyArray<AuditFinding>;
  /**
   * Per-chapter `<MultiRep>` concept-binding entries (ADR 0043 +
   * 2026-05-17 design hardening). Keyed by `${chapter}#${id}` so
   * different chapters can reuse the auto-derived `mr-<concept>`
   * anchor without collision. Populated by `extractMultiReps`;
   * consumed by audit invariants MR1–MR4/MR6 in PR-δ.
   */
  multiReps: Map<string, MultiRepIndexEntry>;
}

function getGlobalState(): GlobalIndexState {
  const g = globalThis as { [GLOBAL_KEY]?: GlobalIndexState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      definitions: new Map(),
      equations: new Map(),
      keyInsights: new Map(),
      figureUsages: new Map(),
      misconceptions: new Map(),
      figureRegistry: [],
      objectives: new Map(),
      chapters: [],
      modules: [],
      inlineRefUsages: [],
      contractValidations: [],
      extractorFindings: [],
      multiReps: new Map(),
    };
  }
  return g[GLOBAL_KEY];
}

class IndexAccumulator {
  /**
   * Drop all entries for a given chapter. Called by the remark
   * plugin before re-extracting a chapter (so re-parses don't
   * accumulate stale entries).
   */
  clearChapter(chapterSlug: string): void {
    const state = getGlobalState();
    for (const [slug, entry] of state.definitions) {
      if (entry.chapter === chapterSlug) {
        state.definitions.delete(slug);
      }
    }
    for (const [slug, entry] of state.equations) {
      if (entry.chapter === chapterSlug) {
        state.equations.delete(slug);
      }
    }
    for (const [key, entry] of state.keyInsights) {
      if (entry.chapter === chapterSlug) {
        state.keyInsights.delete(key);
      }
    }
    for (const [key, entry] of state.figureUsages) {
      if (entry.chapter === chapterSlug) {
        state.figureUsages.delete(key);
      }
    }
    for (const [key, entry] of state.misconceptions) {
      if (entry.chapter === chapterSlug) {
        state.misconceptions.delete(key);
      }
    }
    for (const [key, entry] of state.objectives) {
      if (entry.chapter === chapterSlug) {
        state.objectives.delete(key);
      }
    }
    // Inline-ref usages are stored as a plain array (append-only). Filter
    // out the cleared chapter's entries. `chapters` and `modules` are
    // consumer-global (mirror `figureRegistry`) and are NOT touched here.
    state.inlineRefUsages = state.inlineRefUsages.filter(
      (u) => u.chapter !== chapterSlug
    );
    for (const [key, entry] of state.multiReps) {
      if (entry.chapter === chapterSlug) {
        state.multiReps.delete(key);
      }
    }
  }

  /**
   * Add a chapter's extracted entries. Throws on cross-chapter
   * slug collision (audit invariant #1).
   */
  addDefinitions(entries: ReadonlyArray<DefinitionEntry>): void {
    const state = getGlobalState();
    // Validate the whole batch BEFORE mutating. Without this two-
    // pass shape, a cross-chapter collision in entry N would leave
    // entries 0..N-1 already in the map — fine while the throw
    // kills the build, but brittle for PR-C2+ which may batch
    // larger role-mixed adds.
    for (const entry of entries) {
      const existing = state.definitions.get(entry.slug);
      if (existing && existing.chapter !== entry.chapter) {
        throw new Error(
          `Definition "${entry.term}" (slug "${entry.slug}") is defined in multiple chapters: "${existing.chapter}" and "${entry.chapter}". Resolution: rename one or consolidate.`
        );
      }
    }
    for (const entry of entries) {
      state.definitions.set(entry.slug, entry);
    }
  }

  /**
   * Add a chapter's extracted equations. Throws on cross-chapter
   * slug collision (audit invariant E1; defense in depth in PR-C2,
   * matches `addDefinitions`'s pattern). Two-pass shape: validate
   * the whole batch BEFORE mutating, so a collision in entry N
   * leaves entries 0..N-1 unwritten.
   */
  addEquations(entries: ReadonlyArray<EquationEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const existing = state.equations.get(entry.slug);
      if (existing && existing.chapter !== entry.chapter) {
        throw new Error(
          `Equation "${entry.title}" (slug "${entry.slug}") is defined in multiple chapters: "${existing.chapter}" and "${entry.chapter}". Resolution: change one of the \`id\` props.`
        );
      }
    }
    for (const entry of entries) {
      state.equations.set(entry.slug, entry);
    }
  }

  /**
   * Add a chapter's extracted key-insights. Key-insights are
   * chapter-local: anchors only need to be unique within a chapter
   * (intra-chapter collisions are caught by `extractKeyInsights`
   * before they reach the accumulator), so no cross-chapter
   * validation is required. Keyed by `${chapter}#${anchor}` so two
   * different chapters can both have e.g. anchor "ki-1"
   * without collision.
   */
  addKeyInsights(entries: ReadonlyArray<KeyInsightEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.keyInsights.set(`${entry.chapter}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted figure usages. F3 invariant (PR-C3
   * decisions row 10): exactly one canonical usage per figure name
   * across the whole textbook. Two-pass shape: detect any cross-
   * chapter multiple-canonical conflict BEFORE mutating, so a batch
   * that throws on entry N leaves entries 0..N-1 unwritten.
   *
   * Keyed by `${chapter}#${anchor}`; multiple `<Figure name="X">`
   * usages in one chapter coexist via distinct auto-generated anchors
   * (`fig-x-1`, `fig-x-2`, ...).
   */
  addFigureUsages(entries: ReadonlyArray<FigureUsageEntry>): void {
    const state = getGlobalState();
    // Two-pass: detect cross-chapter multiple-canonical (F3) BEFORE
    // mutating. Also catches multiple canonical usages within the
    // SAME incoming batch by comparing against earlier entries already
    // queued for write.
    const seenCanonicalNames = new Map<string, string>(); // name -> chapter
    for (const entry of entries) {
      if (!entry.canonical) continue;
      // Compare against existing accumulator state.
      for (const existing of state.figureUsages.values()) {
        if (existing.name === entry.name && existing.canonical) {
          throw new Error(
            `F3 invariant: multiple <Figure name="${entry.name}" canonical /> usages — found in chapter "${existing.chapter}" and chapter "${entry.chapter}". Resolution: remove \`canonical\` from one of them.`
          );
        }
      }
      // Also detect within the incoming batch.
      const prior = seenCanonicalNames.get(entry.name);
      if (prior !== undefined && prior !== entry.chapter) {
        throw new Error(
          `F3 invariant: multiple <Figure name="${entry.name}" canonical /> usages — found in chapter "${prior}" and chapter "${entry.chapter}". Resolution: remove \`canonical\` from one of them.`
        );
      }
      seenCanonicalNames.set(entry.name, entry.chapter);
    }
    for (const entry of entries) {
      state.figureUsages.set(`${entry.chapter}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted misconceptions. M2 invariant (PR-C3
   * decisions row 10): explicit-id-derived anchors must be unique
   * across chapters. Auto-anchors of the shape `misc-${N}`
   * are inherently chapter-scoped (each chapter restarts its counter
   * at 1) and are NOT subject to the cross-chapter check — two
   * chapters can each have a `misc-1` without conflict.
   *
   * Two-pass shape: validate the whole batch BEFORE mutating, so a
   * collision in entry N leaves entries 0..N-1 unwritten (mirrors
   * `addDefinitions` / `addEquations` / `addFigureUsages`).
   *
   * Keyed by `${chapter}#${anchor}` so the same anchor can coexist
   * across chapters when permitted (auto-anchors).
   *
   * Note on intra-batch dedup: unlike `addFigureUsages` (which guards
   * against same-name canonical figures within a single batch via
   * `seenCanonicalNames`), this method has no intra-batch check.
   * Safe because the batch is always single-chapter (see callsite
   * `indexAccumulator.addMisconceptions(extractMisconceptions(tree, slug))`)
   * and `extractMisconceptions` already enforces M1 (intra-chapter
   * anchor uniqueness) via `seenAnchors` before this method ever
   * runs. If the calling shape ever changes to multi-chapter batches,
   * mirror the `addFigureUsages` two-map pattern.
   */
  addMisconceptions(entries: ReadonlyArray<MisconceptionEntry>): void {
    const state = getGlobalState();
    // M2: cross-chapter slug collision check (only for EXPLICIT id-
    // derived anchors, not for auto-anchors which are chapter-scoped).
    for (const entry of entries) {
      // Match only the literal auto-anchor shape `misc-${counter}`.
      // `startsWith("misc-")` would also skip explicit ids like
      // `misc-orbital`, silently bypassing M2 cross-chapter validation.
      if (/^misc-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.misconceptions.values()) {
        if (
          existing.chapter !== entry.chapter &&
          existing.anchor === entry.anchor
        ) {
          throw new Error(
            `Misconception slug "${entry.anchor}" defined in multiple chapters: "${existing.chapter}" and "${entry.chapter}". (M2 invariant.) Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.misconceptions.set(`${entry.chapter}#${entry.anchor}`, entry);
    }
  }

  /**
   * Push the consumer-supplied figure registry into the accumulator
   * (two-tier model, PR-C3 decision #3). Unlike the other accumulator
   * setters, the registry doesn't come from an MDX walk — it comes
   * from the consumer's `content/figures.ts` via TextbookLayout's
   * `figureRegistry` prop. `<CourseFigures>` and `<ChapterFigures>`
   * read it back through `asPedagogyIndex()` to resolve figure names
   * to image src/alt/caption. Called from TextbookLayout's frontmatter
   * before the slot renders so consumers see a populated registry.
   */
  setFigureRegistry(entries: ReadonlyArray<FigureRegistryEntry>): void {
    const state = getGlobalState();
    state.figureRegistry = entries;
  }

  /**
   * Add a chapter's extracted objectives. Keyed by
   * `${chapter}#${anchor}`; different chapters can each declare an
   * objective with the same `id` (no semantic collision at this layer
   * — chapter scope is part of the key). Single-chapter batch
   * invariant: `extractObjectives` already enforces O1 (duplicate-id-
   * within-chapter) via `seenIds`, mirroring `addMisconceptions`'s
   * comment. No cross-chapter id-collision check.
   */
  addObjectives(entries: ReadonlyArray<ObjectiveEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.objectives.set(`${entry.chapter}#${entry.anchor}`, entry);
    }
  }

  /**
   * Push the consumer-supplied chapters collection into the accumulator
   * (PR-C4). Mirrors `setFigureRegistry` semantics: last-write-wins,
   * consumer-global, NOT touched by `clearChapter`. Called from
   * TextbookLayout's frontmatter after `getCollection('chapters')`
   * resolves so consumers see a populated chapters list.
   */
  setChapters(entries: ReadonlyArray<ChapterEntry>): void {
    const state = getGlobalState();
    state.chapters = entries;
  }

  /**
   * Push the consumer-supplied modules collection into the accumulator
   * (PR-C4). Same shape as `setChapters`.
   */
  setModules(entries: ReadonlyArray<ModuleEntry>): void {
    const state = getGlobalState();
    state.modules = entries;
  }

  /**
   * Append a chapter's inline-ref callsites. Append-only — the audit
   * consumes the whole list and usage-count facets later care about
   * callsite counts, not dedup'd keys. `clearChapter` filters out
   * entries with the cleared chapter slug to keep re-parses idempotent.
   */
  addInlineRefUsages(entries: ReadonlyArray<InlineRefUsageEntry>): void {
    const state = getGlobalState();
    state.inlineRefUsages.push(...entries);
  }

  /**
   * Push the contract-validations extraction result into the
   * accumulator (ADR 0056 PR 3). Called from TextbookLayout's
   * frontmatter once per build after `extractContractValidations`
   * resolves. Mirrors `setFigureRegistry` / `setChapters` /
   * `setModules` semantics: last-write-wins, consumer-global, NOT
   * touched by `clearChapter` (contract files are external to chapter
   * MDX). Both arrays are written atomically so the audit always sees
   * a coherent {entries, findings} pair.
   */
  setContractValidations(
    entries: ReadonlyArray<ContractValidationEntry>,
    findings: ReadonlyArray<AuditFinding>
  ): void {
    const state = getGlobalState();
    state.contractValidations = entries;
    state.extractorFindings = findings;
  }

  /**
   * Snapshot the current accumulator state as a PedagogyIndex.
   * Equations populate from PR-C2 onward; keyInsights, figureUsages,
   * and misconceptions populate from PR-C3 onward. `figureRegistry`
   * comes from the consumer app via `setFigureRegistry()` (called by
   * TextbookLayout at SSR merge time, PR-C3 decisions row 3 two-tier
   * model); empty until that setter fires.
   */
  /**
   * Add a chapter's extracted MultiRep bindings. Keyed by
   * `${chapter}#${id}` so different chapters can reuse the auto-
   * derived `mr-<concept>` anchor without collision. Within-chapter
   * duplicate concept bindings (two `<MultiRep concept="x">` in one
   * chapter sharing an auto-anchor) trip the key collision and throw.
   * Cross-chapter same-concept bindings are valid by design (the
   * audit-time MR6 invariant handles cross-chapter equivalent_to
   * resolution; concept reuse across chapters is fine).
   */
  addMultiReps(entries: ReadonlyArray<MultiRepIndexEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const key = `${entry.chapter}#${entry.id}`;
      const existing = state.multiReps.get(key);
      if (existing) {
        throw new Error(
          `MultiRep id collision: chapter "${entry.chapter}" has two <MultiRep> bindings sharing anchor "${entry.id}" (concepts "${existing.concept}" and "${entry.concept}"). Resolution: change one of the \`id\` props.`
        );
      }
    }
    for (const entry of entries) {
      const key = `${entry.chapter}#${entry.id}`;
      state.multiReps.set(key, entry);
    }
  }

  asPedagogyIndex(): PedagogyIndex {
    const state = getGlobalState();
    return {
      definitions: Array.from(state.definitions.values()),
      equations: Array.from(state.equations.values()),
      keyInsights: Array.from(state.keyInsights.values()),
      figureRegistry: state.figureRegistry,
      figureUsages: Array.from(state.figureUsages.values()),
      misconceptions: Array.from(state.misconceptions.values()),
      chapters: state.chapters,
      modules: state.modules,
      objectives: Array.from(state.objectives.values()),
      inlineRefUsages: state.inlineRefUsages.slice(),
      contractValidations: state.contractValidations,
      extractorFindings: state.extractorFindings,
      multiReps: Array.from(state.multiReps.values()),
    };
  }
}

export const indexAccumulator = new IndexAccumulator();

/**
 * Test-only helper: wipe ALL accumulator state in one call. Use in a
 * vitest `beforeEach` to remove cross-test ordering coupling. Not for
 * production use — `clearChapter` is the production-shape API (it
 * preserves entries from other chapters and is what the remark plugin
 * calls); `resetIndexAccumulator` blows away every collection,
 * including the consumer-supplied `figureRegistry`, which a build
 * never wants.
 */
export function resetIndexAccumulator(): void {
  const state = getGlobalState();
  state.definitions.clear();
  state.equations.clear();
  state.keyInsights.clear();
  state.figureUsages.clear();
  state.misconceptions.clear();
  state.figureRegistry = [];
  state.objectives.clear();
  state.chapters = [];
  state.modules = [];
  state.inlineRefUsages = [];
  state.contractValidations = [];
  state.extractorFindings = [];
  state.multiReps.clear();
}

/**
 * Default chapter-slug deriver. Matches Astro 6's glob-loader
 * default: the chapter id is the file's BASENAME, without the
 * `.mdx` extension. For
 * `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx`
 * this yields `"spoiler-alerts"` (matching the URL slug at
 * `/chapters/spoiler-alerts`).
 *
 * Consumer apps with non-default content layouts (e.g. a glob
 * loader configured with `generateId: ...`) pass their own
 * `getChapterSlug` to `pedagogyIndexRemarkPlugin()`.
 */
function defaultGetChapterSlug(filePath: string): string | undefined {
  const match = filePath.match(/[/\\]([^/\\]+)\.mdx$/);
  if (!match) return undefined;
  return match[1];
}

export interface PedagogyIndexRemarkPluginOptions {
  /** Derive a chapter slug from the source file path. Defaults to the
   * standard Astro content-collection layout (see defaultGetChapterSlug). */
  getChapterSlug?: (filePath: string) => string | undefined;
}

interface VFileLike {
  path?: string;
}

/**
 * Remark plugin that wires the pure extractors + `indexAccumulator`
 * into the unified MDX pipeline. Add to `remarkPlugins` in your
 * MDX integration config; runs once per chapter parse.
 *
 * On each chapter parse:
 *   1. Derive the chapter slug from the vfile path.
 *   2. `indexAccumulator.clearChapter(slug)` so re-parses don't
 *      accumulate stale entries.
 *   3. `extractDefinitions(tree, slug)` + `extractEquations(tree,
 *      slug)` + `extractKeyInsights(tree, slug)` + `extractFigures(
 *      tree, slug)` + `extractMisconceptions(tree, slug)` return
 *      this chapter's entries.
 *   4. `indexAccumulator.addDefinitions(entries)` +
 *      `addEquations(entries)` + `addKeyInsights(entries)` +
 *      `addFigureUsages(entries)` + `addMisconceptions(entries)`
 *      aggregate; throw on cross-chapter slug collision (audit
 *      invariant #1) for definitions and equations, on F3 (multiple-
 *      canonical-per-name) for figures, and on M2 (cross-chapter
 *      explicit-id collision) for misconceptions. Key-insights are
 *      chapter-local; misconception auto-anchors (`misc-N`)
 *      are also chapter-local and skip the M2 check.
 *
 * The plugin runs read-only extraction passes first (defs/equations/
 * key insights/figures/misconceptions/objectives/inline refs), then a
 * terminal `transformLearningObjectives` rewrite that mutates
 * `<LearningObjectives>` flow elements — see that function's docstring
 * for the rewrite contract.
 */
export function pedagogyIndexRemarkPlugin(
  options: PedagogyIndexRemarkPluginOptions = {}
): (tree: Root, file: VFileLike) => void {
  const getChapterSlug = options.getChapterSlug ?? defaultGetChapterSlug;

  return (tree: Root, file: VFileLike) => {
    const filePath = file.path;
    if (!filePath) return;
    const chapterSlug = getChapterSlug(filePath);
    if (!chapterSlug) return;

    indexAccumulator.clearChapter(chapterSlug);
    indexAccumulator.addDefinitions(extractDefinitions(tree, chapterSlug));
    indexAccumulator.addEquations(extractEquations(tree, chapterSlug));
    indexAccumulator.addKeyInsights(extractKeyInsights(tree, chapterSlug));
    indexAccumulator.addFigureUsages(extractFigures(tree, chapterSlug));
    indexAccumulator.addMisconceptions(
      extractMisconceptions(tree, chapterSlug)
    );
    indexAccumulator.addObjectives(extractObjectives(tree, chapterSlug));
    indexAccumulator.addInlineRefUsages(
      extractInlineRefUsages(tree, chapterSlug)
    );
    indexAccumulator.addMultiReps(extractMultiReps(tree, chapterSlug));

    // PR 10 print-polish: mark the first <GlossaryTerm> per slug per
    // chapter with `data-first-use="true"`. Downstream GlossaryTerm.tsx
    // reads the prop and renders an inline footnote span; the @media
    // print rules in textbook-layout.css reveal the span in print.
    markFirstUseGlossaryTerms(tree, chapterSlug);

    // Rewrite <LearningObjectives> AST shape so the React island
    // receives a props-driven `objectives` array instead of JSX
    // children (which Astro renders server-side as <astro-slot>
    // HTML, breaking children-mode interactivity). Runs last so all
    // read-only harvesters see the unmutated tree. See
    // docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md.
    transformLearningObjectives(tree, chapterSlug);
    // Rewrite <MultiRep> AST shape on the same terminal pass — the
    // runtime <MultiRep> dispatches over a `reps` prop populated from
    // serialized child attrs, paralleling the LO pattern. Per the
    // 2026-05-17 MultiRep design hardening §D5.
    transformMultiRep(tree, chapterSlug);
  };
}
