import type { Parent, Root, RootContent } from "mdast";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
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
  jsxTextEl,
  readAttr,
} from "./_shared/jsx-attrs.ts";

/**
 * Compile-time expansion of compound authoring tags (`<MCQ>`,
 * `<MultiSelect>`, `<FillBlank>`) into static native form markup + a
 * childless controller island (`<MCQController>` /
 * `<MultiSelectController>` / `<FillBlankController>`). Authors write the
 * high-level member-access shape; this transform lowers it to accessible
 * SSR'd HTML plus a hydration-bearing controller that restores +
 * persists the student's input.
 *
 * Two structurally-distinct expansion paths:
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
 * `expandFillBlank` path below rather than a row here. `<Tabs>` rows
 * land in a later task once their controller exists (adding a row whose
 * controller component is absent would break the build, since the
 * self-injected `import` would resolve to nothing). The shape is kept
 * easy to extend: a new choice-based tag is one row + (if it needs a
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

/**
 * Slot-based FillBlank spec — the single-row counterpart to the
 * choice-based `COMPOUND_ISLANDS` registry. FillBlank has exactly one
 * shape, so this is a const rather than an array; if a second slot-based
 * tag ever ships, generalize to a registry then.
 */
const FILL_BLANK = {
  parent: "FillBlank",
  promptName: "FillBlank.Prompt",
  slotName: "FillBlank.Slot",
  controllerName: "FillBlankController",
  pedagogyRole: "fill-blank",
  heading: "Fill in the blank",
} as const;

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
 * True for a JSX node of EITHER flow or text variant — the two node
 * types a `<FillBlank.Slot>` can be (inline → text; block-authored →
 * flow). Used by the slot-replacement walk, which must transform both.
 */
function isJsxEl(node: unknown): node is MdxJsxFlowElement | MdxJsxTextElement {
  if (!node || typeof node !== "object") return false;
  const t = (node as { type?: string }).type;
  return t === "mdxJsxFlowElement" || t === "mdxJsxTextElement";
}

/**
 * Recursively rewrite a prompt-subtree node, replacing each inline
 * `<FillBlank.Slot id correct>` with an inline `<input type="text"
 * data-fb-slot data-slot-id aria-label>`. Returns the rewritten node;
 * mutates child arrays in place on container nodes. Throws on a
 * duplicate `slotId` within the FillBlank (naming the parent id).
 *
 * CRITICAL: the slot's `correct` answer is read for the duplicate-id
 * check ONLY — it is NEVER copied onto the emitted `<input>`. Leaking
 * the correct value into the rendered DOM would defeat the assessment.
 * The correct value reaches the pedagogy index via the extractor, which
 * reads the *authored* AST (this transform runs after it).
 *
 * All surrounding prose stays live so any nested islands in the prompt
 * (e.g. a `<GlossaryTerm>`) still hydrate normally.
 */
function rewriteSlots(
  node: unknown,
  parentId: string,
  seenSlotIds: Set<string>
): unknown {
  if (!node || typeof node !== "object") return node;
  if (isJsxEl(node) && node.name === FILL_BLANK.slotName) {
    const slotId = readAttr(node, "id") ?? "";
    if (seenSlotIds.has(slotId)) {
      throw new Error(
        `<FillBlank id="${parentId}"> has a duplicate slot id "${slotId}". Slot ids must be unique within a single <FillBlank>. Resolution: rename one <FillBlank.Slot id="…" />.`
      );
    }
    seenSlotIds.add(slotId);
    // Inline `<input>` (phrasing content) — must be a text element so it
    // nests cleanly inside the prompt's paragraph. `correct` is omitted
    // by construction.
    return jsxTextEl(
      "input",
      [
        attr("type", "text"),
        attr("data-fb-slot", null),
        attr("data-slot-id", slotId),
        attr("aria-label", `blank ${slotId}`),
      ],
      []
    );
  }
  const container = node as { children?: unknown };
  if (Array.isArray(container.children)) {
    container.children = container.children.map((child) =>
      rewriteSlots(child, parentId, seenSlotIds)
    );
  }
  return node;
}

