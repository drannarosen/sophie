import type { SkillReviewEntry } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { type MdxJsxFlowElement, readStringAttr } from "../jsx-utils.ts";

/**
 * Whether the SkillReview node has both <SkillReview.Prompt> and
 * <SkillReview.Answer> children — the B1 "explicit content" path.
 * MDX surfaces compound-component children as nested
 * `mdxJsxFlowElement`s whose `name` is the dotted form
 * (e.g., "SkillReview.Prompt"). When MDX 3+ normalizes this to a
 * member-expression node, the equality check still holds because
 * the runtime stringifies the JSX name back to the same form before
 * the extractor walks the tree.
 */
function hasExplicitSlots(el: MdxJsxFlowElement): boolean {
  let sawPrompt = false;
  let sawAnswer = false;
  for (const child of el.children ?? []) {
    if (
      typeof child === "object" &&
      child !== null &&
      "type" in child &&
      (child as { type?: string }).type === "mdxJsxFlowElement"
    ) {
      const name = (child as { name?: string | null }).name ?? null;
      if (name === "SkillReview.Prompt") sawPrompt = true;
      else if (name === "SkillReview.Answer") sawAnswer = true;
    }
  }
  return sawPrompt && sawAnswer;
}

/**
 * Pure extractor for `<SkillReview target="prefix:slug">` (Wedge B1).
 *
 * Walks an mdast tree, finds JSX elements named "SkillReview",
 * emits one SkillReviewEntry per match. Anchor is auto-generated as
 * `sk-${counter}` per chapter. `has_explicit_content` is true iff
 * the SkillReview has both `<SkillReview.Prompt>` and
 * `<SkillReview.Answer>` children (B1 explicit path); false otherwise
 * (placeholder fallback path until Wedge C registry-resolution ships).
 *
 * Missing required props (e.g., a bare `<SkillReview>` with no
 * `target=`) are silently skipped at the visit site; see the R7
 * disposition comment in the visitor for the rationale (TypeScript
 * prop-type check at the call site is the authoritative surface;
 * emitting a finding here would confuse mid-edit authors).
 *
 * Throws on intra-chapter anchor collisions.
 */
export function extractSkillReviews(
  tree: Root,
  unitId: string
): SkillReviewEntry[] {
  const out: SkillReviewEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "SkillReview") return;

    const target = readStringAttr(el, "target");
    // R7 disposition: a `<SkillReview>` with no `target=` attribute is
    // malformed JSX — TypeScript prop-type check should flag it at the
    // call site (the prop is required per the component schema). We
    // silently skip here rather than emit a finding because the finding
    // would be confusing for an author who's mid-edit (no target yet);
    // the prop-type gate is the better surface for this error.
    if (target === undefined) return;

    counter += 1;
    const anchor = `sk-${counter}`;
    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${unitId}": SkillReview anchor "${anchor}" generated twice.`
      );
    }
    seenAnchors.add(anchor);

    out.push({
      unit: unitId,
      anchor,
      target_id: target,
      has_explicit_content: hasExplicitSlots(el),
    });
  });

  return out;
}
