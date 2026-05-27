import type { Root, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import { mdxjs } from "micromark-extension-mdxjs";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

/**
 * Structural mdast-util-mdxjs-esm node type — declared locally so the
 * plugin only depends on `mdast-util-mdx-jsx` + `mdast-util-from-markdown`
 * (already in @sophie/astro's package.json). The full `MdxjsEsm` type
 * from `mdast-util-mdxjs-esm` would add a transitive type-only import
 * dependency that's worth avoiding for one struct with two fields.
 */
interface MdxjsEsmNode {
  type: "mdxjsEsm";
  value: string;
  data?: {
    estree?: {
      body: ReadonlyArray<{
        type: string;
        source?: { value?: unknown };
        specifiers?: ReadonlyArray<{
          type: string;
          imported?: { type: string; name?: string };
        }>;
      }>;
    } | null;
  };
}

/**
 * Sophie auto-imports + parent-prop-threading remark plugin
 * (ADR 0073 Amendment 1; ADR 0061 Rule 4 author surface).
 *
 * Three responsibilities at MDX-compile time:
 *
 *  1. **Auto-import** known interactive Sophie components into the MDX
 *     file's ESM block so consumer-course chapter authors don't write
 *     `import { … } from "@sophie/components"` statements by hand.
 *     Static-mapped components (`<Aside>`, `<Callout>`, `<Figure>` etc.
 *     — see `makeStaticComponents` in `components.tsx`) are NOT
 *     auto-imported; they flow through the `<Content components>` map
 *     per ADR 0027.
 *
 *  2. **Inject `client:load`** as a boolean-presence attribute on every
 *     auto-imported interactive component instance — unless the author
 *     already declared a different client directive
 *     (`client:visible` / `client:idle` / `client:only` / `client:media`),
 *     in which case author intent wins.
 *
 *  3. **Thread parent props** through the formative family: every
 *     `<Solution>` / `<Hint>` descendant of a formative parent
 *     (`<PracticeProblem>` / `<MCQ>` / `<MultiSelect>` / `<FillBlank>` /
 *     `<NumericQuestion>` / `<QuickCheck>`) receives the parent's
 *     `course` / `unit` / `id` as `course` / `unit` / `parentId` props.
 *     Explicit author overrides on the child win; the plugin never
 *     clobbers a pre-existing attribute. Missing parent attributes
 *     raise a curated MDX-compile error naming the file + parent so
 *     the author sees the gap immediately rather than as a downstream
 *     `useInteractive` runtime crash.
 *
 * Plugin ordering: register BEFORE `remarkMath` in
 * `sophieMdxOptions.remarkPlugins` so `$…$` inline math content inside
 * formative-family children is unaffected by the JSX rewrites.
 *
 * The plugin is a pure mdast/MDX-JS transform — no filesystem access,
 * no module-scoped caches, no HMR considerations (R8 N/A).
 */

/**
 * Components that need an auto-injected `import { … } from
 * "@sophie/components"` AND an auto-injected `client:load` directive
 * — i.e., authored in chapter or registry MDX AND hydration-bearing
 * (state hook, IndexedDB persistence, Radix interactive primitive, or
 * runtime popover with linked-parameter / glossary store).
 *
 * Three classes of barrel-exported components are deliberately
 * absent from this set:
 *
 *  1. **Static-mapped** (`Aside`, `Callout`, `Figure`, `KeyEquation`,
 *     `Video`, `WorkedExample`, `Due`, `OfficeHours`, `Points`,
 *     `Reading`, `Week`). These flow through the `<Content
 *     components>` map (`makeStaticComponents` /
 *     `makeChromeComponents` in `components.tsx`) per ADR 0027,
 *     so Astro binds them at render time without needing an explicit
 *     import. `KeyEquation` is in the static map even though its
 *     popover is hydration-bearing — chapter authors who need the
 *     full interactive popover write the import + `client:load`
 *     directly. The reference primitives (`<EquationRef>`,
 *     `<FigureRef>`, `<ChapterRef>`, `<GlossaryTerm>`) appear in
 *     BOTH the static map (SSR fallback: bare text) AND the
 *     interactive set below (auto-import + `client:load`
 *     materializes the popover); the auto-import branch wins when
 *     the author actually uses the component.
 *
 *  2. **Content-only auto-imports** (the biography children, layout
 *     primitives, MultiRep slots, etc.) — see
 *     `SOPHIE_CONTENT_AUTO_IMPORT` below. They need the auto-import
 *     for ergonomics (zero-import author surface, ADR 0061 Rule 4)
 *     but DO NOT need hydration: rendering as SSR'd HTML is the
 *     complete contract. Putting `client:load` on them would
 *     hydrate a tree that has no client-side behavior — wasteful
 *     and confusing.
 *
 *  3. **Non-MDX-authored exports** (`IndexedDBResponseStore`,
 *     `SearchModal`, `ProfileProvider`, the course-info projection
 *     shells `HeroWithModules` / `ProseWithToc` / `SimpleList` /
 *     `ContactCard` / `GradingTable` / `PrereqsList` /
 *     `ObjectivesSection` / `AccessibilitySection` /
 *     `OfficeHoursTable` / `SectionLanding` / `ChromeTitleBar`).
 *     These are imported by `.astro` layouts directly, never by
 *     chapter MDX. They're outside this plugin's surface.
 *
 * Pre-emptive entries: `MCQ`, `MultiSelect`, `FillBlank`,
 * `NumericQuestion`, `QuickCheck` ship as components in PRs 5–9 of
 * the formative-assessment plan. They're listed here so the
 * registry remains the single source of truth and the
 * formative-parent threading job below has a stable contract — the
 * `injectClientLoadDirectives` job is a no-op until the component
 * is actually authored.
 */
export const SOPHIE_INTERACTIVE_COMPONENTS: ReadonlySet<string> = new Set([
  "BlackbodyExplorer",
  "ChapterRef",
  "ComprehensionGate",
  "ConfidenceCheck",
  "Dropdown",
  "EffortLog",
  "EquationRef",
  "FigureRef",
  "FillBlank",
  "GlossaryTerm",
  "Hint",
  "InteractiveCallout",
  "InteractiveCheckbox",
  "LearningObjectives",
  "MCQ",
  "MultiSelect",
  "NumericQuestion",
  "Objective",
  "ParameterCursor",
  "ParameterSlider",
  "PracticeProblem",
  "Predict",
  "QuickCheck",
  "Reflection",
  "RetrievalPrompt",
  "SkillReview",
  "Solution",
  "SpacedReview",
  "Tab",
  "Tabs",
]);

/**
 * Components that need an auto-injected import but DO NOT need
 * `client:load` — content-only barrel exports authored inside chapter
 * or equation-registry MDX. The plugin folds the union of these and
 * `SOPHIE_INTERACTIVE_COMPONENTS` into a single ESM import line at the
 * top of the MDX file; the difference is the `client:load` pass below
 * skips them.
 *
 * Membership rationale per family:
 *  - **Biography children** authored inside equation-registry MDX
 *    (`Assumption`, `BreaksWhen`, `CommonMisuse`, `DerivationStep`):
 *    Tier-3 chrome cards rendered inline by `<KeyEquation>`; no
 *    per-instance state.
 *  - **Reasoning-OS primitives** (`Intervention`, `MultiRep`,
 *    `Observable`, `OMIFlow`, `RepEquation`, `RepFigure`,
 *    `RepVerbal`): pure-display pedagogy primitives per ADR 0058 §M5;
 *    the OMI taxonomy lives in serialized HTML, no client-side state.
 *  - **Layout primitives** (`Card`, `Grid`): SSR'd flex/grid wrappers.
 *  - **Equation-registry metadata** (`Units`): inline (symbol, unit)
 *    pairs displayed below `<KeyEquation>` bodies.
 *
 * Tests below enforce the disjointness invariant (no component in
 * both sets) and barrel-coverage (every barrel-exported MDX-authored
 * component is in one set, the static map, or the documented
 * exclusion list).
 */
export const SOPHIE_CONTENT_AUTO_IMPORT: ReadonlySet<string> = new Set([
  "Assumption",
  "BreaksWhen",
  "Card",
  "CommonMisuse",
  "DerivationStep",
  "Grid",
  "Intervention",
  "MultiRep",
  "OMIFlow",
  "Observable",
  "RepEquation",
  "RepFigure",
  "RepVerbal",
  "Units",
]);

/**
 * Union — every component the plugin will auto-import. Computed once
 * at module load.
 */
export const SOPHIE_AUTO_IMPORTED_COMPONENTS: ReadonlySet<string> = new Set([
  ...SOPHIE_INTERACTIVE_COMPONENTS,
  ...SOPHIE_CONTENT_AUTO_IMPORT,
]);

/**
 * Components that own a `(course, unit, id)` namespace and thread it
 * to formative-child descendants at compile time.
 *
 * The v1 formative family per ADR 0073 Amendment 1. PRs 5–9 will add
 * `<MCQ>` / `<MultiSelect>` / `<FillBlank>` / `<NumericQuestion>` /
 * `<QuickCheck>` as components; they're listed here pre-emptively so
 * the threading job has a stable contract when those PRs land —
 * the plugin is the source of truth for "parent" status, not the
 * component implementations.
 */
export const SOPHIE_FORMATIVE_PARENTS: ReadonlySet<string> = new Set([
  "FillBlank",
  "MCQ",
  "MultiSelect",
  "NumericQuestion",
  "PracticeProblem",
  "QuickCheck",
]);

/**
 * Components that receive `course` / `unit` / `parentId` from the
 * nearest formative-parent ancestor at MDX-compile time.
 */
export const SOPHIE_FORMATIVE_CHILDREN: ReadonlySet<string> = new Set([
  "Hint",
  "Solution",
]);

/** Astro client directives — preserve any author-declared one. */
const CLIENT_DIRECTIVE_NAMES: ReadonlySet<string> = new Set([
  "client:load",
  "client:visible",
  "client:idle",
  "client:only",
  "client:media",
]);

const SOPHIE_COMPONENTS_PACKAGE = "@sophie/components";

interface JsxElementLike {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name: string | null;
  attributes: Array<MdxJsxAttribute | { type: string; name?: string }>;
  children?: ReadonlyArray<RootContent>;
}

function isJsxElement(node: unknown): node is JsxElementLike {
  if (!node || typeof node !== "object") return false;
  const n = node as { type?: unknown };
  return n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement";
}

/**
 * Three-way result tag for an attribute lookup on a formative-parent
 * shell. Compile-time prop threading requires a STATIC STRING LITERAL
 * (`course="my-course"`) — not an expression (`course={courseSlug}`),
 * which the plugin cannot evaluate at MDX-compile time. The three
 * cases get distinct downstream handling:
 *
 *  - `kind: "string"` (value: string): use it. (Empty strings are
 *    treated as missing by the threading pass — see below.)
 *  - `kind: "expression"`: throw a curated error pointing at the
 *    JSX-expression callsite — most authors hit this by reflex
 *    typing `course={courseSlug}` when they mean `course="..."`.
 *  - `kind: "missing"`: throw a curated error naming the missing
 *    attributes.
 */
type AttrResult =
  | { kind: "string"; value: string }
  | { kind: "expression" }
  | { kind: "missing" };

function readStringAttr(
  el: {
    attributes: ReadonlyArray<{ type: string; name?: string; value?: unknown }>;
  },
  name: string
): AttrResult {
  for (const attr of el.attributes) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name !== name) continue;
    if (typeof attr.value === "string")
      return { kind: "string", value: attr.value };
    // The attr exists but is expression-valued (`course={x}`) or
    // boolean-presence (`course` with no `=`). Both are non-static and
    // mean the same thing to the threading pass: we can't read the
    // value at compile time.
    return { kind: "expression" };
  }
  return { kind: "missing" };
}

