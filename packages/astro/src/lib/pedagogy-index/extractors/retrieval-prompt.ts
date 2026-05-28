import type { RetrievalPromptEntry } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { type MdxJsxFlowElement, readStringAttr } from "../jsx-utils.ts";

/**
 * Pure extractor for `<RetrievalPrompt target="prefix:slug">` (Wedge B1).
 *
 * Walks an mdast tree, finds JSX elements named "RetrievalPrompt",
 * emits one RetrievalPromptEntry per match. Anchor is auto-generated
 * as `${artifactId}-rp-${counter}` (per-chapter sequential + Task 7
 * artifact-namespaced); the canonical prefix table lives at
 * `@sophie/core/schema/pedagogy-index.ts`.
 *
 * Missing required props (e.g., a bare `<RetrievalPrompt>` with no
 * `target=`) are silently skipped at the visit site; see the R7
 * disposition comment in the visitor for the rationale (TypeScript
 * prop-type check at the call site is the authoritative surface;
 * emitting a finding here would confuse mid-edit authors).
 *
 * Throws on intra-chapter anchor collisions (defense-in-depth,
 * mirrors the existing extractors' guards).
 */
export function extractRetrievalPrompts(
  tree: Root,
  unitId: string,
  artifactId: string
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
    const anchor = `${artifactId}-rp-${counter}`;
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
