import { readFileSync } from "node:fs";
import {
  type AssumptionEntry,
  type AuditFinding,
  type Biography,
  type BreaksWhenEntry,
  type ChapterEntry,
  type CommonMisuseEntry,
  type ContractValidationEntry,
  type DefinitionEntry,
  type DerivationStepEntry,
  type EquationCitationEntry,
  type EquationEntry,
  type EquationRegistryEntry,
  EquationRegistryEntrySchema,
  type FigureRegistryEntry,
  type FigureUsageEntry,
  type InlineRefKind,
  type InlineRefUsageEntry,
  type InterventionDepth,
  type InterventionEntry,
  type KeyInsightEntry,
  type MisconceptionEntry,
  type ModuleEntry,
  type MultiRepIndexEntry,
  type ObjectiveEntry,
  type ObservableEntry,
  type PedagogyIndex,
  type SerializedRep,
  slugify,
  type UnitsEntry,
} from "@sophie/core/schema";
import { valueToEstree } from "estree-util-value-to-estree";
import { toHtml } from "hast-util-to-html";
import type { Root } from "mdast";
import { toHast } from "mdast-util-to-hast";
import { visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";

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
    if (attr.name === "name") out.name = attr.value;
  }
  Object.assign(out, readMisconceptionGraphFields(node));
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
 * Walks any mdast container's children and extracts biography entries
 * (Observable / Assumption / Units / BreaksWhen / CommonMisuse /
 * DerivationStep). Used by the registry walker
 * (`extractEquationRegistryDeclaration`) which walks `Root.children`
 * of `src/content/equations/<id>.mdx` files.
 *
 * Returns `undefined` when zero biography children are present (per-
 * equation opt-in per ADR 0046 §R8). Whitespace text nodes between
 * JSX siblings are skipped. Non-biography children (paragraphs, math
 * blocks, raw HTML, other JSX) are ALSO skipped — registry MDX files
 * may include framing prose between biography children.
 *
 * Observable + BreaksWhen are singletons; multiple of either is an
 * authoring error (throws). Assumption / Units / CommonMisuse /
 * DerivationStep are lists (any non-negative count is valid).
 *
 * Each role-bearing entry receives its hardcoded `epistemicRole`
 * literal per ADR 0058 §2 pattern 3 — the schema-side
 * `EpistemicRoleSchema.extract` locks the value, and the component-
 * side `<NAME>_EPISTEMIC_ROLE` const must agree (compile-time
 * guarantee via `as const satisfies EpistemicRole`).
 */
