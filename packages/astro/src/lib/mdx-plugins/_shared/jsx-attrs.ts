import type { RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import { mdxjs } from "micromark-extension-mdxjs";

/**
 * Shared MDX-ESM + JSX-builder helpers for the Sophie remark plugins
 * (`sophie-auto-imports.ts`, `compound-expand.ts`). Extracted here so
 * the auto-import ESM machinery and the compound-island JSX builders
 * have a single canonical home (R9) — both plugins manufacture the same
 * `import { … } from "@sophie/components"` node and the same
 * `mdxJsxFlowElement` shape, so the definitions must not diverge.
 */

export const SOPHIE_COMPONENTS_PACKAGE = "@sophie/components";

/**
 * Subpath entry for Plot-using interactive figures. Figures are bundled
 * (not externalized) into `@sophie/components/figures` so @observablehq/plot
 * + d3 stay OUT of the main barrel's module graph (ADR 0022 amendment). The
 * auto-import plugin maps figure components to this specifier and emits one
 * grouped import per distinct source.
 */
export const SOPHIE_FIGURES_PACKAGE = "@sophie/components/figures";

/**
 * Structural mdast-util-mdxjs-esm node type — declared locally so the
 * plugins only depend on `mdast-util-mdx-jsx` + `mdast-util-from-markdown`
 * (already in @sophie/astro's package.json). The full `MdxjsEsm` type
 * from `mdast-util-mdxjs-esm` would add a transitive type-only import
 * dependency that's worth avoiding for one struct with two fields.
 */
export interface MdxjsEsmNode {
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
export function buildImportEsmNode(
  componentNames: readonly string[],
  packageSpecifier: string = SOPHIE_COMPONENTS_PACKAGE
): MdxjsEsmNode {
  const sorted = [...componentNames].sort();
  const source = `import { ${sorted.join(", ")} } from "${packageSpecifier}";\n`;
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
      `jsx-attrs: failed to parse generated import statement into an mdxjsEsm node. Source was: ${source}`
    );
  }
  return esmNode as unknown as MdxjsEsmNode;
}

/**
 * Locate an `import … from "<packageSpecifier>"` ImportDeclaration
 * inside any existing top-level `mdxjsEsm` node (`packageSpecifier`
 * defaults to `@sophie/components`; pass `@sophie/components/figures`
 * to match a figures-subpath import). Returns the node, the specific
 * declaration inside its estree, plus the names it already imports —
 * or `null` when no matching import exists yet.
 *
 * A single `mdxjsEsm` node may carry MULTIPLE author-written import
 * statements (MDX parses consecutive `import` lines without blank
 * separators into one `mdxjsEsm` block). We must surgically merge
 * specifiers into the matching `@sophie/components` ImportDeclaration
 * inside that block rather than replacing the whole node — replacing
 * would drop sibling imports (e.g. an `.astro` component imported
 * alongside Sophie components) and break the chapter MDX at compile.
 */
export function findExistingSophieImport(
  tree: {
    children: ReadonlyArray<RootContent>;
  },
  packageSpecifier: string = SOPHIE_COMPONENTS_PACKAGE
): {
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
    const esm = child as unknown as MdxjsEsmNode;
    const program = esm.data?.estree;
    if (!program) continue;
    for (const stmt of program.body) {
      if (stmt.type !== "ImportDeclaration") continue;
      if (typeof stmt.source?.value !== "string") continue;
      if (stmt.source.value !== packageSpecifier) continue;
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
export function buildImportSpecifier(name: string): {
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

/** Build a string-valued (or boolean-presence, when `value` is null) JSX attribute. */
export function attr(name: string, value: string | null): MdxJsxAttribute {
  return { type: "mdxJsxAttribute", name, value };
}

/** Build an `mdxJsxFlowElement` with the given name, attributes, and children. */
export function jsxFlowEl(
  name: string,
  attributes: MdxJsxAttribute[],
  children: RootContent[]
): MdxJsxFlowElement {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes,
    children: children as MdxJsxFlowElement["children"],
  };
}

/**
 * Build an `mdxJsxTextElement` — an INLINE (phrasing-content) JSX
 * element. Required for the FillBlank transform: a `<FillBlank.Slot>`
 * lives inside a paragraph, so its replacement `<input>` must be a text
 * element, not a flow element. Emitting a flow element where phrasing
 * content is expected breaks MDX's hast nesting (a block `<input>` would
 * split the surrounding `<p>`). The slot's `<input type="text">` has no
 * meaningful children — it's a void element — so callers pass `[]`.
 */
export function jsxTextEl(
  name: string,
  attributes: MdxJsxAttribute[],
  children: RootContent[]
): MdxJsxTextElement {
  return {
    type: "mdxJsxTextElement",
    name,
    attributes,
    children: children as MdxJsxTextElement["children"],
  };
}

/**
 * True when `el` carries an `mdxJsxAttribute` named `name` (any value,
 * incl. boolean-presence). Accepts flow OR text elements — both share
 * the `attributes` shape, and the FillBlank slot-rewrite reads attrs off
 * inline (`mdxJsxTextElement`) slot nodes.
 */
export function hasAttr(
  el: MdxJsxFlowElement | MdxJsxTextElement,
  name: string
): boolean {
  return el.attributes.some(
    (a) => a.type === "mdxJsxAttribute" && a.name === name
  );
}

/** Read a string-valued JSX attribute; `undefined` when absent / non-string. */
export function readAttr(
  el: MdxJsxFlowElement | MdxJsxTextElement,
  name: string
): string | undefined {
  for (const a of el.attributes) {
    if (a.type === "mdxJsxAttribute" && a.name === name) {
      return typeof a.value === "string" ? a.value : undefined;
    }
  }
  return undefined;
}
