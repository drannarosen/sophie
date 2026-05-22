import type { SpacedReviewEntry } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { type MdxJsxFlowElement, readStringAttr } from "../jsx-utils.ts";

const DEFAULT_MAX = 3;

/**
 * Read a numeric JSX attribute carrying a JS-expression value like
 * `max={5}`. mdast surfaces these as `mdxJsxAttributeValueExpression`
 * with the raw source text on `attr.value.value`. Returns the parsed
 * integer or undefined when absent / non-integer.
 */
function readIntegerAttr(
  node: MdxJsxFlowElement,
  name: string
): number | undefined {
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name !== name) continue;
    // `max="5"` (string-valued) also works.
    if (typeof attr.value === "string") {
      const parsed = Number.parseInt(attr.value, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (attr.value && typeof attr.value === "object") {
      const v = attr.value as { type?: string; value?: unknown };
      if (
        v.type === "mdxJsxAttributeValueExpression" &&
        typeof v.value === "string"
      ) {
        const parsed = Number.parseInt(v.value, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
    }
  }
  return undefined;
}

/**
 * Pure extractor for `<SpacedReview target|section max=N>` (Wedge B1).
 *
 * Walks an mdast tree, finds JSX elements named "SpacedReview",
 * emits one SpacedReviewEntry per match. Anchor is auto-generated as
 * `sp-${counter}` per chapter. `max` defaults to the component's
 * DEFAULT_MAX (3) when the attribute is absent.
 *
 * Skips elements that satisfy neither `target` nor `section`
 * (Zod refine in SpacedReviewPropsSchema catches that at the runtime
 * + extractor boundary; SR-1 invariant flags malformed refs).
 *
 * Throws on intra-chapter anchor collisions.
 */
export function extractSpacedReviews(
  tree: Root,
  chapterSlug: string
): SpacedReviewEntry[] {
  const out: SpacedReviewEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "SpacedReview") return;

    const target = readStringAttr(el, "target");
    const section = readStringAttr(el, "section");
    // Exactly-one rule: skip when both or neither (Zod refine catches
    // this at the schema layer; SR-1 audit invariant surfaces the
    // finding).
    const hasTarget = target !== undefined;
    const hasSection = section !== undefined;
    if (hasTarget === hasSection) return;

    const max = readIntegerAttr(el, "max") ?? DEFAULT_MAX;

    counter += 1;
    const anchor = `sp-${counter}`;
    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${chapterSlug}": SpacedReview anchor "${anchor}" generated twice.`
      );
    }
    seenAnchors.add(anchor);

    out.push({
      chapter: chapterSlug,
      anchor,
      ...(hasTarget ? { target_id: target } : { section_id: section }),
      max,
    });
  });

  return out;
}
