import { slugify } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { type MdxJsxFlowElement, readStringAttr } from "../jsx-utils.ts";

/**
 * Mutates `<Intervention>` JSX flow elements by injecting
 * `id={anchor}` so the rendered React `<aside>` carries the same
 * anchor the pedagogy-index entry stores — hash navigation
 * (`#intervention-contrasting-cases-1`) lands on the rendered DOM
 * and the component's `:target` outline activates.
 *
 * Numbering MUST match `extractInterventions` (same JSX-DFS order +
 * same `intervention-${slug(type|name)}-${idx}` template) so the
 * two passes produce identical anchors. Author-supplied explicit
 * `id` is rejected by `extractInterventions` upfront (the extractor
 * is the sole source of intervention anchors per the I1 review),
 * so this pass never encounters one in well-formed input. The
 * defensive `if (existing id) skip` guard catches the case where a
 * future ADR re-opens author authoring; today it's dead code by
 * construction but cheap to keep.
 *
 * Throws on missing `type` (symmetry with `transformMultiRep` — a
 * malformed JSX node that somehow escaped `extractInterventions`
 * should surface here rather than silently desynchronize the idx
 * counter from extract's).
 */
export function transformIntervention(tree: Root, chapterSlug: string): void {
  let idx = 0;
  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement & {
      attributes: Array<{ type: string; name: string; value: unknown }>;
    };
    if (el.name !== "Intervention") return;

    const type = readStringAttr(el, "type");
    if (!type) {
      throw new Error(
        `transform: <Intervention> in chapter "${chapterSlug}" is missing a non-empty \`type\` attr (extract should have caught this — file a bug).`
      );
    }
    const name = readStringAttr(el, "name");
    idx += 1;
    const typeOrNameSlug =
      type === "custom" && name ? slugify(name) : slugify(type);
    const anchor = `intervention-${typeOrNameSlug}-${idx}`;

    const existingId = el.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "id"
    );
    if (existingId) return;

    el.attributes.push({
      type: "mdxJsxAttribute",
      name: "id",
      value: anchor,
    });
  });
}