function hasAttr(
  el: { attributes: ReadonlyArray<{ type: string; name?: string }> },
  name: string
): boolean {
  return el.attributes.some(
    (a) => a.type === "mdxJsxAttribute" && a.name === name
  );
}

function hasAnyClientDirective(el: {
  attributes: ReadonlyArray<{ type: string; name?: string }>;
}): boolean {
  for (const attr of el.attributes) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (typeof attr.name !== "string") continue;
    if (CLIENT_DIRECTIVE_NAMES.has(attr.name)) return true;
  }
  return false;
}

/**
 * Build an `mdxjsEsm` node carrying a fully-parsed estree program for
 * `import { Name1, Name2 } from "@sophie/components";`. The estree
 * payload is what MDX's recma pass actually compiles — providing both
 * `value` (source text) and `data.estree` (parsed AST) matches the
 * shape `remark-mdx-frontmatter` produces for hoisted frontmatter
 * exports and the shape `mdxFromMarkdown` emits when MDX itself parses
 * an `import` line. We parse via `fromMarkdown(..., { extensions:
 * [mdxjs()] })` to reuse MDX's own grammar rather than depending on
 * acorn directly — fewer moving parts, identical output.
 */
function buildImportEsmNode(componentNames: readonly string[]): MdxjsEsmNode {
  const sorted = [...componentNames].sort();
  const source = `import { ${sorted.join(", ")} } from "${SOPHIE_COMPONENTS_PACKAGE}";\n`;
  const ast = fromMarkdown(source, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });
  const esmNode = ast.children.find((c) => c.type === "mdxjsEsm");
  if (!esmNode) {
    // Defensive — `mdxjs()` is documented to emit `mdxjsEsm` for any
    // top-level import statement. If this ever throws it means the
    // MDX grammar shifted under us; surface the failure loudly.
    throw new Error(
      `sophie-auto-imports: failed to parse generated import statement into an mdxjsEsm node. Source was: ${source}`
    );
  }
  return esmNode as unknown as MdxjsEsmNode;
}

