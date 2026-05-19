import { valueToEstree } from "estree-util-value-to-estree";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  isWhitespaceTextNode,
  type MdxJsxFlowElement,
  readObjectiveAttributes,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

/**
 * Walks `<LearningObjectives>` JSX flow elements in the mdast tree.
 * For each, harvests `<Objective>` children into a JS array, then
 * mutates the parent node: clears children, appends an `objectives`
 * attribute holding the serialized array.
 *
 * Runs AFTER `extractObjectives` (which validates and harvests as a
 * read-only pass). Uses the same `readObjectiveAttributes` +
 * `renderChildrenToHtml` helpers as `extractObjectives` — single
 * source of truth for body serialization.
 *
 * Throws on:
 *   - Empty `<LearningObjectives>` block (no `<Objective>` children)
 *   - Non-`<Objective>` JSX flow children of `<LearningObjectives>`
 *   - Missing or empty `id` / `verb` / `body` on any `<Objective>`
 *   - Duplicate `<Objective id="...">` within one `<LearningObjectives>`
 *
 * The transform pattern is the durable answer for any future
 * `<Parent><Child>` source-component pair. See the design doc's
 * §10 "Pattern precedent" for codified guidance.
 */
export function transformLearningObjectives(
  tree: Root,
  chapterSlug: string
): void {
  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const parent = node as MdxJsxFlowElement & {
      attributes: Array<{
        type: string;
        name: string;
        value:
          | string
          | boolean
          | null
          | {
              type: string;
              value: string;
              data?: { estree?: unknown };
            };
      }>;
      children: Array<unknown>;
    };
    if (parent.name !== "LearningObjectives") return;

    const items: Array<{ id: string; verb: string; body: string }> = [];
    const seenIds = new Set<string>();

    for (const child of parent.children) {
      // mdast emits whitespace-only text nodes between JSX siblings for
      // source like `<Parent>\n  <Child>`; these carry no semantic
      // content and must not trip the "non-Objective child" check.
      if (isWhitespaceTextNode(child)) continue;

      const el = child as MdxJsxFlowElement;
      if (!el || typeof el !== "object" || el.type !== "mdxJsxFlowElement") {
        throw new Error(
          `transform: <LearningObjectives> in chapter "${chapterSlug}" contains a non-JSX child. Only <Objective> JSX flow elements are allowed.`
        );
      }
      if (el.name !== "Objective") {
        throw new Error(
          `transform: <LearningObjectives> in chapter "${chapterSlug}" contains an unexpected child <${el.name}>. Only <Objective> children are allowed.`
        );
      }

      const attrs = readObjectiveAttributes(el);
      const id = attrs.id?.trim();
      const verb = attrs.verb?.trim();
      if (!id) {
        throw new Error(
          `transform: <Objective> in chapter "${chapterSlug}" is missing a non-empty \`id\`.`
        );
      }
      if (!verb) {
        throw new Error(
          `transform: <Objective id="${id}"> in chapter "${chapterSlug}" is missing a non-empty \`verb\`.`
        );
      }
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <Objective id="${id}"> in chapter "${chapterSlug}" has an empty body.`
        );
      }
      if (seenIds.has(id)) {
        throw new Error(
          `transform O1: duplicate <Objective id="${id}"> within one <LearningObjectives> in chapter "${chapterSlug}".`
        );
      }
      seenIds.add(id);
      items.push({ id, verb, body });
    }

    if (items.length === 0) {
      throw new Error(
        `transform: <LearningObjectives> in chapter "${chapterSlug}" has no <Objective> children. An empty LO block is a content bug.`
      );
    }

    parent.children = [];
    // The downstream mdast→hast→estree lowering pass (`hast-util-to-estree`)
    // reads `value.data.estree` — an ESTree `Program` node — and ignores
    // the string `value` field when lowering JSX attribute expressions.
    // Pushing only the JSON.stringify'd string produces an attribute that
    // compiles to `objectives={}` (JSXEmptyExpression) → undefined at
    // runtime → SSR crash. We must hand the parsed ESTree form through
    // `data.estree`. `valueToEstree` (canonical helper, same unified-
    // ecosystem author as mdast/remark/hast) converts the JS array into
    // an ESTree Expression; we wrap it in a Program/ExpressionStatement
    // to match the shape `hast-util-to-estree` expects. The string
    // `value` is retained as a debugging fallback some tooling reads.
    // See design doc §2 "Why JSON.stringify is the right serialization"
    // and §10 "Pattern precedent" pitfall.
    const estreeExpression = valueToEstree(items);
    parent.attributes.push({
      type: "mdxJsxAttribute",
      name: "objectives",
      value: {
        type: "mdxJsxAttributeValueExpression",
        value: JSON.stringify(items),
        data: {
          estree: {
            type: "Program",
            sourceType: "module",
            body: [
              {
                type: "ExpressionStatement",
                expression: estreeExpression,
              },
            ],
          },
        },
      },
    });
  });
}
