import type { Root, RootContent } from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import {
  buildImportEsmNode,
  buildImportSpecifier,
  findExistingSophieImport,
} from "./_shared/jsx-attrs.ts";
import {
  importSourceFor,
  SOPHIE_AUTO_IMPORTED_COMPONENTS,
  SOPHIE_FORMATIVE_CHILDREN,
  SOPHIE_FORMATIVE_PARENTS,
  SOPHIE_INTERACTIVE_COMPONENTS,
} from "./sophie-auto-imports.registry.ts";

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

/** Astro client directives — preserve any author-declared one. */
const CLIENT_DIRECTIVE_NAMES: ReadonlySet<string> = new Set([
  "client:load",
  "client:visible",
  "client:idle",
  "client:only",
  "client:media",
]);

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
 * Job 1 + idempotency: ensure each distinct import source has one
 * `import { … } from "<source>"` statement at the top of the tree
 * covering every used component mapped to that source. Most components
 * resolve to the main `@sophie/components` barrel; Plot-using figures
 * resolve to the `@sophie/components/figures` subpath
 * (`SOPHIE_COMPONENT_IMPORT_SOURCE`) so Plot stays out of the main
 * barrel's module graph (ADR 0022 amendment).
 *
 * Components are grouped by source, then each group is injected. Sources
 * are processed in reverse-sorted order so successive `unshift`es leave
 * the import statements in ascending source order at the top of the file.
 */
function injectAutoImports(tree: Root): void {
  const usedNames = collectUsedAutoImportComponents(tree);
  if (usedNames.length === 0) return;

  const namesBySource = new Map<string, string[]>();
  for (const name of usedNames) {
    const source = importSourceFor(name);
    const group = namesBySource.get(source);
    if (group) group.push(name);
    else namesBySource.set(source, [name]);
  }

  for (const source of [...namesBySource.keys()].sort().reverse()) {
    injectImportForSource(tree, namesBySource.get(source) as string[], source);
  }
}

/**
 * Inject (or merge into an existing) `import { … } from "<source>"`
 * statement for one import source.
 *
 * Two paths:
 * - **No existing import**: insert a fresh `mdxjsEsm` node at the top.
 * - **Existing import** (possibly co-located with non-Sophie imports
 *   in the same `mdxjsEsm` node): merge specifiers in-place into the
 *   matching ImportDeclaration's estree. Sibling ImportDeclarations in
 *   the same `mdxjsEsm` node are untouched — MDX's recma pass consumes
 *   the estree directly, so the host node's raw `value` doesn't need to
 *   be rebuilt.
 */
function injectImportForSource(
  tree: Root,
  names: readonly string[],
  source: string
): void {
  const existing = findExistingSophieImport(tree, source);
  if (!existing) {
    const importNode = buildImportEsmNode(names, source);
    tree.children.unshift(importNode as unknown as RootContent);
    return;
  }

  const union = new Set<string>([...existing.names, ...names]);
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
    // Order matters: thread first (so child JSX attribute additions are
    // seen by the client-load + auto-import passes), then add client
    // directives, then collect imports. Compound-island expansion
    // (MCQ → static structure + <MCQController>) is NOT done here — it
    // runs in `sophieCompoundExpandRemarkPlugin`, registered LAST in the
    // chain (after the pedagogy extractor) so the extractor sees the
    // authored `<MCQ><MCQ.Choice>` shape; that plugin self-injects its
    // own controller import + `client:load`.
    threadFormativeParentProps(tree, filePath);
    injectClientLoadDirectives(tree);
    injectAutoImports(tree);
  };