/** Walk every JSX element in the tree (flow + text variants). */
function visitJsxElements(
  tree: Root,
  callback: (node: JsxElementLike) => void
): void {
  visit(tree, (node) => {
    if (isJsxElement(node)) callback(node);
  });
}

/**
 * Collect names of Sophie interactive components used anywhere in the
 * tree. Returns a sorted unique list, ready to feed to
 * `buildImportEsmNode`. Excludes components already declared in an
 * existing `import … from "@sophie/components"` ESM node so re-runs
 * are idempotent + author-written imports merge cleanly.
 */
function collectUsedAutoImportComponents(tree: Root): string[] {
  const used = new Set<string>();
  visitJsxElements(tree, (el) => {
    if (typeof el.name !== "string") return;
    if (SOPHIE_AUTO_IMPORTED_COMPONENTS.has(el.name)) used.add(el.name);
  });
  return [...used].sort();
}

/**
 * Locate an `import … from "@sophie/components"` ImportDeclaration
 * inside any existing top-level `mdxjsEsm` node. Returns the node,
 * the specific declaration inside its estree, plus the names it
 * already imports — or `null` when no Sophie-components import
 * exists yet.
 *
 * A single `mdxjsEsm` node may carry MULTIPLE author-written import
 * statements (MDX parses consecutive `import` lines without blank
 * separators into one `mdxjsEsm` block). We must surgically merge
 * specifiers into the matching `@sophie/components` ImportDeclaration
 * inside that block rather than replacing the whole node — replacing
 * would drop sibling imports (e.g. an `.astro` component imported
 * alongside Sophie components) and break the chapter MDX at compile.
 */
