import type { Parent, Root, RootContent } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { choiceSlug } from "../pedagogy-index/jsx-utils.ts";
import {
  attr,
  buildImportEsmNode,
  buildImportSpecifier,
  findExistingSophieImport,
  hasAttr,
  jsxFlowEl,
  readAttr,
} from "./_shared/jsx-attrs.ts";

/**
 * Compile-time expansion of compound authoring tags (`<MCQ>`,
 * `<MultiSelect>`, …) into static native form markup + a childless
 * controller island (`<MCQController>` / `<MultiSelectController>`).
 * Authors write the high-level `<MCQ><MCQ.Choice>` shape; this transform
 * lowers it to accessible SSR'd HTML (a `<fieldset>` of `<label><input>`
 * pairs — `radiogroup` for single-select MCQ, a plain group for
 * multi-select) plus a hydration-bearing controller that restores +
 * persists the student's selection. The correct choice(s) carry a
 * static `data-correct` attribute (CSS reveal; v1 does not auto-grade).
 *
 * **Chain position (ADR 0073 Amendment 1).** Registered LAST in the
 * remark chain (after `pedagogyIndexRemarkPlugin`) so the formative
 * extractor sees the *authored* `<MCQ><MCQ.Choice>` shape — slug
 * derivation, AS-1..5 audit, and this transform's `<input value>`
 * attribution all use the shared `choiceSlug`, so the extractor's index
 * anchor and the rendered control agree. Because it runs after
 * auto-imports, the auto-import pass cannot inject the controller's
 * `import` / `client:load`; this transform self-injects both.
 *
 * The plugin is a pure mdast/MDX-JS transform — no filesystem access,
 * no module-scoped caches, no HMR considerations (R8 N/A).
 */

/**
 * One row per compound authoring tag. Maps the parent name to the
 * child names + emitted controller + native control type + visible
 * heading. **Active registry is MCQ + MultiSelect** — FillBlank / Tabs
 * rows land in later tasks once their controllers exist (adding a row
 * whose controller component is absent would break the build, since
 * the self-injected `import` would resolve to nothing). The shape is
 * kept easy to extend: a new compound tag is one row + (if it needs a
 * new native control) one branch in `expandIsland`'s control-type
 * handling.
 */
interface CompoundIsland {
  /** Authoring parent tag, e.g. `MCQ`. */
  parent: string;
  /** Prompt child tag, e.g. `MCQ.Prompt`. */
  promptName: string;
  /** Choice child tag, e.g. `MCQ.Choice`. */
  choiceName: string;
  /** Emitted controller island, e.g. `MCQController`. */
  controllerName: string;
  /**
   * Native form control type for each choice. `radio` → single-select
   * (one answer); `checkbox` → multi-select (many answers, many may be
   * `correct`).
   */
  controlType: "radio" | "checkbox";
  /**
   * `data-pedagogy-role` stamped on the emitted `<section>` — the
   * hyphenated kebab role the extractor + CSS + index schema read
   * (`mcq`, `multi-select`). NOT derived from `parent.toLowerCase()`:
   * `MultiSelect` lowercases to `multiselect`, but the role is
   * `multi-select`. (The input `name` prefix, by contrast, stays the
   * un-hyphenated `parent.toLowerCase()` — `multiselect-${id}` — which
   * is internal to the transform↔controller coupling and never read by
   * the role-keyed extractor.)
   */
  pedagogyRole: string;
  /** Visible `<h3>` text for the emitted section. */
  heading: string;
}

export const COMPOUND_ISLANDS: ReadonlyArray<CompoundIsland> = [
  {
    parent: "MCQ",
    promptName: "MCQ.Prompt",
    choiceName: "MCQ.Choice",
    controllerName: "MCQController",
    controlType: "radio",
    pedagogyRole: "mcq",
    heading: "Multiple choice",
  },
  {
    parent: "MultiSelect",
    promptName: "MultiSelect.Prompt",
    choiceName: "MultiSelect.Choice",
    controllerName: "MultiSelectController",
    controlType: "checkbox",
    pedagogyRole: "multi-select",
    heading: "Select all that apply",
  },
];

const REGISTRY_BY_PARENT: ReadonlyMap<string, CompoundIsland> = new Map(
  COMPOUND_ISLANDS.map((row) => [row.parent, row])
);

const isFlow = (node: RootContent): node is MdxJsxFlowElement =>
  node.type === "mdxJsxFlowElement";

/**
 * Expand one compound-island parent into its static `<section>` +
 * childless controller island. Throws on a duplicate choice slug,
 * naming the parent `id` so the author can disambiguate.
 */
