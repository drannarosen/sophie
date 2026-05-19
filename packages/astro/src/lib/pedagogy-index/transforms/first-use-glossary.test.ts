import { beforeEach, describe, expect, test } from "vitest";
import { mdxInlineJsx, root } from "../_test-helpers.ts";
import { markFirstUseGlossaryTerms, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

type GlossaryTermNode = {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name: string;
  attributes: Array<{ type: string; name: string; value: unknown }>;
  children: ReadonlyArray<Record<string, unknown>>;
};

const collectGlossaryTermNodes = (
  tree: Record<string, unknown>
): GlossaryTermNode[] => {
  const out: GlossaryTermNode[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      name?: string;
      children?: ReadonlyArray<unknown>;
    };
    if (
      (n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") &&
      n.name === "GlossaryTerm"
    ) {
      out.push(node as GlossaryTermNode);
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) walk(child);
    }
  };
  walk(tree);
  return out;
};

const getAttr = (node: GlossaryTermNode, name: string): string | undefined => {
  const match = node.attributes.find((a) => a.name === name);
  if (!match) return undefined;
  return typeof match.value === "string" ? match.value : undefined;
};

describe("markFirstUseGlossaryTerms", () => {
  test("marks only the first <GlossaryTerm> per slug per chapter", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "The " },
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          { type: "text", value: " of a star matters. Later we revisit " },
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          { type: "text", value: " again, and a different term: " },
          mdxInlineJsx("GlossaryTerm", { name: "Parsec" }),
          { type: "text", value: "." },
        ],
      },
    ]);

    markFirstUseGlossaryTerms(tree as never, "test-chapter");

    const terms = collectGlossaryTermNodes(tree);
    expect(terms).toHaveLength(3);
    expect(getAttr(terms[0] as GlossaryTermNode, "data-first-use")).toBe(
      "true"
    );
    expect(
      getAttr(terms[1] as GlossaryTermNode, "data-first-use")
    ).toBeUndefined();
    expect(getAttr(terms[2] as GlossaryTermNode, "data-first-use")).toBe(
      "true"
    );
  });

  test("is idempotent — second call does not duplicate markings", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "The " },
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          { type: "text", value: "." },
        ],
      },
    ]);

    markFirstUseGlossaryTerms(tree as never, "test-chapter");
    const before = JSON.stringify(tree);
    markFirstUseGlossaryTerms(tree as never, "test-chapter");
    expect(JSON.stringify(tree)).toBe(before);
  });

  test("treats slugified names as the dedup key (case-insensitive)", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          mdxInlineJsx("GlossaryTerm", { name: "luminosity" }),
          mdxInlineJsx("GlossaryTerm", { name: "LUMINOSITY" }),
        ],
      },
    ]);

    markFirstUseGlossaryTerms(tree as never, "test-chapter");

    const terms = collectGlossaryTermNodes(tree);
    expect(terms).toHaveLength(3);
    expect(getAttr(terms[0] as GlossaryTermNode, "data-first-use")).toBe(
      "true"
    );
    expect(
      getAttr(terms[1] as GlossaryTermNode, "data-first-use")
    ).toBeUndefined();
    expect(
      getAttr(terms[2] as GlossaryTermNode, "data-first-use")
    ).toBeUndefined();
  });
});
