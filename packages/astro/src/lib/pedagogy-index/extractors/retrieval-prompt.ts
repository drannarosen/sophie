import type { RetrievalPromptEntry } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { type MdxJsxFlowElement, readStringAttr } from "../jsx-utils.ts";

/**
 * Pure extractor for `<RetrievalPrompt target="prefix:slug">` (Wedge B1).
 *
 * Walks an mdast tree, finds JSX elements named "RetrievalPrompt",
 * emits one RetrievalPromptEntry per match. Anchor is auto-generated
 * as `rp-${counter}` (per-chapter sequential); the canonical prefix
 * table lives at `@sophie/core/schema/pedagogy-index.ts`.
 *
 * Skips elements with no `target` attribute (the curriculum-CI
 * RET-1 invariant flags the omission separately; the extractor's
 * job is to surface what's there, not to gate authoring).
 *
 * Throws on intra-chapter anchor collisions (defense-in-depth,
 * mirrors the existing extractors' guards).
 */
export function extractRetrievalPrompts(
  tree: Root,
  unitId: string
): RetrievalPromptEntry[] {
  const out: RetrievalPromptEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "RetrievalPrompt") return;

    const target = readStringAttr(el, "target");
    // R7 disposition: a `<RetrievalPrompt>` with no `target=` attribute
    // is malformed JSX — TypeScript prop-type check should flag it at
    // the call site (the prop is required per the component schema).
    // We silently skip here rather than emit a finding because the
    // finding would be confusing for an author who's mid-edit (no
    // target yet); the prop-type gate is the better surface for this
    // error.
    if (target === undefined) return;

    counter += 1;
    const anchor = `rp-${counter}`;
    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${unitId}": RetrievalPrompt anchor "${anchor}" generated twice.`
      );
    }
    seenAnchors.add(anchor);

    out.push({
      unit: unitId,
      anchor,
      target_id: target,
    });
  });

  return out;
}
