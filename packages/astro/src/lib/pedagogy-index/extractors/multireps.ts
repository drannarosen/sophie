import type {
  InlineRefUsageEntry,
  MultiRepIndexEntry,
  SerializedRep,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  isWhitespaceTextNode,
  type MdxJsxFlowElement,
  readStringAttr,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

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
export function buildRepsFromMultiRepChildren(
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
 * Result of one read-only `extractMultiReps` pass: the parsed
 * MultiRep entries + any `InlineRefUsageEntry` records emitted for
 * the MultiRep's `<RepFigure>` and `<RepEquation>` children.
 *
 * Why the side-channel emission ([issue #191](https://github.com/drannarosen/sophie/issues/191)):
 * before WS B+D, F4 (orphan figure) and the R-series equation-
 * citation invariants only saw `<Figure>`, `<FigureRef>`,
 * `<KeyEquation>`, and `<EquationRef>` callsites. Figures/equations
 * referenced ONLY from a `<MultiRep>` binding were therefore flagged
 * as orphans even though they were genuinely used. By emitting one
 * `InlineRefUsageEntry { kind: "rep-figure" | "rep-equation" }` per
 * Rep child the MultiRep extractor walks, MultiRep-only references
 * become first-class index-layer citations and F4 / R-series stop
 * false-positiving — without those invariants needing to know about
 * MultiRep's internal shape (per AGENTS.md "structural fixes over
 * targeted patches").
 */
export interface MultiRepExtractionResult {
  entries: MultiRepIndexEntry[];
  inlineRefUsages: InlineRefUsageEntry[];
}

/**
 * Pure extractor. Walks the mdast tree for `mdxJsxFlowElement` nodes
 * named `MultiRep`. For each match, validates the `concept` attr and
 * builds a `MultiRepIndexEntry` with the serialized rep payloads.
 * Additionally emits one `InlineRefUsageEntry` per `<RepFigure>` /
 * `<RepEquation>` child so MultiRep references count toward the
 * figure-usage and equation-citation audits (#191, WS B+D).
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
  unitId: string
): MultiRepExtractionResult {
  const out: MultiRepIndexEntry[] = [];
  const inlineRefUsages: InlineRefUsageEntry[] = [];
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
        `<MultiRep> in chapter "${unitId}" is missing a non-empty \`concept\` attr.`
      );
    }
    const id = readStringAttr(parent, "id") ?? `mr-${concept}`;
    if (seenIds.has(id)) {
      throw new Error(
        `<MultiRep> id collision in chapter "${unitId}": two bindings share anchor "${id}" (latest concept: "${concept}"). Resolution: set explicit \`id\` props to disambiguate, or consolidate into one <MultiRep> block.`
      );
    }
    seenIds.add(id);
    const layoutRaw = readStringAttr(parent, "layout");
    const layout =
      layoutRaw === "grid" || layoutRaw === "stack" ? layoutRaw : undefined;

    const reps = buildRepsFromMultiRepChildren(
      parent,
      `<MultiRep concept="${concept}"> in chapter "${unitId}"`
    );

    if (reps.length === 0) {
      throw new Error(
        `<MultiRep concept="${concept}"> in chapter "${unitId}" has no Rep children. An empty MultiRep is a content bug.`
      );
    }

    const entry: MultiRepIndexEntry = {
      concept,
      id,
      unit: unitId,
      reps,
      ...(layout ? { layout } : {}),
    };
    out.push(entry);

    // #191 — emit InlineRefUsageEntry per Rep child so F4 / R-series
    // see MultiRep references as first-class citations. `reps` was
    // produced by `buildRepsFromMultiRepChildren` above which already
    // validated the refKey/refName presence; here we just thread them
    // through to the audit-visible collection.
    for (const rep of reps) {
      if (rep.kind === "figure") {
        inlineRefUsages.push({
          kind: "rep-figure",
          refKey: rep.refName,
          unit: unitId,
        });
      } else if (rep.kind === "equation") {
        inlineRefUsages.push({
          kind: "rep-equation",
          refKey: rep.refKey,
          unit: unitId,
        });
      }
    }
  });

  return { entries: out, inlineRefUsages };
}