function findExistingSophieImport(tree: Root): {
  node: MdxjsEsmNode;
  decl: {
    specifiers?: ReadonlyArray<{
      type: string;
      imported?: { type: string; name?: string };
    }>;
  };
  names: Set<string>;
} | null {
  for (const child of tree.children) {
    if (child.type !== "mdxjsEsm") continue;
    const esm = child as MdxjsEsmNode;
    const program = esm.data?.estree;
    if (!program) continue;
    for (const stmt of program.body) {
      if (stmt.type !== "ImportDeclaration") continue;
      if (typeof stmt.source?.value !== "string") continue;
      if (stmt.source.value !== SOPHIE_COMPONENTS_PACKAGE) continue;
      const names = new Set<string>();
      for (const spec of stmt.specifiers ?? []) {
        if (spec.type !== "ImportSpecifier") continue;
        if (
          spec.imported?.type === "Identifier" &&
          typeof spec.imported.name === "string"
        ) {
          names.add(spec.imported.name);
        }
      }
      return { node: esm, decl: stmt, names };
    }
  }
  return null;
}

/**
 * Build an estree `ImportSpecifier` node for a single name, matching
 * the shape `acorn` (via mdxjs micromark) produces for parsed import
 * lines. MDX's recma pass only needs the structural shape; whitespace
 * positions are unused.
 */
function buildImportSpecifier(name: string): {
  type: string;
  imported: { type: string; name: string };
  local: { type: string; name: string };
} {
  return {
    type: "ImportSpecifier",
    imported: { type: "Identifier", name },
    local: { type: "Identifier", name },
  };
}

