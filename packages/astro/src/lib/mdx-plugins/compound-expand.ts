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
import {
  expandFillBlank,
  expandTabs,
  FILL_BLANK,
  isFlow,
  TABS,
} from "./compound-expand.islands.ts";

/**
 * Compile-time expansion of compound authoring tags (`<MCQ>`,
 * `<MultiSelect>`, `<FillBlank>`, `<Tabs>`) into static native form +
 * ARIA-tabs markup + a childless controller island (`<MCQController>` /
 * `<MultiSelectController>` / `<FillBlankController>` / `<TabsController>`).
 * Authors write the high-level shape; this transform lowers it to
 * accessible SSR'd HTML plus a hydration-bearing controller that
 * restores + persists the student's input (formative parents) or wires
 * keyboard + ARIA-tabs selection (chrome `<Tabs>`).
 *
 * Three structurally-distinct expansion paths:
 *
 *  - **Choice-based** (`<MCQ>` / `<MultiSelect>` — `expandIsland`): a
 *    `<fieldset>` of `<label><input>` pairs (`radiogroup` for
 *    single-select MCQ, a plain group for multi-select). The correct
 *    choice(s) carry a static `data-correct` attribute (CSS reveal; v1
 *    does not auto-grade).
 *  - **Slot-based** (`<FillBlank>` — `expandFillBlank`): the transformed
 *    PROMPT PROSE with each inline `<FillBlank.Slot>` replaced by an
 *    inline `<input type="text" data-fb-slot data-slot-id>`. FillBlank
 *    has no fieldset/choices — it's inline blanks inside prose — so it
 *    cannot reuse the choice-based path. CRITICAL: the slot's `correct`
 *    answer is NEVER emitted into the DOM (it would leak to students);
 *    the correct value lives only in the pedagogy index (the extractor
 *    reads it from the authored AST).
 *  - **Tabs** (`<Tabs>` — `expandTabs`): an ARIA-tabs `<div role>` of
 *    `<button role="tab">` triggers + sibling `<div role="tabpanel">`
 *    bodies. Chrome, not pedagogy — no `course`/`unit`/`id` namespace,
 *    no AS audit, no persistence (selection resets per page load). Tabs
 *    structurally differs from the formative parents (separate buttons +
 *    panels, not label-wrapped inputs), so it has its own path rather
 *    than a contorted reuse of `expandIsland` (W2).
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
 * One row per CHOICE-BASED compound authoring tag. Maps the parent name
 * to the child names + emitted controller + native control type +
 * visible heading. **Active registry is MCQ + MultiSelect.** FillBlank
 * is deliberately ABSENT — it is slot-based (inline blanks in prose, no
 * fieldset/choices), so it has its own `FILL_BLANK` spec +
 * `expandFillBlank` path below rather than a row here. `<Tabs>` is also
 * absent — it is structurally distinct (buttons + sibling panels, no
 * fieldset/choices) and has its own `TABS` spec + `expandTabs` path. The
 * shape is kept easy to extend: a new choice-based tag is one row + (if
 * it needs a new native control) one branch in `expandIsland`'s
 * control-type handling.
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
      // `data-choice-input` marks this as a formative choice control for
      // the `rehypeChoiceSpeech` rehype plugin (math-only choices get an
      // explicit SRE `aria-label` there). An explicit marker is robust:
      // it's decoupled from the `name`-prefix scheme and distinguishes
      // choices from FillBlank's `data-fb-slot` text inputs. Adding it
      // here is a sync attribute emission — the transform stays sync.
      const inputAttrs = [
        attr("type", spec.controlType),
        attr("name", `${spec.parent.toLowerCase()}-${id}`),
        attr("value", slug),
        attr("id", `${id}-${slug}`),
        attr("data-choice-input", null),
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
 * One queued expansion. The `kind` discriminant routes to the matching
 * `expand*` path:
 *
 *  - `"choice"` — `<MCQ>` / `<MultiSelect>` (carries its `CompoundIsland`
 *    spec; dispatched to `expandIsland`).
 *  - `"fillBlank"` — slot-based `<FillBlank>` (dispatched to
 *    `expandFillBlank`).
 *  - `"tabs"` — `<Tabs>` (dispatched to `expandTabs`; carries the
 *    auto-generated `tabsId` resolved up the stack).
 */
