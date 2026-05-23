import { slugify } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { readStringAttr } from "../jsx-utils.ts";

/**
 * Walks an mdast tree and marks the first `<GlossaryTerm name="...">`
 * per slug per chapter with `data-first-use="true"`. Mutates the tree
 * in place; idempotent (re-running yields the same shape).
 *
 * The slug is derived via the same `slugify(name)` helper used by
 * `lookupDefinition()` in the runtime store, so build-time marks and
 * runtime lookups stay consistent. Different-cased name props
 * (`"Luminosity"`, `"luminosity"`, `"LUMINOSITY"`) collapse to one
 * dedup key.
 *
 * Consumed by `GlossaryTerm.tsx`, which renders an inline footnote
 * span when `data-first-use="true"` is present on its element. CSS in
 * `textbook-layout.css` reveals the span under `@media print`.
 */
export function markFirstUseGlossaryTerms(tree: Root, _unitId: string): void {
  const seenSlugs = new Set<string>();

  const visitor = (node: unknown) => {
    const el = node as {
      name?: string | null;
      attributes?: Array<{
        type: string;
        name: string;
        value: unknown;
      }>;
    };
    if (el.name !== "GlossaryTerm") return;
    const name = readStringAttr(el, "name");
    if (!name) return;
    const slug = slugify(name);
    if (seenSlugs.has(slug)) return;
    seenSlugs.add(slug);

    const attrs = el.attributes ?? [];
    if (attrs.some((a) => a.name === "data-first-use")) return;
    attrs.push({
      type: "mdxJsxAttribute",
      name: "data-first-use",
      value: "true",
    });
    el.attributes = attrs;
  };

  visit(tree, "mdxJsxFlowElement", visitor);
  visit(tree, "mdxJsxTextElement", visitor);
}