/**
 * Job 1 + idempotency: ensure a single `import { … } from
 * "@sophie/components"` statement at the top of the tree imports
 * every interactive component used in the file.
 *
 * Two paths:
 * - **No existing import**: insert a fresh `mdxjsEsm` node at the top.
 * - **Existing import** (possibly co-located with non-Sophie imports
 *   in the same `mdxjsEsm` node): merge specifiers in-place into the
 *   matching ImportDeclaration's estree + regenerate the node's raw
 *   `value` source-text so both fields stay consistent. Sibling
 *   ImportDeclarations in the same `mdxjsEsm` node are untouched.
 */
function injectAutoImports(tree: Root): void {
  const usedNames = collectUsedAutoImportComponents(tree);
  if (usedNames.length === 0) return;

  const existing = findExistingSophieImport(tree);
  if (!existing) {
    const importNode = buildImportEsmNode(usedNames);
    tree.children.unshift(importNode as unknown as RootContent);
    return;
  }

  // Surgical merge: mutate the existing ImportDeclaration's specifiers
  // array in place. Sibling ImportDeclarations in the same `mdxjsEsm`
  // node (e.g. a default-import of an .astro component co-located with
  // the @sophie/components named import) stay untouched — MDX's recma
  // pass consumes the estree directly, so the host node's raw `value`
  // doesn't need to be rebuilt.
  const union = new Set<string>([...existing.names, ...usedNames]);
  const sortedNames = [...union].sort();
  const newSpecifiers = sortedNames.map(buildImportSpecifier);
  // Cast through `unknown` to swap the ReadonlyArray-typed specifiers
  // field — the estree ImportDeclaration shape (documented in
  // `estree-jsx`) is mutable at runtime; the structural type used here
  // declares it readonly to discourage accidental mutation elsewhere.
  (
    existing.decl as unknown as {
      specifiers: typeof newSpecifiers;
    }
  ).specifiers = newSpecifiers;
}

/**
 * Job 2: inject `client:load` (boolean-presence) on every interactive
 * JSX element that doesn't already carry an Astro client directive.
 */
function injectClientLoadDirectives(tree: Root): void {
  visitJsxElements(tree, (el) => {
    if (typeof el.name !== "string") return;
    if (!SOPHIE_INTERACTIVE_COMPONENTS.has(el.name)) return;
    if (hasAnyClientDirective(el)) return;
    el.attributes.push({
      type: "mdxJsxAttribute",
      name: "client:load",
      value: null,
    } as MdxJsxAttribute);
  });
}

/**
 * Job 3: thread the formative parent's `course` / `unit` / `id`
 * attributes into every `<Solution>` / `<Hint>` descendant as
 * `course` / `unit` / `parentId`. Explicit child attributes win.
 *
 * Walk discipline: top-down from the tree root in a single pass; when
 * a formative-parent shell is found, recurse with that shell's ctx and
 * DO NOT recurse on it again from the outer pass. This is structurally
 * robust against nested formative parents — the nearest-ancestor's ctx
 * always wins for a given `<Solution>` / `<Hint>` because the only
 * descent that reaches it carries the innermost ctx. The previous
 * implementation visited every formative-parent independently and
 * relied on `hasAttr` short-circuiting to avoid clobber; the structural
 * invariant here means the ordering of attribute writes is no longer
 * load-bearing.
 *
 * Errors are curated: missing-attribute and expression-valued-attribute
 * cases produce distinct messages so authors who reflexively type
 * `course={courseSlug}` see the actionable diagnosis ("use a string
 * literal") rather than the misleading "missing" message. Errors
 * include `file:line` when the source position is available — MDX
 * compile errors flow through Vite's overlay and editor-clickable
 * line refs accelerate the fix loop.
 */
function threadFormativeParentProps(tree: Root, filePath: string): void {
  walkAndThread(tree, null, filePath);
}

/**
 * Recursively walk a subtree threading `course` / `unit` / `parentId`
 * into every `<Solution>` / `<Hint>` descendant.
 *
 * `ctx` is the active formative-parent context. `null` at the root.
 * When we encounter a formative-parent shell, we validate its attrs,
 * switch to its ctx, and recurse — descendants on this path see ONLY
 * the innermost ancestor's ctx, which is exactly the "nearest-ancestor
 * wins" semantics authors expect.
 */