type ExpansionMatch =
  | {
      kind: "choice";
      parent: Parent;
      node: MdxJsxFlowElement;
      spec: CompoundIsland;
    }
  | { kind: "fillBlank"; parent: Parent; node: MdxJsxFlowElement }
  | { kind: "tabs"; parent: Parent; node: MdxJsxFlowElement; tabsId: string };

/**
 * Replace every compound-island parent (`<MCQ>`, `<MultiSelect>`,
 * `<FillBlank>`, `<Tabs>`) in the tree with its expansion, then self-
 * inject the emitted controllers' import + `client:load`. Idempotent: a
 * second run finds no compound parents (the first run consumed them
 * into `<section>` / `<div data-sophie-tabs>`s), so it's a no-op.
 *
 * **Tabs auto-id.** Each `<Tabs>` gets a stable id when the author
 * omitted one: `sophie-tabs-${N}`, where N counts `<Tabs>` occurrences
 * in document order, 1-indexed. The counter is function-local: each
 * MDX file (or HMR re-run) starts a fresh `expandCompoundIslands`
 * call with N=0, so ids are per-file deterministic and never collide
 * across files. Same input AST → same ids on every build. Idempotency
 * holds because a second visit finds zero `<Tabs>` left to count
 * (they were already lowered to `<div data-sophie-tabs>`). Authored
 * ids do not advance the counter — it is consumed lazily, only when
 * `id` is absent, so explicit ids never cause auto-ids to skip numbers.
 */
export function expandCompoundIslands(tree: Root): void {
  const matches: ExpansionMatch[] = [];
  let tabsAutoIdCounter = 0;
  visit(tree, "mdxJsxFlowElement", (node, _index, parent) => {
    const el = node as MdxJsxFlowElement;
    if (!parent || !el.name) return;
    const spec = REGISTRY_BY_PARENT.get(el.name);
    if (spec) {
      matches.push({
        kind: "choice",
        parent: parent as Parent,
        node: el,
        spec,
      });
    } else if (el.name === FILL_BLANK.parent) {
      matches.push({ kind: "fillBlank", parent: parent as Parent, node: el });
    } else if (el.name === TABS.parent) {
      const authoredId = readAttr(el, "id");
      const tabsId =
        authoredId !== undefined && authoredId !== ""
          ? authoredId
          : `sophie-tabs-${++tabsAutoIdCounter}`;
      matches.push({
        kind: "tabs",
        parent: parent as Parent,
        node: el,
        tabsId,
      });
    }
  });

  const injectedControllers = new Set<string>();
  for (const match of matches) {
    const { parent, node } = match;
    const i = parent.children.indexOf(node as RootContent);
    if (i < 0) continue;
    let expanded: MdxJsxFlowElement;
    let controllerName: string;
    if (match.kind === "choice") {
      expanded = expandIsland(node, match.spec);
      controllerName = match.spec.controllerName;
    } else if (match.kind === "fillBlank") {
      expanded = expandFillBlank(node);
      controllerName = FILL_BLANK.controllerName;
    } else {
      expanded = expandTabs(node, match.tabsId);
      controllerName = TABS.controllerName;
    }
    parent.children.splice(i, 1, expanded as RootContent);
    injectedControllers.add(controllerName);
  }

  injectControllerImports(tree, injectedControllers);
}

export const sophieCompoundExpandRemarkPlugin: Plugin<[], Root> =
  () => (tree) => {
    expandCompoundIslands(tree);
  };
