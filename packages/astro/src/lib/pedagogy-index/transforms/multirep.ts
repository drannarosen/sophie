import { valueToEstree } from "estree-util-value-to-estree";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { buildRepsFromMultiRepChildren } from "../extractors/multireps.ts";
import { type MdxJsxFlowElement, readStringAttr } from "../jsx-utils.ts";

/**
 * Walks `<MultiRep>` JSX flow elements in the mdast tree. For each,
 * harvests `<RepVerbal>` / `<RepEquation>` / `<RepFigure>` children
 * into a JS array, then mutates the parent node: clears children,
 * appends a `reps` mdxJsxAttribute holding the serialized array.
 *
 * Runs AFTER `extractMultiReps` (the read-only pass). Uses the same
 * `buildRepsFromMultiRepChildren` helper so both passes produce
 * identical payloads — extractor + runtime agree on the shape.
 *
 * The ESTree-wrapped attribute value follows the
 * `transformLearningObjectives` precedent: lowering passes
 * (`hast-util-to-estree`) read `value.data.estree` and ignore the
 * string `value`. Without the `data.estree` form the runtime prop
 * compiles to `reps={}` (JSXEmptyExpression → undefined) and SSR
 * crashes.
 */
export function transformMultiRep(tree: Root, unitId: string): void {
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
    if (parent.name !== "MultiRep") return;

    const concept = readStringAttr(parent, "concept");
    if (!concept) {
      throw new Error(
        `transform: <MultiRep> in chapter "${unitId}" is missing a non-empty \`concept\` attr.`
      );
    }

    const reps = buildRepsFromMultiRepChildren(
      parent,
      `<MultiRep concept="${concept}"> in chapter "${unitId}"`
    );

    if (reps.length === 0) {
      throw new Error(
        `transform: <MultiRep concept="${concept}"> in chapter "${unitId}" has no Rep children. An empty MultiRep is a content bug.`
      );
    }

    parent.children = [];

    const estreeExpression = valueToEstree(reps);
    parent.attributes.push({
      type: "mdxJsxAttribute",
      name: "reps",
      value: {
        type: "mdxJsxAttributeValueExpression",
        value: JSON.stringify(reps),
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