function walkAndThread(
  node: { children?: ReadonlyArray<RootContent> } | RootContent | Root,
  ctx: { course: string; unit: string; parentId: string } | null,
  filePath: string
): void {
  const children = (node as { children?: ReadonlyArray<RootContent> }).children;
  if (!children) return;
  for (const child of children) {
    if (!isJsxElement(child)) {
      walkAndThread(child, ctx, filePath);
      continue;
    }
    if (
      typeof child.name === "string" &&
      SOPHIE_FORMATIVE_PARENTS.has(child.name)
    ) {
      const innerCtx = validateAndExtractCtx(
        child as MdxJsxFlowElement | MdxJsxTextElement,
        filePath
      );
      walkAndThread(child, innerCtx, filePath);
      continue;
    }
    if (
      ctx !== null &&
      typeof child.name === "string" &&
      SOPHIE_FORMATIVE_CHILDREN.has(child.name)
    ) {
      threadAttrsOnChild(child as MdxJsxFlowElement | MdxJsxTextElement, ctx);
    }
    walkAndThread(child, ctx, filePath);
  }
}

/**
 * Read `course` / `unit` / `id` off a formative-parent shell, throwing
 * a curated error when any are missing OR expression-valued. The two
 * failure modes get distinct messages so authors see the actionable
 * fix. Empty-string values (`course=""`) are treated as missing — the
 * threading job requires non-empty slugs for IDB key composition.
 */
function validateAndExtractCtx(
  parent: MdxJsxFlowElement | MdxJsxTextElement,
  filePath: string
): { course: string; unit: string; parentId: string } {
  const parentName = parent.name ?? "<unknown>";
  const loc = formatPosition(parent, filePath);

  const expressionAttrs: string[] = [];
  const missingAttrs: string[] = [];
  const values: Record<"course" | "unit" | "id", string | null> = {
    course: null,
    unit: null,
    id: null,
  };
  for (const name of ["course", "unit", "id"] as const) {
    const result = readStringAttr(parent, name);
    if (result.kind === "expression") {
      expressionAttrs.push(name);
    } else if (result.kind === "missing" || result.value === "") {
      missingAttrs.push(name);
    } else {
      values[name] = result.value;
    }
  }

  if (expressionAttrs.length > 0) {
    throw new Error(
      `<${parentName}> at ${loc} declares ${expressionAttrs
        .map((a) => `\`${a}\``)
        .join(
          ", "
        )} as a JSX expression, but compile-time prop threading requires a static string literal. Write \`${expressionAttrs[0]}="my-${expressionAttrs[0]}"\` (with double quotes), not \`${expressionAttrs[0]}={someVariable}\`. The Sophie auto-imports plugin reads these attributes at MDX-compile time to thread \`course\` / \`unit\` / \`parentId\` to nested <Solution> / <Hint> children (per ADR 0073 Amendment 1).`
    );
  }
  if (missingAttrs.length > 0) {
    throw new Error(
      `<${parentName}> at ${loc} is missing required attribute(s): ${missingAttrs.join(", ")}. Formative parents must declare \`course\`, \`unit\`, and \`id\` so the Sophie auto-imports plugin can thread \`course\` / \`unit\` / \`parentId\` to nested <Solution> / <Hint> children (per ADR 0073 Amendment 1).`
    );
  }

  // All three values are now guaranteed non-null non-empty strings.
  return {
    course: values.course as string,
    unit: values.unit as string,
    parentId: values.id as string,
  };
}

function formatPosition(
  node: MdxJsxFlowElement | MdxJsxTextElement,
  filePath: string
): string {
  const line = node.position?.start?.line;
  return typeof line === "number" ? `${filePath}:${line}` : filePath;
}

function threadAttrsOnChild(
  child: MdxJsxFlowElement | MdxJsxTextElement,
  ctx: { course: string; unit: string; parentId: string }
): void {
  const wantedAttrs: ReadonlyArray<[string, string]> = [
    ["course", ctx.course],
    ["unit", ctx.unit],
    ["parentId", ctx.parentId],
  ];
  for (const [name, value] of wantedAttrs) {
    if (hasAttr(child, name)) continue;
    child.attributes.push({
      type: "mdxJsxAttribute",
      name,
      value,
    } as MdxJsxAttribute);
  }
}

export const sophieAutoImportsRemarkPlugin: Plugin<[], Root> =
  () => (tree, file) => {
    const filePath =
      typeof (file as { path?: unknown }).path === "string"
        ? (file as { path: string }).path
        : "<unknown>";
    // Order matters: thread first (so child JSX attribute additions
    // are seen by the client-load + auto-import passes), then add
    // client directives, then collect imports.
    threadFormativeParentProps(tree, filePath);
    injectClientLoadDirectives(tree);
    injectAutoImports(tree);
  };