export function buildBiographyFromChildren(
  parent: { children: ReadonlyArray<unknown> },
  contextLabel: string
): Biography | undefined {
  let observable: ObservableEntry | undefined;
  const assumptions: AssumptionEntry[] = [];
  const units: UnitsEntry[] = [];
  let breaksWhen: BreaksWhenEntry | undefined;
  const commonMisuses: CommonMisuseEntry[] = [];
  const derivationSteps: DerivationStepEntry[] = [];

  for (const child of parent.children) {
    if (isWhitespaceTextNode(child)) continue;
    if (!child || typeof child !== "object") continue;
    const el = child as MdxJsxFlowElement;
    if (el.type !== "mdxJsxFlowElement") continue;

    if (el.name === "Observable") {
      if (observable !== undefined) {
        throw new Error(
          `transform: ${contextLabel} contains more than one <Observable> child. Per ADR 0046, Observable is an optional singleton — combine into one block or split into separate <KeyEquation>s.`
        );
      }
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <Observable> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      observable = { body, epistemicRole: "observable" };
      continue;
    }

    if (el.name === "Assumption") {
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <Assumption> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      const type = readStringAttr(el, "type");
      assumptions.push({
        body,
        ...(type ? { type } : {}),
        epistemicRole: "assumption",
      });
      continue;
    }

    if (el.name === "Units") {
      const symbol = readStringAttr(el, "symbol");
      const unit = readStringAttr(el, "unit");
      if (!symbol) {
        throw new Error(
          `transform: <Units> in ${contextLabel} is missing a non-empty \`symbol\` attr.`
        );
      }
      if (!unit) {
        throw new Error(
          `transform: <Units symbol="${symbol}"> in ${contextLabel} is missing a non-empty \`unit\` attr.`
        );
      }
      units.push({ symbol, unit });
      continue;
    }

    if (el.name === "BreaksWhen") {
      if (breaksWhen !== undefined) {
        throw new Error(
          `transform: ${contextLabel} contains more than one <BreaksWhen> child. Per ADR 0046, BreaksWhen is an optional singleton.`
        );
      }
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <BreaksWhen> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      breaksWhen = { body, epistemicRole: "approximation" };
      continue;
    }

    if (el.name === "CommonMisuse") {
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <CommonMisuse> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      const misconception = readStringAttr(el, "misconception");
      commonMisuses.push({
        body,
        ...(misconception ? { misconception } : {}),
      });
      continue;
    }

    if (el.name === "DerivationStep") {
      // Added per ADR 0046 §R9 (ADR 0060 brainstorm, 2026-05-18).
      // List shape — equations typically have multiple steps; each is
      // an entry with prose `body`, optional short `label`, and the
      // locked `"model"` epistemic role per ADR 0058's role contract.
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <DerivationStep> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      const label = readStringAttr(el, "label");
      derivationSteps.push({
        body,
        ...(label ? { label } : {}),
        epistemicRole: "model",
      });
    }

    // Non-biography JSX (anything other than the six biography children
    // above) is silently skipped — <KeyEquation> legitimately contains
    // other JSX in framing prose (e.g., <EqRef>, <GlossaryTerm>). The
    // audit (E7/E8/E9 in PR-δ) consumes the populated biography only;
    // if v2 grows a biography-allowlist invariant, it lives in
    // pedagogy-audit.ts, not here.
  }

  const hasAnyBiography =
    observable !== undefined ||
    assumptions.length > 0 ||
    units.length > 0 ||
    breaksWhen !== undefined ||
    commonMisuses.length > 0 ||
    derivationSteps.length > 0;

  if (!hasAnyBiography) return undefined;

  return {
    ...(observable ? { observable } : {}),
    assumptions,
    units,
    ...(breaksWhen ? { breaks_when: breaksWhen } : {}),
    common_misuses: commonMisuses,
    derivation_steps: derivationSteps,
  };
}

/**
 * Pure chapter walker per ADR 0060. Walks an mdast tree for
 * `<KeyEquation refId="X" />` callsites; returns one
 * `EquationCitationEntry` per callsite with extractor-assigned per-
 * chapter `number` (1-indexed, source order). Optional children render
 * to `framingHtml` for chapter-specific framing prose; absent children
 * → `framingHtml` is unset.
 *
 * Throws when:
 *   - A `<KeyEquation>` is missing the `refId` attr (the registry
 *     contract requires a target id).
 */
export function extractEquationCitations(
  tree: Root,
  chapterSlug: string
): EquationCitationEntry[] {
  const out: EquationCitationEntry[] = [];
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "KeyEquation") return;

    const refId = readStringAttr(el, "refId");
    if (!refId) {
      throw new Error(
        `<KeyEquation> in chapter "${chapterSlug}" is missing a non-empty \`refId\` attr. Post-ADR-0060, every chapter-side <KeyEquation> must cite a registry entry via \`refId\`.`
      );
    }

    counter += 1;
    const framingHtml = renderChildrenToHtml(el.children).trim();
    const anchor = `${slugify(refId)}-citation-${counter}`;
    out.push({
      chapter: chapterSlug,
      refId: slugify(refId),
      anchor,
      number: counter,
      ...(framingHtml.length > 0 ? { framingHtml } : {}),
    });
  });

  return out;
}

/**
 * Pure registry walker per ADR 0060. Combines validated frontmatter
 * (from Astro's content collection schema) with the biography extracted
 * from the registry MDX body's `Root.children`. Returns the assembled
 * `EquationEntry` — the registry-source contract on
 * `PedagogyIndex.equations[]`.
 *
 * Frontmatter shape is `EquationRegistryEntrySchema`; biography children
 * (Observable / Assumption / Units / BreaksWhen / CommonMisuse /
 * DerivationStep) are walked via the shared
 * `buildBiographyFromChildren` helper. The biography is optional —
 * registry MDX files without biography children produce entries
 * without the `biography` field.
 */
