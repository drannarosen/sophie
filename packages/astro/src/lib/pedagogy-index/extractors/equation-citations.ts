import { type EquationCitationEntry, slugify } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  type MdxJsxFlowElement,
  readStringAttr,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

/**
 * Pure chapter walker per ADR 0060. Walks an mdast tree for
 * `<KeyEquation refId="X" />` callsites; returns one
 * `EquationCitationEntry` per callsite with extractor-assigned per-
 * chapter `number` (1-indexed, source order). Optional children render
 * to `framingHtml` for chapter-specific framing prose; absent children
 * → `framingHtml` is unset.
 *
 * Throws when:
 *   - A `<KeyEquation>` is missing the `refId` attr (the registry
 *     contract requires a target id).
 */
export function extractEquationCitations(
  tree: Root,
  chapterSlug: string,
  chapterNumber?: number
): EquationCitationEntry[] {
  const out: EquationCitationEntry[] = [];
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "KeyEquation") return;

    const refId = readStringAttr(el, "refId");
    if (!refId) {
      throw new Error(
        `<KeyEquation> in chapter "${chapterSlug}" is missing a non-empty \`refId\` attr. Post-ADR-0060, every chapter-side <KeyEquation> must cite a registry entry via \`refId\`.`
      );
    }

    counter += 1;
    const framingHtml = renderChildrenToHtml(el.children).trim();
    const anchor = `${slugify(refId)}-citation-${counter}`;
    out.push({
      chapter: chapterSlug,
      refId: slugify(refId),
      anchor,
      number: counter,
      ...(chapterNumber !== undefined ? { chapterNumber } : {}),
      ...(framingHtml.length > 0 ? { framingHtml } : {}),
    });
  });

  return out;
}
