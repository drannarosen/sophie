import { describe, expect, test } from "vitest";
import { transformOMIFlow } from "../index.ts";

/**
 * Synthetic-mdast tests for `transformOMIFlow`. Mirrors the
 * `transformMultiRep` test convention: build minimum mdast shape,
 * apply the transform, assert the post-mutation parent.
 *
 * The transform hoists `<OMIFlow.{Observable,Model,Inference}>` slot
 * children into explicit `observable` / `model` / `inference` props
 * (each carrying `{title?, body}`) on the parent `<OMIFlow>` and
 * clears the parent's children. This makes the post-transform JSX
 * survive Astro's MDX rendering boundary (where slot marker
 * components would otherwise be evaluated and discarded — per
 * ADR 0027).
 */

interface MdxAttributeValueExpression {
  type: "mdxJsxAttributeValueExpression";
  value: string;
  data?: { estree?: unknown };
}
interface MdxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: string | MdxAttributeValueExpression;
}
interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: MdxAttribute[];
  children: ReadonlyArray<MdastChild>;
}
type MdastChild = MdxJsxFlowElement | Record<string, unknown>;
interface Root {
  type: "root";
  children: ReadonlyArray<MdastChild>;
}

const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

const root = (children: ReadonlyArray<MdastChild>): Root => ({
  type: "root",
  children,
});

const mdxFlow = (
  name: string,
  attrs: Record<string, string>,
  children: ReadonlyArray<MdastChild> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: Object.entries(attrs).map(([n, v]) => ({
    type: "mdxJsxAttribute",
    name: n,
    value: v,
  })),
  children,
});

type SlotSpec = {
  title?: string;
  children?: ReadonlyArray<MdastChild>;
};

function buildOMIFlow(
  attrs: Record<string, string>,
  slots: {
    observable?: SlotSpec | false;
    model?: SlotSpec | false;
    inference?: SlotSpec | false;
  } = {}
): MdxJsxFlowElement {
  // Default: all three slots populated with placeholder body. Pass
  // `{ observable: false }` to deliberately omit a slot (for strict-3
  // throw tests).
  const slotChildren: MdxJsxFlowElement[] = [];
  for (const k of ["observable", "model", "inference"] as const) {
    const slot = slots[k];
    if (slot === false) continue;
    const slotSpec = slot ?? {};
    const slotAttrs: Record<string, string> = {};
    if (slotSpec.title !== undefined) slotAttrs.title = slotSpec.title;
    slotChildren.push(
      mdxFlow(
        `OMIFlow.${k.charAt(0).toUpperCase()}${k.slice(1)}`,
        slotAttrs,
        slotSpec.children ?? [para(`${k} body`)]
      )
    );
  }
  return mdxFlow("OMIFlow", attrs, slotChildren);
}

function findAttr(
  node: MdxJsxFlowElement,
  name: string
): MdxAttribute | undefined {
  return node.attributes.find((a) => a.name === name);
}

describe("transformOMIFlow", () => {
  test("hoists slot children into observable/model/inference props + clears children", () => {
    const omiNode = buildOMIFlow(
      { id: "x", concept: "stellar-temperature" },
      {
        observable: { title: "HR diagram" },
        model: { title: "Hydrostatic equilibrium" },
        inference: { title: "Mass-lifetime" },
      }
    );
    const tree = root([omiNode]);
    transformOMIFlow(tree as never, "ch");

    expect(omiNode.children).toEqual([]);
    expect(findAttr(omiNode, "observable")).toBeDefined();
    expect(findAttr(omiNode, "model")).toBeDefined();
    expect(findAttr(omiNode, "inference")).toBeDefined();
  });

  test("each hoisted prop carries title + pre-rendered body HTML", () => {
    const omiNode = buildOMIFlow(
      { id: "x" },
      {
        observable: { title: "Obs title" },
        model: { title: "Mod title" },
        inference: { title: "Inf title" },
      }
    );
    transformOMIFlow(root([omiNode]) as never, "ch");

    const observable = findAttr(omiNode, "observable");
    expect(observable?.value).toMatchObject({
      type: "mdxJsxAttributeValueExpression",
    });
    const observableJson = JSON.parse(
      (observable?.value as MdxAttributeValueExpression).value
    );
    expect(observableJson).toMatchObject({
      title: "Obs title",
      body: expect.stringContaining("observable body"),
    });

    const inference = findAttr(omiNode, "inference");
    const inferenceJson = JSON.parse(
      (inference?.value as MdxAttributeValueExpression).value
    );
    expect(inferenceJson.title).toBe("Inf title");
  });

  test("post-transform attribute value carries data.estree for MDX lowering", () => {
    const omiNode = buildOMIFlow({ id: "x" });
    transformOMIFlow(root([omiNode]) as never, "ch");
    const observable = findAttr(omiNode, "observable");
    expect(
      (observable?.value as MdxAttributeValueExpression).data?.estree
    ).toBeDefined();
  });

  test("throws on missing required slot (strict-3 invariant)", () => {
    const omiNode = buildOMIFlow(
      { id: "x" },
      { inference: false } // observable+model defaulted; inference omitted
    );
    expect(() => transformOMIFlow(root([omiNode]) as never, "ch")).toThrow(
      /missing.*inference/i
    );
  });

  test("throws on intra-chapter anchor collision (mirrors extractor)", () => {
    const a = buildOMIFlow({ id: "dup" });
    const b = buildOMIFlow({ id: "dup" });
    expect(() => transformOMIFlow(root([a, b]) as never, "ch")).toThrow(
      /anchor.*collision/i
    );
  });

  test("ignores non-OMIFlow mdxJsxFlowElement nodes", () => {
    const callout = mdxFlow("Callout", { variant: "info" }, [para("x")]);
    const tree = root([callout]);
    expect(() => transformOMIFlow(tree as never, "ch")).not.toThrow();
    // Callout untouched.
    expect(callout.children).toHaveLength(1);
    expect(findAttr(callout, "variant")?.value).toBe("info");
  });
});