export function extractEquationRegistryDeclaration(
  tree: Root,
  frontmatter: EquationRegistryEntry
): EquationEntry {
  const biography = buildBiographyFromChildren(
    tree,
    `equation registry entry "${frontmatter.id}"`
  );
  return {
    ...frontmatter,
    ...(biography ? { biography } : {}),
  };
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
    let attrs: {
      title?: string;
      id?: string;
      name?: string;
    } & MisconceptionGraphFields;

    if (el.name === "Aside") {
      const a = readAsideAttributes(el);
      if (a.kind !== "misconception") return;
      length = "short";
      attrs = {
        title: a.title,
        id: a.id,
        name: a.name,
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
        // Callout doesn't surface a `name` attr today; if a future
        // Callout author adds one, the precedence chain below picks
        // it up automatically (anchor falls through to title-slug
        // when `name` is undefined).
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
    // `name` is the canonical misconception-graph identifier per
    // ADR 0044 (used in `prerequisite_misconceptions` /
    // `related_misconceptions` / `<Intervention addresses="…">`).
    // Anchor precedence places `name` ABOVE `slug(title)` so an
    // Aside with both `name=` and `title=` resolves to the `name`,
    // and the Intervention extractor's `addresses="this"`
    // resolution lands cleanly on the matching `MisconceptionEntry.anchor`
    // at audit time (closes the PR-γ → PR-δ coupling gap surfaced
    // during PR-δ scoping).
    const nameSlug = attrs.name?.trim() ? slugify(attrs.name.trim()) : null;
    const anchor = explicitId ?? nameSlug ?? titleSlug ?? `misc-${counter}`;

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
 * Read `<Intervention addresses=…>` — accepts either a plain string
 * (`addresses="universe-with-a-center"`) or an array expression
 * (`addresses={["a", "b"]}`). Returns the normalized array form, or
 * `undefined` when missing. Empty arrays return `undefined` (caller
 * treats as missing).
 */
function readInterventionAddressesAttr(
  node: MdxJsxFlowElement
): string[] | undefined {
  const single = readStringAttr(node, "addresses");
  if (single) return [single];
  const list = readStringListAttr(node, "addresses");
  if (list && list.length > 0) return list;
  return undefined;
}

/**
 * Pure extractor for `<Intervention>` JSX callsites per ADR 0044 +
 * 2026-05-17 design hardening §D4–§D5. Walks the tree manually
 * (rather than `visit()`) because resolving `addresses="this"`
 * requires the enclosing `<Aside kind="misconception" name="X">`'s
 * name — we track that as we recurse.
 *
 * Anchor numbering: sequential `intervention-${type-or-name-slug}-${idx}`
 * across the chapter in JSX-DFS order. The `transformIntervention`
 * pass below uses the IDENTICAL numbering so `id={anchor}` on the
 * rendered `<aside>` agrees with the pedagogy-index entry's `anchor`
 * field for hash-link navigation.
 *
 * `addresses="this"` resolution: rewritten to the enclosing
 * misconception's `name`. If `"this"` appears outside any misconception
 * Aside, it's left verbatim in the entry; the audit's I1 invariant
 * (PR-δ) catches that as a WARNING.
 *
 * Empty body throws — an intervention without prose is a content bug
 * (the structural pairing is unsupported without remediation content).
 *
 * Hard errors:
 *   - missing `type` attr
 *   - `type="custom"` without `name` (mirrors `.superRefine` on
 *     `InterventionPropsSchema` + `InterventionEntrySchema`)
 *   - missing `addresses` attr
 *   - empty body
 */
export function extractInterventions(
  tree: Root,
  chapterSlug: string
): InterventionEntry[] {
  const out: InterventionEntry[] = [];
  let idx = 0;

  function visitNode(
    node: unknown,
    enclosingMisconception: string | null,
    insideIntervention: boolean
  ): void {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      name?: string | null;
      children?: ReadonlyArray<unknown>;
    };

    // Track enclosing misconception Aside as we descend so nested
    // `<Intervention addresses="this">` resolves correctly. We only
    // shadow `enclosingMisconception` for the children of *this*
    // Aside — siblings and ancestors are unaffected because we
    // pass `nextEnclosing` only into the recursive call below.
    let nextEnclosing = enclosingMisconception;
    if (n.type === "mdxJsxFlowElement" && n.name === "Aside") {
      const kind = readStringAttr(n as MdxJsxFlowElement, "kind");
      if (kind === "misconception") {
        const miscName = readStringAttr(n as MdxJsxFlowElement, "name");
        // If `name` is missing, leave enclosingMisconception as-is —
        // the misconception extractor handles its own naming, and any
        // nested Intervention's `"this"` will fall through to the
        // outer enclosing (or stay as "this" if none).
        //
        // Slugify here to align with the misconception extractor's
        // anchor derivation, which stores `slugify(name)` as the
        // MisconceptionEntry.anchor (PR-δ extractor fix). Without
        // this slugify, an author writing `name="Universe With A
        // Center"` would produce a misconception anchor of
        // `universe-with-a-center` but an Intervention
        // `addresses="this"` resolution of `Universe With A Center`
        // (raw), and the audit's I1 + MG3 would fire false-positive
        // pairs on every nested intervention.
        if (miscName) nextEnclosing = slugify(miscName);
      }
    }

    if (n.type === "mdxJsxFlowElement" && n.name === "Intervention") {
      // Defense-in-depth: extractor sees Intervention nested inside
      // another Intervention's prose body. Extract would normally skip
      // recursion into Intervention children, but the transform pass
      // uses `visit()` which DOES recurse — letting the nested case
      // through would desynchronize anchor numbering between the two
      // passes. Throw here so the chapter author surfaces the bug
      // upfront rather than discovering a 404 hash anchor later.
      if (insideIntervention) {
        throw new Error(
          `<Intervention> inside another <Intervention>'s body in chapter "${chapterSlug}" — nested intervention blocks are not allowed (the structural pairing only makes sense at one level). Resolution: hoist the inner intervention to a sibling of the outer.`
        );
      }
      const el = n as MdxJsxFlowElement;
      // Reject an author-supplied explicit `id`. The PR-γ design has
      // the extractor as the SOLE source of intervention anchors so
      // the rendered DOM id and the pedagogy-index `anchor` field
      // never disagree. Letting the author author an `id` would split
      // the contract and silently break cross-chapter index links.
      const authorId = readStringAttr(el, "id");
      if (authorId) {
        throw new Error(
          `<Intervention id="${authorId}"> in chapter "${chapterSlug}" — the \`id\` attr is extractor-derived (PR-γ), not authorable. Resolution: drop the \`id\` prop; the auto-derived \`intervention-<type|name>-<idx>\` anchor is the source of truth for both the DOM and the pedagogy index.`
        );
      }
      const type = readStringAttr(el, "type");
      if (!type) {
        throw new Error(
          `<Intervention> in chapter "${chapterSlug}" is missing a non-empty \`type\` attr.`
        );
      }
      const name = readStringAttr(el, "name");
      if (type === "custom" && !name) {
        throw new Error(
          `<Intervention type="custom"> in chapter "${chapterSlug}" is missing a non-empty \`name\` attr (required when type="custom"; mirrors the .superRefine on InterventionPropsSchema).`
        );
      }
      const rawAddresses = readInterventionAddressesAttr(el);
      if (!rawAddresses) {
        throw new Error(
          `<Intervention type="${type}"> in chapter "${chapterSlug}" is missing a non-empty \`addresses\` attr.`
        );
      }
      // Resolve "this" against the enclosing misconception. When no
      // enclosure exists, leave "this" verbatim so the audit's I1
      // can flag it; do NOT throw here (lets the audit produce a
      // multi-finding report instead of a single hard error).
      const addresses = rawAddresses.map((a) =>
        a === "this" ? (enclosingMisconception ?? "this") : a
      );

      const limits = readStringAttr(el, "limits") ?? undefined;
      const depthRaw = readStringAttr(el, "depth");
      // Strict-enum check: silent coercion of `depth="deep"` →
      // `"light"` would diverge from the component schema's runtime
      // validation. Match the schema's posture here at extract time
      // so the build fails fast.
      if (
        depthRaw !== undefined &&
        depthRaw !== "light" &&
        depthRaw !== "substantial"
      ) {
        throw new Error(
          `<Intervention type="${type}"> in chapter "${chapterSlug}" has invalid \`depth="${depthRaw}"\`. Allowed values: "light", "substantial".`
        );
      }
      const depth: InterventionDepth =
        depthRaw === "substantial" ? "substantial" : "light";

      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `<Intervention type="${type}"> in chapter "${chapterSlug}" has an empty body. Resolution: add the remediation prose between the opening and closing tags.`
        );
      }

      idx += 1;
      const typeOrNameSlug =
        type === "custom" && name ? slugify(name) : slugify(type);
      const anchor = `intervention-${typeOrNameSlug}-${idx}`;

      const entry: InterventionEntry = {
        type,
        ...(name ? { name } : {}),
        addresses,
        body,
        ...(limits ? { limits } : {}),
        depth,
        chapter: chapterSlug,
        anchor,
      };
      out.push(entry);
      // Recurse into the body to enforce the no-nested-Intervention
      // rule (insideIntervention=true). We don't expect any pedagogy
      // children in the body (it's prose), but the recursion is cheap
      // and catches the structural-misuse case the M2 review flagged.
      if (n.children && Array.isArray(n.children)) {
        for (const child of n.children) {
          visitNode(child, nextEnclosing, true);
        }
      }
      return;
    }

    if (n.children && Array.isArray(n.children)) {
      for (const child of n.children) {
        visitNode(child, nextEnclosing, insideIntervention);
      }
    }
  }

  visitNode(tree, null, false);
  return out;
}

