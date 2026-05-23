import {
  type OMIFlowEntry,
  type OMIFlowSlot,
  slugify,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  type MdxJsxFlowElement,
  readStringAttr,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

export type OMIFlowSlotKind = "observable" | "model" | "inference";

const SLOT_NAMES: Record<string, OMIFlowSlotKind> = {
  "OMIFlow.Observable": "observable",
  "OMIFlow.Model": "model",
  "OMIFlow.Inference": "inference",
};

const REQUIRED_SLOTS: ReadonlyArray<OMIFlowSlotKind> = [
  "observable",
  "model",
  "inference",
];

/**
 * Shared parse result for a single `<OMIFlow>` node — used by BOTH
 * `extractOMIFlows` (read-only index pass) and `transformOMIFlow`
 * (AST mutation pass) so the two phases agree on the slot payload
 * shape. Mirrors the `buildRepsFromMultiRepChildren` precedent from
 * ADR 0043's MultiRep family.
 *
 * `anchor` derivation:
 *   1. explicit `id=` attr (slugified) wins
 *   2. else `omi-${slug(concept)}` when `concept=` is present
 *   3. else positional fallback `omi-${counter}` (chapter-scoped)
 *
 * Counter must be provided by the caller and threaded across all
 * `<OMIFlow>` nodes within one chapter to make rule (3) chapter-
 * consistent. Use `parseOMIFlowChildren` via the caller-owned loop.
 */
export interface OMIFlowParseResult {
  anchor: string;
  concept: string | undefined;
  observable: OMIFlowSlot;
  model: OMIFlowSlot;
  inference: OMIFlowSlot;
  sourceOrder: [OMIFlowSlotKind, OMIFlowSlotKind, OMIFlowSlotKind];
}

/**
 * Pure parser for a single `<OMIFlow>` mdxJsxFlowElement. Throws on:
 *   - strict-3 invariant (missing required slot)
 *   - exactly-one invariant (duplicated slot)
 *
 * Anchor uniqueness (intra-chapter) is the caller's responsibility —
 * the caller owns the chapter's seenAnchors Set so the same throw
 * message can name the offending anchor.
 */
export function parseOMIFlowElement(
  el: MdxJsxFlowElement,
  unitId: string,
  anchor: string
): OMIFlowParseResult {
  const concept = readStringAttr(el, "concept");
  const sourceOrder: OMIFlowSlotKind[] = [];
  const slots: Partial<Record<OMIFlowSlotKind, OMIFlowSlot>> = {};

  for (const child of el.children ?? []) {
    const childEl = child as MdxJsxFlowElement;
    if (childEl.type !== "mdxJsxFlowElement") continue;
    const kind = childEl.name ? SLOT_NAMES[childEl.name] : undefined;
    if (kind === undefined) continue;
    if (slots[kind] !== undefined) {
      throw new Error(
        `OMIFlow "${anchor}" in chapter "${unitId}": slot "${kind}" appears more than once. (ADR 0063 exactly-one invariant.)`
      );
    }
    const title = readStringAttr(childEl, "title") ?? "";
    const body = renderChildrenToHtml(childEl.children);
    slots[kind] = { title, body };
    sourceOrder.push(kind);
  }

  for (const required of REQUIRED_SLOTS) {
    if (slots[required] === undefined) {
      throw new Error(
        `OMIFlow "${anchor}" in chapter "${unitId}": missing required slot "${required}". (ADR 0063 strict-3 invariant.)`
      );
    }
  }

  // Re-narrow after the loop's existence checks. Direct destructure
  // satisfies strict-null TypeScript without `!`.
  const observable = slots.observable;
  const model = slots.model;
  const inference = slots.inference;
  if (
    observable === undefined ||
    model === undefined ||
    inference === undefined
  ) {
    // Unreachable post-existence-check; explicit guard for strict-null.
    throw new Error(
      `OMIFlow "${anchor}": slot detection invariant violated post-check.`
    );
  }

  return {
    anchor,
    concept,
    observable,
    model,
    inference,
    sourceOrder: sourceOrder as [
      OMIFlowSlotKind,
      OMIFlowSlotKind,
      OMIFlowSlotKind,
    ],
  };
}

/**
 * Compute the canonical anchor for an `<OMIFlow>` element per
 * ADR 0063 §Decision 10. Counter is positional (1-based, chapter-
 * scoped); pass an incrementing counter from the caller.
 */
export function deriveOMIFlowAnchor(
  el: MdxJsxFlowElement,
  counter: number
): string {
  const explicitId = readStringAttr(el, "id");
  const concept = readStringAttr(el, "concept");
  if (explicitId) return slugify(explicitId);
  if (concept) return `omi-${slugify(concept)}`;
  return `omi-${counter}`;
}

/**
 * Pure extractor. Walks an mdast tree, emits one OMIFlowEntry per
 * `<OMIFlow>` flow element. Per ADR 0063:
 *
 *   - Strict-3-slot invariant: each <OMIFlow> MUST contain exactly
 *     one of each slot kind (observable / model / inference).
 *     Throws on missing or duplicated slots.
 *   - Slot-name binds role: <OMIFlow.Observable> → observable.
 *   - Source-order tolerance: any source order accepted; entry
 *     records the as-authored order in `sourceOrder` for OF-1.
 *   - Anchor precedence: id > slug(concept) > omi-${counter}.
 *   - Intra-chapter anchor collision throw.
 */
export function extractOMIFlows(tree: Root, unitId: string): OMIFlowEntry[] {
  const out: OMIFlowEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "OMIFlow") return;

    counter += 1;
    const anchor = deriveOMIFlowAnchor(el, counter);

    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${unitId}": OMIFlow anchor "${anchor}" generated by more than one source. (ADR 0063 anchor invariant.)`
      );
    }
    seenAnchors.add(anchor);

    const parsed = parseOMIFlowElement(el, unitId, anchor);

    out.push({
      unit: unitId,
      anchor: parsed.anchor,
      ...(parsed.concept ? { concept: parsed.concept } : {}),
      observable: parsed.observable,
      model: parsed.model,
      inference: parsed.inference,
      sourceOrder: parsed.sourceOrder,
    });
  });

  return out;
}
