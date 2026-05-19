import { type ObjectiveEntry, slugify } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  type MdxJsxFlowElement,
  readObjectiveAttributes,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

/**
 * Pure extractor. Walks an mdast tree for `<LearningObjectives>` flow
 * elements; for each, walks its direct children for `<Objective>` flow
 * elements. Returns one `ObjectiveEntry` per `<Objective>` match.
 *
 * Anchor convention: `lo-${id}` (passthrough). The `id` prop is
 * author-supplied and persists across edits — never auto-generated.
 *
 * Throws when:
 *   - An `<Objective>` is missing a non-empty `id` prop.
 *   - An `<Objective>` is missing a non-empty `verb` prop.
 *   - An `<Objective>` body renders to an empty / whitespace-only HTML
 *     string.
 *   - Two `<Objective>`s within the same chapter share an `id` (O1
 *     invariant — duplicate-id-within-chapter).
 *
 * Bare `<Objective>` elements outside a `<LearningObjectives>` parent
 * are ignored (not authoring-sanctioned shape).
 */
export function extractObjectives(
  tree: Root,
  chapterSlug: string
): ObjectiveEntry[] {
  const out: ObjectiveEntry[] = [];
  const seenIds = new Set<string>();

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const parent = node as MdxJsxFlowElement;
    if (parent.name !== "LearningObjectives") return;

    for (const child of parent.children) {
      const el = child as MdxJsxFlowElement;
      if (
        !el ||
        typeof el !== "object" ||
        el.type !== "mdxJsxFlowElement" ||
        el.name !== "Objective"
      ) {
        continue;
      }

      const attrs = readObjectiveAttributes(el);
      const id = attrs.id?.trim();
      const verb = attrs.verb?.trim();

      if (!id) {
        throw new Error(
          `<Objective> in chapter "${chapterSlug}" is missing a non-empty \`id\`.`
        );
      }
      if (!verb) {
        throw new Error(
          `<Objective id="${id}"> in chapter "${chapterSlug}" is missing a non-empty \`verb\`.`
        );
      }

      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `<Objective id="${id}"> in chapter "${chapterSlug}" has an empty body. Resolution: add objective text between the opening and closing tags.`
        );
      }

      if (seenIds.has(id)) {
        throw new Error(
          `O1 invariant: duplicate <Objective id="${id}"> within chapter "${chapterSlug}". Resolution: change one of the \`id\` props.`
        );
      }
      seenIds.add(id);

      out.push({
        id,
        verb,
        body,
        chapter: chapterSlug,
        anchor: `lo-${slugify(id)}`,
      });
    }
  });

  return out;
}
