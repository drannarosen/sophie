import type { Parent, Root, RootContent } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

/**
 * SPIKE (Task 1) — compile-time expansion of `<MCQ>` into static native
 * form markup + a childless `<MCQController>` island. Proves the
 * "static structure + controller island" mechanism end-to-end before
 * generalizing (Task 2). MCQ-only; integrated into
 * `sophieAutoImportsRemarkPlugin` AFTER reveal-threading so nested
 * `<Solution>`/`<Hint>` keep their threaded props, and BEFORE the
 * client:load + auto-import passes so `<MCQController>` (and any island
 * inside a choice body) get hydrated.
 *
 * NOT the final ordering — the real plugin runs last (after extraction);
 * see docs/plans/2026-05-27-compound-island-children-props-transform.md.
 */

function attr(name: string, value: string | null): MdxJsxAttribute {
  return { type: "mdxJsxAttribute", name, value };
}

function jsxEl(
  name: string,
  attributes: MdxJsxAttribute[],
  children: RootContent[]
): MdxJsxFlowElement {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes,
    children: children as MdxJsxFlowElement["children"],
  };
}

/** Plain-text content of an mdast subtree (for slug derivation). */
function plainText(nodes: ReadonlyArray<RootContent> | undefined): string {
  let out = "";
  for (const node of nodes ?? []) {
    if (node.type === "text" || node.type === "inlineCode") {
      out += (node as { value: string }).value;
    } else if ("children" in node) {
      out += plainText((node as Parent).children as RootContent[]);
    }
  }
  return out;
}

function readAttr(el: MdxJsxFlowElement, name: string): string | undefined {
  for (const a of el.attributes) {
    if (a.type === "mdxJsxAttribute" && a.name === name) {
      return typeof a.value === "string" ? a.value : undefined;
    }
  }
  return undefined;
}

function hasAttr(el: MdxJsxFlowElement, name: string): boolean {
  return el.attributes.some(
    (a) => a.type === "mdxJsxAttribute" && a.name === name
  );
}

function isFlow(node: RootContent): node is MdxJsxFlowElement {
  return node.type === "mdxJsxFlowElement";
}

function expandMcq(mcq: MdxJsxFlowElement): MdxJsxFlowElement {
  const course = readAttr(mcq, "course") ?? "";
  const unit = readAttr(mcq, "unit") ?? "";
  const id = readAttr(mcq, "id") ?? "";
  const labelId = `${id}-label`;

  const promptNodes: RootContent[] = [];
  const labels: RootContent[] = [];
  const reveals: RootContent[] = [];
  const seenSlugs = new Set<string>();
  let choiceIndex = 0;

  for (const child of (mcq.children as RootContent[]) ?? []) {
    if (!isFlow(child)) continue;
    if (child.name === "MCQ.Prompt") {
      promptNodes.push(...((child.children as RootContent[]) ?? []));
    } else if (child.name === "MCQChoice") {
      const explicit = readAttr(child, "id");
      const body = (child.children as RootContent[]) ?? [];
      const stripped = plainText(body)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const slug = explicit ?? (stripped !== "" ? stripped : `choice-${choiceIndex}`);
      choiceIndex += 1;
      if (seenSlugs.has(slug)) {
        throw new Error(
          `<MCQ id="${id}"> duplicate choice slug "${slug}". Supply a distinct \`id\` on one <MCQChoice>.`
        );
      }
      seenSlugs.add(slug);
      const inputAttrs = [
        attr("type", "radio"),
        attr("name", `mcq-${id}`),
        attr("value", slug),
        attr("id", `${id}-${slug}`),
      ];
      if (hasAttr(child, "correct")) inputAttrs.push(attr("data-correct", "true"));
      labels.push(
        jsxEl("label", [], [jsxEl("input", inputAttrs, []), jsxEl("span", [], body)])
      );
    } else if (child.name === "Solution" || child.name === "Hint") {
      reveals.push(child);
    }
  }

  return jsxEl(
    "section",
    [
      attr("data-pedagogy-role", "mcq"),
      attr("data-formative-anchor", id),
      attr("aria-labelledby", labelId),
    ],
    [
      jsxEl("h3", [attr("id", labelId)], [{ type: "text", value: "Multiple choice" } as RootContent]),
      ...promptNodes,
      jsxEl(
        "fieldset",
        [attr("role", "radiogroup"), attr("aria-labelledby", labelId)],
        labels
      ),
      jsxEl(
        "MCQController",
        [attr("course", course), attr("unit", unit), attr("id", id)],
        []
      ),
      ...reveals,
    ]
  );
}

/** Replace every `<MCQ>` flow element in the tree with its expansion. */
export function expandCompoundIslands(tree: Root): void {
  const matches: Array<{ parent: Parent; node: MdxJsxFlowElement }> = [];
  visit(tree, "mdxJsxFlowElement", (node, _index, parent) => {
    if ((node as MdxJsxFlowElement).name === "MCQ" && parent) {
      matches.push({ parent: parent as Parent, node: node as MdxJsxFlowElement });
    }
  });
  for (const { parent, node } of matches) {
    const i = parent.children.indexOf(node as RootContent);
    if (i >= 0) parent.children.splice(i, 1, expandMcq(node) as RootContent);
  }
}