function expandIsland(
  parent: MdxJsxFlowElement,
  spec: CompoundIsland
): MdxJsxFlowElement {
  const course = readAttr(parent, "course") ?? "";
  const unit = readAttr(parent, "unit") ?? "";
  const id = readAttr(parent, "id") ?? "";
  const labelId = `${id}-label`;

  const promptNodes: RootContent[] = [];
  const labels: RootContent[] = [];
  const reveals: RootContent[] = [];
  const seenSlugs = new Set<string>();

  for (const child of (parent.children as RootContent[]) ?? []) {
    if (!isFlow(child)) continue;
    if (child.name === spec.promptName) {
      promptNodes.push(...((child.children as RootContent[]) ?? []));
    } else if (child.name === spec.choiceName) {
      const slug = choiceSlug(child);
      if (seenSlugs.has(slug)) {
        throw new Error(
          `<${spec.parent} id="${id}"> has a duplicate choice slug "${slug}". Resolution: edit the choice text so it slugifies distinctly, or set an explicit \`id\` on one <${spec.choiceName}>.`
        );
      }
      seenSlugs.add(slug);
      // `name` scheme is `${parent-lowercased}-${id}` — `mcq-${id}` /
      // `multiselect-${id}`. CRITICAL coupling: the controller queries
      // the inputs by this exact `name`, so the scheme must match the
      // one each controller derives (`MCQController`, `MultiSelectController`).
      const inputAttrs = [
        attr("type", spec.controlType),
        attr("name", `${spec.parent.toLowerCase()}-${id}`),
        attr("value", slug),
        attr("id", `${id}-${slug}`),
      ];
      if (hasAttr(child, "correct")) {
        inputAttrs.push(attr("data-correct", "true"));
      }
      labels.push(
        jsxFlowEl(
          "label",
          [],
          [
            jsxFlowEl("input", inputAttrs, []),
            jsxFlowEl("span", [], (child.children as RootContent[]) ?? []),
          ]
        )
      );
    } else if (child.name === "Solution" || child.name === "Hint") {
      reveals.push(child);
    }
  }

  // Fieldset grouping: a radio set is an ARIA `radiogroup` (the role
  // that conveys single-select, roving-focus semantics to AT). A
  // checkbox set must NOT be a `radiogroup` (wrong semantics — implies
  // mutually-exclusive selection); a plain `<fieldset>` is already an
  // implicit group, so no explicit role is needed.
  const fieldsetAttrs =
    spec.controlType === "radio"
      ? [attr("role", "radiogroup"), attr("aria-labelledby", labelId)]
      : [attr("aria-labelledby", labelId)];

  return jsxFlowEl(
    "section",
    [
      attr("data-pedagogy-role", spec.pedagogyRole),
      attr("data-formative-anchor", id),
      attr("aria-labelledby", labelId),
    ],
    [
      jsxFlowEl(
        "h3",
        [attr("id", labelId)],
        [{ type: "text", value: spec.heading } as RootContent]
      ),
      ...promptNodes,
      jsxFlowEl("fieldset", fieldsetAttrs, labels),
      jsxFlowEl(
        spec.controllerName,
        [
          attr("course", course),
          attr("unit", unit),
          attr("id", id),
          attr("client:load", null),
        ],
        []
      ),
      ...reveals,
    ]
  );
}

/**
 * Ensure the tree's `@sophie/components` import includes every name in
 * `controllerNames`. Merges into an existing import declaration when
 * present (preserving sibling specifiers + sibling imports), else
 * inserts a fresh `mdxjsEsm` node at the top. Idempotent: names already
 * imported are a no-op.
 */
function injectControllerImports(
  tree: Root,
  controllerNames: ReadonlySet<string>
): void {
  if (controllerNames.size === 0) return;

  const existing = findExistingSophieImport(tree);
  if (!existing) {
    const importNode = buildImportEsmNode([...controllerNames]);
    tree.children.unshift(importNode as unknown as RootContent);
    return;
  }

  const union = new Set<string>([...existing.names, ...controllerNames]);
  if (union.size === existing.names.size) return;
  const sortedNames = [...union].sort();
  const newSpecifiers = sortedNames.map(buildImportSpecifier);
  // Cast through `unknown` to swap the ReadonlyArray-typed specifiers
  // field — the estree ImportDeclaration shape is mutable at runtime;
  // the structural type declares it readonly to discourage accidental
  // mutation elsewhere (mirrors `injectAutoImports`).
  (
    existing.decl as unknown as {
      specifiers: typeof newSpecifiers;
    }
  ).specifiers = newSpecifiers;
}

/**
 * Replace every compound-island parent (`<MCQ>`, …) in the tree with
 * its expansion, then self-inject the emitted controllers' import +
 * `client:load`. Idempotent: a second run finds no compound parents
 * (the first run consumed them into `<section>`s), so it's a no-op.
 */
export function expandCompoundIslands(tree: Root): void {
  const matches: Array<{
    parent: Parent;
    node: MdxJsxFlowElement;
    spec: CompoundIsland;
  }> = [];
  visit(tree, "mdxJsxFlowElement", (node, _index, parent) => {
    const el = node as MdxJsxFlowElement;
    const spec = el.name ? REGISTRY_BY_PARENT.get(el.name) : undefined;
    if (spec && parent) {
      matches.push({ parent: parent as Parent, node: el, spec });
    }
  });

  const injectedControllers = new Set<string>();
  for (const { parent, node, spec } of matches) {
    const i = parent.children.indexOf(node as RootContent);
    if (i < 0) continue;
    parent.children.splice(i, 1, expandIsland(node, spec) as RootContent);
    injectedControllers.add(spec.controllerName);
  }

  injectControllerImports(tree, injectedControllers);
}

export const sophieCompoundExpandRemarkPlugin: Plugin<[], Root> =
  () => (tree) => {
    expandCompoundIslands(tree);
  };
