import {
  type DefinitionEntry,
  type EquationEntry,
  type FigureUsageEntry,
  type KeyInsightEntry,
  type MisconceptionEntry,
  type PedagogyIndex,
  slugify,
} from "@sophie/core/schema";
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

interface AsideAttributes {
  kind?: string;
  title?: string;
  id?: string;
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

interface CalloutAttributes {
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
 * `key-insight-${counter}` (counter is per-chapter sequential).
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
    const anchor = explicitId ?? titleSlug ?? `key-insight-${counter}`;

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
 * slug(title) > `misconception-${counter}` (counter is per-chapter
 * sequential, incremented once per matched element across BOTH
 * source primitives in source order).
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
    let attrs: { title?: string; id?: string };

    if (el.name === "Aside") {
      const a = readAsideAttributes(el);
      if (a.kind !== "misconception") return;
      length = "short";
      attrs = { title: a.title, id: a.id };
    } else if (el.name === "Callout") {
      const c = readCalloutAttributes(el);
      if (c.variant !== "misconception") return;
      length = "long";
      attrs = { title: c.title, id: c.id };
    } else {
      return;
    }

    counter += 1;
    const titleSlug = attrs.title?.trim() ? slugify(attrs.title.trim()) : null;
    const explicitId = attrs.id?.trim() ? slugify(attrs.id.trim()) : null;
    const anchor = explicitId ?? titleSlug ?? `misconception-${counter}`;

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

    out.push({
      body,
      chapter: chapterSlug,
      anchor,
      length,
      label: attrs.title?.trim() || undefined,
    });
  });

  return out;
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
   * different chapters can both have e.g. anchor "key-insight-1"
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
   * Keyed by `${chapter}#${name}` so the same registry name can be
   * used in multiple chapters (the two-tier point of decisions row
   * 3); each usage gets its own entry. Note: two `<Figure name="X">`
   * in the same chapter get distinct anchors (`fig-x-1`, `fig-x-2`)
   * via the counter suffix, so F5 (intra-chapter anchor collision)
   * does NOT fire — but they share the `${chapter}#${name}` key, so
   * the second silently clobbers the first in the index. This is a
   * known v1 limitation; the smoke chapter never renders the same
   * figure twice. If we later allow repeated registry names within a
   * chapter (e.g. for comparison spreads), the key here will need to
   * incorporate the counter, OR an authoring lint should reject the
   * shape.
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
      state.figureUsages.set(`${entry.chapter}#${entry.name}`, entry);
    }
  }

  /**
   * Add a chapter's extracted misconceptions. M2 invariant (PR-C3
   * decisions row 10): explicit-id-derived anchors must be unique
   * across chapters. Auto-anchors of the shape `misconception-${N}`
   * are inherently chapter-scoped (each chapter restarts its counter
   * at 1) and are NOT subject to the cross-chapter check — two
   * chapters can each have a `misconception-1` without conflict.
   *
   * Two-pass shape: validate the whole batch BEFORE mutating, so a
   * collision in entry N leaves entries 0..N-1 unwritten (mirrors
   * `addDefinitions` / `addEquations` / `addFigureUsages`).
   *
   * Keyed by `${chapter}#${anchor}` so the same anchor can coexist
   * across chapters when permitted (auto-anchors).
   */
  addMisconceptions(entries: ReadonlyArray<MisconceptionEntry>): void {
    const state = getGlobalState();
    // M2: cross-chapter slug collision check (only for EXPLICIT id-
    // derived anchors, not for auto-anchors which are chapter-scoped).
    for (const entry of entries) {
      if (entry.anchor.startsWith("misconception-")) continue;
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
   * Snapshot the current accumulator state as a PedagogyIndex.
   * Equations populate from PR-C2 onward; keyInsights, figureUsages,
   * and misconceptions populate from PR-C3 onward. `figureRegistry`
   * is never populated by the extractor — TextbookLayout receives it
   * from the consumer app at SSR merge time (PR-C3 decisions row 3,
   * two-tier model).
   */
  asPedagogyIndex(): PedagogyIndex {
    const state = getGlobalState();
    return {
      definitions: Array.from(state.definitions.values()),
      equations: Array.from(state.equations.values()),
      keyInsights: Array.from(state.keyInsights.values()),
      figureRegistry: [],
      figureUsages: Array.from(state.figureUsages.values()),
      misconceptions: Array.from(state.misconceptions.values()),
    };
  }
}

export const indexAccumulator = new IndexAccumulator();

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
 *      chapter-local; misconception auto-anchors (`misconception-N`)
 *      are also chapter-local and skip the M2 check.
 *
 * The plugin doesn't mutate the mdast tree — it's extraction-only.
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
  };
}