/**
 * Expand one `<FillBlank>` into its static `<section>` + childless
 * `<FillBlankController>` island. Unlike the choice-based path, the body
 * is the TRANSFORMED PROMPT PROSE (slots → inline inputs), not a
 * fieldset. An empty prompt with zero slots is valid (emits the prose
 * with no inputs); AS-3 is the extractor/audit's job, not a transform
 * throw. Throws on a duplicate slot id, naming the parent id.
 */
function expandFillBlank(parent: MdxJsxFlowElement): MdxJsxFlowElement {
  const course = readAttr(parent, "course") ?? "";
  const unit = readAttr(parent, "unit") ?? "";
  const id = readAttr(parent, "id") ?? "";
  const labelId = `${id}-label`;

  const promptNodes: RootContent[] = [];
  const reveals: RootContent[] = [];
  const seenSlotIds = new Set<string>();

  for (const child of (parent.children as RootContent[]) ?? []) {
    if (!isFlow(child)) continue;
    if (child.name === FILL_BLANK.promptName) {
      for (const promptChild of (child.children as RootContent[]) ?? []) {
        promptNodes.push(
          rewriteSlots(promptChild, id, seenSlotIds) as RootContent
        );
      }
    } else if (child.name === "Solution" || child.name === "Hint") {
      reveals.push(child);
    }
  }

  return jsxFlowEl(
    "section",
    [
      attr("data-pedagogy-role", FILL_BLANK.pedagogyRole),
      attr("data-formative-anchor", id),
      attr("aria-labelledby", labelId),
    ],
    [
      jsxFlowEl(
        "h3",
        [attr("id", labelId)],
        [{ type: "text", value: FILL_BLANK.heading } as RootContent]
      ),
      ...promptNodes,
      jsxFlowEl(
        FILL_BLANK.controllerName,
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
 * One queued expansion: a choice-based island (carries its
 * `CompoundIsland` spec) or the slot-based FillBlank (`spec: null`,
 * dispatched to `expandFillBlank`). The discriminant keeps the two
 * structurally-distinct paths separate without contorting either.
 */
type ExpansionMatch = {
  parent: Parent;
  node: MdxJsxFlowElement;
  spec: CompoundIsland | null;
};

/**
 * Replace every compound-island parent (`<MCQ>`, `<MultiSelect>`,
 * `<FillBlank>`) in the tree with its expansion, then self-inject the
 * emitted controllers' import + `client:load`. Idempotent: a second run
 * finds no compound parents (the first run consumed them into
 * `<section>`s), so it's a no-op.
 */
export function expandCompoundIslands(tree: Root): void {
  const matches: ExpansionMatch[] = [];
  visit(tree, "mdxJsxFlowElement", (node, _index, parent) => {
    const el = node as MdxJsxFlowElement;
    if (!parent || !el.name) return;
    const spec = REGISTRY_BY_PARENT.get(el.name);
    if (spec) {
      matches.push({ parent: parent as Parent, node: el, spec });
    } else if (el.name === FILL_BLANK.parent) {
      matches.push({ parent: parent as Parent, node: el, spec: null });
    }
  });

  const injectedControllers = new Set<string>();
  for (const { parent, node, spec } of matches) {
    const i = parent.children.indexOf(node as RootContent);
    if (i < 0) continue;
    const expanded = spec ? expandIsland(node, spec) : expandFillBlank(node);
    parent.children.splice(i, 1, expanded as RootContent);
    injectedControllers.add(
      spec ? spec.controllerName : FILL_BLANK.controllerName
    );
  }

  injectControllerImports(tree, injectedControllers);
}

export const sophieCompoundExpandRemarkPlugin: Plugin<[], Root> =
  () => (tree) => {
    expandCompoundIslands(tree);
  };
