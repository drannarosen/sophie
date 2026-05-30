import { slugify } from "@sophie/core/schema";
import type { RootContent } from "mdast";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { attr, jsxFlowEl, jsxTextEl, readAttr } from "./_shared/jsx-attrs.ts";

/**
 * The two structurally-distinct, non-choice expansion paths split out of
 * `compound-expand.ts` (ADR 0061 focused-files): slot-based `<FillBlank>`
 * (`expandFillBlank`) and chrome `<Tabs>` (`expandTabs`). Both differ
 * enough from the choice-based fieldset path (`expandIsland`, which stays
 * with the registry in the main file) that they have their own
 * expanders rather than a contorted reuse (W2). The dispatcher
 * `expandCompoundIslands` in the main file routes to these.
 */

export const isFlow = (node: RootContent): node is MdxJsxFlowElement =>
  node.type === "mdxJsxFlowElement";

/**
 * Slot-based FillBlank spec — the single-row counterpart to the
 * choice-based `COMPOUND_ISLANDS` registry. FillBlank has exactly one
 * shape, so this is a const rather than an array; if a second slot-based
 * tag ever ships, generalize to a registry then.
 */
export const FILL_BLANK = {
  parent: "FillBlank",
  promptName: "FillBlank.Prompt",
  slotName: "FillBlank.Slot",
  controllerName: "FillBlankController",
  pedagogyRole: "fill-blank",
  heading: "Fill in the blank",
} as const;

/**
 * Tabs spec — chrome (NOT a formative parent). Single-row counterpart to
 * `FILL_BLANK`. Authored `<Tabs><Tab label="X">body</Tab>…</Tabs>` becomes
 * an ARIA-tabs `<div data-sophie-tabs>` of `<button role="tab">` triggers
 * over sibling `<div role="tabpanel">` bodies + a `<TabsController>`
 * island. NO `course`/`unit`/`id` namespace and NO persistence — Tabs is
 * ephemeral view state. Tab is intentionally standalone (not member-
 * access `Tabs.Tab`): the transform reads `child.name === "Tab"`.
 */
export const TABS = {
  parent: "Tabs",
  childName: "Tab",
  controllerName: "TabsController",
} as const;

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
export function expandFillBlank(parent: MdxJsxFlowElement): MdxJsxFlowElement {
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
 * Expand one `<Tabs>` into its static ARIA-tabs structure + childless
 * `<TabsController>` island. Throws on a duplicate tab slug (derived
 * from `label`), naming the parent so the author can disambiguate.
 *
 * `tabsId` is resolved up the stack (`expandCompoundIslands`) so the
 * auto-id counter is stable across the entire tree visit; we accept it
 * here as a parameter. `defaultLabel` (when present) → slug; else the
 * first tab is the default. The default tab carries
 * `aria-selected="true"` + `tabindex="0"` and its panel omits `hidden`;
 * the rest carry `aria-selected="false"` + `tabindex="-1"` and their
 * panels carry `hidden` (native HTML `hidden` attribute, not
 * CSS-driven). Roving focus + automatic activation are wired by the
 * controller on hydration; the static markup is fully usable without
 * JS (the default tab's panel is visible, the rest are hidden).
 *
 * NO landmark element. `<Tabs>` lives inside the chapter `<main>`; per
 * R10, components nested under a parent landmark must not introduce
 * another. A plain `<div data-sophie-tabs>` is correct (not `<section>`
 * / `<article>` / `<main>`).
 *
 * Tab panel bodies stay LIVE (the transform never serializes them),
 * so nested islands inside a tab body hydrate normally.
 */
export function expandTabs(
  parent: MdxJsxFlowElement,
  tabsId: string
): MdxJsxFlowElement {
  const defaultLabel = readAttr(parent, "defaultLabel");

  const tabs: { slug: string; label: string; body: RootContent[] }[] = [];
  const seenSlugs = new Set<string>();

  for (const child of (parent.children as RootContent[]) ?? []) {
    if (!isFlow(child)) continue;
    if (child.name !== TABS.childName) continue;
    const label = readAttr(child, "label") ?? "";
    // `label` is a string attribute (not children), so plain `slugify` —
    // `choiceSlug` operates on a node's body (math/inlineMath leaves) and
    // doesn't apply here.
    const slug = slugify(label);
    if (seenSlugs.has(slug)) {
      throw new Error(
        `<Tabs id="${tabsId}"> has a duplicate tab slug "${slug}" (derived from label "${label}"). Two tabs cannot slugify to the same value. Resolution: rename one <Tab label="…">.`
      );
    }
    seenSlugs.add(slug);
    tabs.push({
      slug,
      label,
      body: (child.children as RootContent[]) ?? [],
    });
  }

  // Default selection: explicit `defaultLabel` → slug, else first tab.
  // When `defaultLabel` is set but doesn't match any tab, no tab is
  // marked default — the controller's first-mount pass still has
  // `aria-selected="true"` on zero tabs, which is the loudly-broken
  // shape the author should fix (mirrors the old component's behavior:
  // Radix Tabs renders an empty trigger bar when defaultValue is
  // unknown).
  const defaultSlug =
    defaultLabel !== undefined ? slugify(defaultLabel) : tabs[0]?.slug;

  const tabButtons: RootContent[] = tabs.map(({ slug, label }) => {
    const isDefault = slug === defaultSlug;
    return jsxFlowEl(
      "button",
      [
        attr("type", "button"),
        attr("role", "tab"),
        attr("id", `${tabsId}-tab-${slug}`),
        attr("aria-controls", `${tabsId}-panel-${slug}`),
        attr("aria-selected", isDefault ? "true" : "false"),
        attr("tabindex", isDefault ? "0" : "-1"),
      ],
      [{ type: "text", value: label } as RootContent]
    );
  });

  const tabPanels: RootContent[] = tabs.map(({ slug, body }) => {
    const isDefault = slug === defaultSlug;
    const panelAttrs = [
      attr("role", "tabpanel"),
      attr("id", `${tabsId}-panel-${slug}`),
      attr("aria-labelledby", `${tabsId}-tab-${slug}`),
    ];
    if (!isDefault) panelAttrs.push(attr("hidden", null));
    return jsxFlowEl("div", panelAttrs, body);
  });

  return jsxFlowEl(
    "div",
    [attr("data-sophie-tabs", null), attr("data-tabs-id", tabsId)],
    [
      jsxFlowEl(
        "div",
        [attr("role", "tablist"), attr("aria-label", "Tabs")],
        tabButtons
      ),
      ...tabPanels,
      jsxFlowEl(
        TABS.controllerName,
        [attr("id", tabsId), attr("client:load", null)],
        []
      ),
    ]
  );
}