/**
 * Mutates `<Intervention>` JSX flow elements by injecting
 * `id={anchor}` so the rendered React `<aside>` carries the same
 * anchor the pedagogy-index entry stores — hash navigation
 * (`#intervention-contrasting-cases-1`) lands on the rendered DOM
 * and the component's `:target` outline activates.
 *
 * Numbering MUST match `extractInterventions` (same JSX-DFS order +
 * same `intervention-${slug(type|name)}-${idx}` template) so the
 * two passes produce identical anchors. Author-supplied explicit
 * `id` is rejected by `extractInterventions` upfront (the extractor
 * is the sole source of intervention anchors per the I1 review),
 * so this pass never encounters one in well-formed input. The
 * defensive `if (existing id) skip` guard catches the case where a
 * future ADR re-opens author authoring; today it's dead code by
 * construction but cheap to keep.
 *
 * Throws on missing `type` (symmetry with `transformMultiRep` — a
 * malformed JSX node that somehow escaped `extractInterventions`
 * should surface here rather than silently desynchronize the idx
 * counter from extract's).
 */
export function transformIntervention(tree: Root, chapterSlug: string): void {
  let idx = 0;
  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement & {
      attributes: Array<{ type: string; name: string; value: unknown }>;
    };
    if (el.name !== "Intervention") return;

    const type = readStringAttr(el, "type");
    if (!type) {
      throw new Error(
        `transform: <Intervention> in chapter "${chapterSlug}" is missing a non-empty \`type\` attr (extract should have caught this — file a bug).`
      );
    }
    const name = readStringAttr(el, "name");
    idx += 1;
    const typeOrNameSlug =
      type === "custom" && name ? slugify(name) : slugify(type);
    const anchor = `intervention-${typeOrNameSlug}-${idx}`;

    const existingId = el.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "id"
    );
    if (existingId) return;

    el.attributes.push({
      type: "mdxJsxAttribute",
      name: "id",
      value: anchor,
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
  /**
   * Registry-sourced equation declarations per ADR 0060. Keyed by
   * equation `id` (one entry per `src/content/equations/<id>.mdx`
   * file). NOT chapter-keyed — equations are registry-sourced post-
   * ADR-0060; chapter-side `<KeyEquation refId>` callsites live in
   * `equationCitations` instead.
   */
  equations: Map<string, EquationEntry>;
  /**
   * Per-chapter `<KeyEquation refId>` citation callsites per ADR 0060.
   * Append-only array (mirrors `inlineRefUsages`); `clearChapterCitations`
   * filters out entries with the cleared chapter slug.
   */
  equationCitations: EquationCitationEntry[];
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
  /**
   * Per-chapter `<Intervention>` entries (ADR 0044). Keyed by
   * `${chapter}#${anchor}` so different chapters can reuse the same
   * `intervention-<type>-<idx>` anchor without collision. Populated by
   * `extractInterventions`; consumed by audit invariants MG3/MG4/I1/I2/I3
   * (PR-δ). Per-batch duplicates within a chapter trip the key
   * collision and throw — the extractor's sequential numbering makes
   * this impossible in practice, so the throw is a defense-in-depth
   * guard against future refactors.
   */
  interventions: Map<string, InterventionEntry>;
}

function getGlobalState(): GlobalIndexState {
  const g = globalThis as { [GLOBAL_KEY]?: GlobalIndexState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      definitions: new Map(),
      equations: new Map(),
      equationCitations: [],
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
      interventions: new Map(),
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
    // Post-ADR-0060: equations are registry-sourced (one declaration per
    // `src/content/equations/<id>.mdx`), NOT chapter-keyed. The chapter-
    // clear pass drops the chapter's citations instead — declarations
    // are managed by `clearEquations` (full registry reset) or by
    // re-running the registry walker which overwrites by `id`.
    state.equationCitations = state.equationCitations.filter(
      (c) => c.chapter !== chapterSlug
    );
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
    for (const [key, entry] of state.interventions) {
      if (entry.chapter === chapterSlug) {
        state.interventions.delete(key);
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
   * Add registry-sourced equation declarations per ADR 0060. One entry
   * per `src/content/equations/<id>.mdx` file. Keyed by `id`; last-write-
   * wins (re-parsing the same registry MDX overwrites). No cross-chapter
   * collision check because equations are no longer chapter-keyed —
   * each registry file's `id` is the canonical identifier.
   */
  addEquations(entries: ReadonlyArray<EquationEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.equations.set(entry.id, entry);
    }
  }

  /**
   * Drop ALL registry-sourced equation declarations (full reset). Called
   * when the equation registry is re-loaded wholesale (e.g., during HMR
   * after a registry-file deletion). Distinct from `clearChapter`, which
   * does NOT touch `equations` post-ADR-0060.
   */
  clearEquations(): void {
    const state = getGlobalState();
    state.equations.clear();
  }

  /**
   * Add a chapter's extracted `<KeyEquation refId>` citation entries per
   * ADR 0060. Append-only; the per-chapter clear path is
   * `clearChapterCitations(chapterSlug)`.
   */
  addEquationCitations(entries: ReadonlyArray<EquationCitationEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.equationCitations.push(entry);
    }
  }

  /**
   * Drop a chapter's `<KeyEquation refId>` citations. Called by the
   * remark plugin's chapter pass before re-extracting (mirrors
   * `inlineRefUsages` clearing semantics).
   */
  clearChapterCitations(chapterSlug: string): void {
    const state = getGlobalState();
    state.equationCitations = state.equationCitations.filter(
      (c) => c.chapter !== chapterSlug
    );
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

  /**
   * Add a chapter's extracted `<Intervention>` entries (ADR 0044).
   * Keyed by `${chapter}#${anchor}` so different chapters can reuse
   * the same `intervention-<type>-<idx>` anchor without collision.
   * Within-chapter duplicate anchors trip the key collision and throw
   * — the extractor's sequential numbering makes this impossible in
   * practice, so the throw is a defense-in-depth guard against future
   * refactors.
   */
  addInterventions(entries: ReadonlyArray<InterventionEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const key = `${entry.chapter}#${entry.anchor}`;
      const existing = state.interventions.get(key);
      if (existing) {
        throw new Error(
          `Intervention anchor collision: chapter "${entry.chapter}" has two <Intervention> blocks sharing anchor "${entry.anchor}". Resolution: this should never happen with sequential extractor numbering — file a bug.`
        );
      }
    }
    for (const entry of entries) {
      const key = `${entry.chapter}#${entry.anchor}`;
      state.interventions.set(key, entry);
    }
  }

  asPedagogyIndex(): PedagogyIndex {
    const state = getGlobalState();
    return {
      definitions: Array.from(state.definitions.values()),
      equations: Array.from(state.equations.values()),
      equationCitations: state.equationCitations.slice(),
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
      interventions: Array.from(state.interventions.values()),
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
  state.equationCitations = [];
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
  state.interventions.clear();
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

/**
 * Path-detection helpers per ADR 0060. The remark plugin routes
 * `content/chapters/**` and `content/equations/**` to different
 * walkers (chapter citations vs registry declarations); other paths
 * are skipped. Pattern matches both POSIX (`/`) and Windows (`\\`)
 * separators.
 */
const CHAPTER_PATH_RE = /[/\\]content[/\\]chapters[/\\]/;
const EQUATION_REGISTRY_PATH_RE = /[/\\]content[/\\]equations[/\\]/;

function isChapterFilePath(filePath: string): boolean {
  return CHAPTER_PATH_RE.test(filePath);
}

function isEquationRegistryFilePath(filePath: string): boolean {
  return EQUATION_REGISTRY_PATH_RE.test(filePath);
}

/**
 * Read the YAML frontmatter for an equation registry MDX file and
 * validate it against `EquationRegistryEntrySchema`. Returns the
 * typed entry.
 *
 * Why fs-direct rather than walking the mdast `yaml` node: Astro's
 * MDX integration runs `remark-frontmatter` + `remark-mdx-frontmatter`
 * BEFORE our custom remark plugin sees the tree, so the YAML node is
 * already hoisted into an `mdxjsEsm` export const and the original
 * `yaml` node is removed from `tree.children`. Re-reading the source
 * file directly avoids parsing the hoisted ESM AST and gives us the
 * same YAML the content-layer schema validates against.
 */
function readEquationRegistryFrontmatter(
  filePath: string
): EquationRegistryEntry {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    throw new Error(
      `Equation registry file "${filePath}" is missing YAML frontmatter. Per ADR 0060, every registry MDX must declare \`id\`, \`title\`, \`tex\`, and \`symbols\` in frontmatter at the top of the file.`
    );
  }
  const raw = parseYaml(match[1] ?? "");
  const parsed = EquationRegistryEntrySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Equation registry file "${filePath}" has invalid frontmatter. Validation errors: ${parsed.error.message}`
    );
  }
  return parsed.data;
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
 * MDX integration config.
 *
 * Path-detected per ADR 0060:
 *   - `content/chapters/**\/*.mdx` → chapter pass: clear chapter state,
 *     run definition/equation-citation/key-insight/figure/misconception/
 *     objective/inline-ref/multirep/intervention extractors, run the
 *     terminal transform passes (LO/MultiRep/Intervention/markFirstUse).
 *   - `content/equations/**\/*.mdx` → registry pass: parse + validate
 *     frontmatter, walk body for biography children via
 *     `buildBiographyFromChildren`, assemble `EquationEntry`, replace
 *     the registry slot via `addEquations` (keyed by `id`).
 *   - Other paths → skip.
 *
 * The plugin runs read-only extraction passes first (chapter pass) or
 * a single registry-walker pass (registry path). Terminal transforms
 * fire only on the chapter pass; registry MDX bodies are static
 * biography content with no LO/MultiRep/Intervention components.
 */
export function pedagogyIndexRemarkPlugin(
  options: PedagogyIndexRemarkPluginOptions = {}
): (tree: Root, file: VFileLike) => void {
  return (tree: Root, file: VFileLike) => {
    const filePath = file.path;
    if (!filePath) return;

    // Registry path: assemble one EquationEntry from frontmatter + body
    // biography, replace the registry slot.
    if (isEquationRegistryFilePath(filePath)) {
      const frontmatter = readEquationRegistryFrontmatter(filePath);
      const entry = extractEquationRegistryDeclaration(tree, frontmatter);
      indexAccumulator.addEquations([entry]);
      return;
    }

    // Chapter pass. Two routes to chapterSlug:
    //   1. Caller-provided `options.getChapterSlug` — consumer apps with
    //      non-standard layouts (e.g. tests passing arbitrary paths)
    //      assert "treat this file as a chapter MDX and use slug X."
    //   2. Default basename-from-path + `content/chapters/**` filter —
    //      avoids mis-typed extraction on `examples/` sandbox files or
    //      docs MDX that aren't part of any chapter collection.
    let chapterSlug: string | undefined;
    if (options.getChapterSlug) {
      chapterSlug = options.getChapterSlug(filePath);
    } else if (isChapterFilePath(filePath)) {
      chapterSlug = defaultGetChapterSlug(filePath);
    }
    if (!chapterSlug) return;

    indexAccumulator.clearChapter(chapterSlug);
    indexAccumulator.addDefinitions(extractDefinitions(tree, chapterSlug));
    indexAccumulator.addEquationCitations(
      extractEquationCitations(tree, chapterSlug)
    );
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
    // Intervention PR-γ — pair the misconception graph with cognitive-
    // science-grounded remediation moves (ADR 0044). Read-only harvest
    // BEFORE the LO/MultiRep transform passes that mutate the tree;
    // `<Intervention>` is rendered by React via its children, so the
    // extract pass reads body prose from `el.children` un-rewritten.
    indexAccumulator.addInterventions(extractInterventions(tree, chapterSlug));

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
    // Inject `id={anchor}` on every `<Intervention>` so the rendered
    // <aside> carries the same anchor stored in the pedagogy-index
    // entry — hash navigation lands on the rendered DOM and the
    // :target outline fires. Runs after the read-only extractInterventions
    // (above) so the JSX-DFS numbering agrees.
    transformIntervention(tree, chapterSlug);
  };
}
