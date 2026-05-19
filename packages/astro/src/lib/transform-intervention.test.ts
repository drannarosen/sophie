import { describe, expect, test } from "vitest";
import {
  extractInterventions,
  transformIntervention,
} from "./pedagogy-index/index.ts";

/**
 * Synthetic-mdast tests for `extractInterventions` + `transformIntervention`,
 * mirroring `transform-multirep.test.ts`. Tests build the minimum AST
 * shape the extractor consumes; the unified pipeline parses real MDX
 * in integration.
 *
 * Per ADR 0044 + 2026-05-17 design hardening §D4–§D5:
 *  - `addresses="this"` resolves to the enclosing
 *    `<Aside kind="misconception" name="X">`'s `name`.
 *  - `addresses="this"` outside any misconception Aside stays
 *    verbatim — the audit's I1 invariant (PR-δ) catches it.
 *  - Anchor numbering: sequential
 *    `intervention-${slug(type|name)}-${idx}` in JSX-DFS order.
 *  - `extractInterventions` and `transformIntervention` MUST produce
 *    identical anchors so hash navigation lands on the rendered DOM.
 */

interface MdxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value:
    | string
    | {
        type: string;
        value: string;
        data?: { estree?: unknown };
      };
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
  children: MdastChild[];
}

const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

const root = (children: ReadonlyArray<MdastChild>): Root => ({
  type: "root",
  children: [...children],
});

/**
 * Build a JSX attribute value that the extractor's
 * `readStringListAttr` helper recognizes — i.e., the
 * `mdxJsxAttributeValueExpression` form that real MDX parsing
 * emits for `addresses={["a", "b"]}` syntax. The `value` string
 * is what `readStringListAttr` parses (after single-quote
 * normalization); `data.estree` is intentionally omitted because
 * the extractor reads `value` directly.
 */
const exprValue = (raw: string): MdxAttribute["value"] => ({
  type: "mdxJsxAttributeValueExpression",
  value: raw,
});

type MdxAttrValue = string | { type: string; value: string };

const mdxFlow = (
  name: string,
  attrs: Record<string, MdxAttrValue>,
  children: ReadonlyArray<MdastChild> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: Object.entries(attrs).map(([n, v]) => ({
    type: "mdxJsxAttribute" as const,
    name: n,
    value: v,
  })),
  children,
});

/**
 * Build an Aside JSX node with `kind="misconception"` so nested
 * `<Intervention addresses="this">` resolves to `name`.
 */
const misconceptionAside = (
  name: string,
  children: ReadonlyArray<MdastChild>
): MdxJsxFlowElement =>
  mdxFlow("Aside", { kind: "misconception", name }, children);

const intervention = (
  attrs: Record<string, MdxAttrValue>,
  body: string
): MdxJsxFlowElement => mdxFlow("Intervention", attrs, [para(body)]);

describe("extractInterventions (pure)", () => {
  test("extracts a single nested intervention; resolves 'this' to enclosing misconception name", () => {
    const tree = root([
      misconceptionAside("universe-with-a-center", [
        para("Many students assume the universe has a center."),
        intervention(
          { type: "contrasting-cases", addresses: "this" },
          "Predict what you'd observe if the universe had a center, then compare."
        ),
      ]),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree, "01-foundations/spoiler-alerts");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "contrasting-cases",
      addresses: ["universe-with-a-center"],
      depth: "light",
      chapter: "01-foundations/spoiler-alerts",
      anchor: "intervention-contrasting-cases-1",
    });
    expect(entries[0]?.body).toContain("Predict what you'd observe");
  });

  test("extracts two interventions paired with the same misconception (separate anchors)", () => {
    const tree = root([
      misconceptionAside("universe-with-a-center", [
        intervention(
          { type: "contrasting-cases", addresses: "this" },
          "Body for contrasting-cases."
        ),
        intervention(
          {
            type: "bridging-analogy",
            addresses: "this",
            limits: "Bread has an outside; the universe doesn't.",
            depth: "substantial",
          },
          "Body for bridging-analogy."
        ),
      ]),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree, "ch/1");
    expect(entries).toHaveLength(2);
    expect(entries[0]?.anchor).toBe("intervention-contrasting-cases-1");
    expect(entries[1]?.anchor).toBe("intervention-bridging-analogy-2");
    expect(entries[1]?.limits).toContain("Bread has an outside");
    expect(entries[1]?.depth).toBe("substantial");
  });

  test("extracts a standalone intervention (addresses=explicit slug, no enclosing Aside)", () => {
    const tree = root([
      intervention(
        {
          type: "refutation-text",
          addresses: "universe-with-a-center",
        },
        "Refutation prose."
      ),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree, "ch/1");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.addresses).toEqual(["universe-with-a-center"]);
    expect(entries[0]?.anchor).toBe("intervention-refutation-text-1");
  });

  test("leaves addresses='this' VERBATIM when outside a misconception Aside (audit I1 catches it at PR-δ)", () => {
    const tree = root([
      intervention(
        { type: "refutation-text", addresses: "this" },
        "Body prose."
      ),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree, "ch/1");
    expect(entries).toHaveLength(1);
    // Extractor leaves "this" so the audit can flag it; throwing here
    // would short-circuit the build with a single error instead of
    // letting the audit produce a multi-finding report.
    expect(entries[0]?.addresses).toEqual(["this"]);
  });

  test("custom intervention requires name; throws when missing", () => {
    const tree = root([
      intervention({ type: "custom", addresses: "x" }, "Body."),
    ]) as unknown as import("mdast").Root;

    expect(() => extractInterventions(tree, "ch/1")).toThrowError(
      /custom.*missing.*name/i
    );
  });

  test("custom intervention with name slugs the name into the anchor", () => {
    const tree = root([
      intervention(
        {
          type: "custom",
          name: "Scale Comparison",
          addresses: "stars-are-points",
        },
        "Compare 10^21 m to 10^23 m."
      ),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree, "ch/1");
    expect(entries[0]?.name).toBe("Scale Comparison");
    expect(entries[0]?.anchor).toBe("intervention-scale-comparison-1");
  });

  test("throws on missing `type` attr", () => {
    const tree = root([
      mdxFlow("Intervention", { addresses: "x" }, [para("body")]),
    ]) as unknown as import("mdast").Root;
    expect(() => extractInterventions(tree, "ch/1")).toThrowError(
      /missing.*type/i
    );
  });

  test("throws on missing `addresses` attr", () => {
    const tree = root([
      mdxFlow("Intervention", { type: "refutation-text" }, [para("body")]),
    ]) as unknown as import("mdast").Root;
    expect(() => extractInterventions(tree, "ch/1")).toThrowError(
      /missing.*addresses/i
    );
  });

  test("throws on empty body", () => {
    const tree = root([
      mdxFlow(
        "Intervention",
        { type: "contrasting-cases", addresses: "this" },
        []
      ),
    ]) as unknown as import("mdast").Root;
    expect(() => extractInterventions(tree, "ch/1")).toThrowError(
      /empty body/i
    );
  });

  test("does NOT pick up Asides with kind != 'misconception' for 'this' resolution", () => {
    // An Aside with kind="note" should not contribute to enclosingMisconception;
    // `<Intervention addresses="this">` nested inside should stay as "this".
    const tree = root([
      mdxFlow("Aside", { kind: "note" }, [
        intervention({ type: "contrasting-cases", addresses: "this" }, "Body."),
      ]),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree, "ch/1");
    expect(entries[0]?.addresses).toEqual(["this"]);
  });

  test("slugifies the enclosing misconception's `name` before rewriting 'this' (aligns with misconception extractor's slugify(name) anchor)", () => {
    // PR-δ alignment fix: the misconception extractor stores
    // `slugify(name)` as the MisconceptionEntry.anchor. Without
    // matching slugify here, an author writing `name="Universe
    // With A Center"` would produce a misconception anchor of
    // `universe-with-a-center` but an Intervention
    // `addresses="this"` resolution of `Universe With A Center`
    // (raw). The audit's I1 + MG3 would then fire false-positive
    // pairs on every nested intervention. This test locks the
    // slugify alignment.
    const tree = root([
      mdxFlow(
        "Aside",
        { kind: "misconception", name: "Universe With A Center" },
        [
          intervention(
            { type: "contrasting-cases", addresses: "this" },
            "Body."
          ),
        ]
      ),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree, "ch/1");
    expect(entries[0]?.addresses).toEqual(["universe-with-a-center"]);
  });

  test("REJECTS author-supplied explicit `id` (extractor is the SOLE source of anchors per I1 review)", () => {
    // The component schema `InterventionPropsSchema.id` field is
    // extractor-derived, not authorable — the contract is that the
    // pedagogy-index entry's `anchor` field and the rendered DOM id
    // never disagree. Authoring an explicit id would split the two.
    const tree = root([
      mdxFlow(
        "Intervention",
        {
          id: "my-explicit-anchor",
          type: "contrasting-cases",
          addresses: "this",
        },
        [para("body")]
      ),
    ]) as unknown as import("mdast").Root;
    expect(() => extractInterventions(tree, "ch/1")).toThrowError(
      /id.*extractor-derived.*not authorable/i
    );
  });

  test("REJECTS invalid `depth` enum value (no silent coercion to 'light' per I2 review)", () => {
    const tree = root([
      intervention(
        { type: "contrasting-cases", addresses: "this", depth: "deep" },
        "Body."
      ),
    ]) as unknown as import("mdast").Root;
    expect(() => extractInterventions(tree, "ch/1")).toThrowError(
      /invalid.*depth.*deep/i
    );
  });

  test("REJECTS <Intervention> nested inside another <Intervention>'s body (per M2 review)", () => {
    // Pathological author shape: nested interventions would
    // desynchronize anchor numbering between extract (which skips
    // recursion into Intervention children) and transform (which
    // uses `visit()` and descends into them).
    const inner = intervention(
      { type: "bridging-analogy", addresses: "this" },
      "Inner body."
    );
    const outer: MdxJsxFlowElement = {
      type: "mdxJsxFlowElement",
      name: "Intervention",
      attributes: [
        {
          type: "mdxJsxAttribute" as const,
          name: "type",
          value: "contrasting-cases",
        },
        { type: "mdxJsxAttribute" as const, name: "addresses", value: "this" },
      ],
      children: [para("Outer body."), inner],
    };
    const tree = root([outer]) as unknown as import("mdast").Root;
    expect(() => extractInterventions(tree, "ch/1")).toThrowError(
      /nested intervention/i
    );
  });

  test('resolves \'this\' inside a mixed addresses array (e.g. ["this", "other-misc"])', () => {
    // I3 review test: extractor's per-element map handles a mixed
    // array — each "this" entry resolves to the enclosing
    // misconception name; explicit slugs pass through verbatim.
    const tree = root([
      misconceptionAside("universe-with-a-center", [
        intervention(
          {
            type: "refutation-text",
            addresses: exprValue('["this", "other-misc"]'),
          },
          "Body."
        ),
      ]),
    ]) as unknown as import("mdast").Root;
    const entries = extractInterventions(tree, "ch/1");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.addresses).toEqual([
      "universe-with-a-center",
      "other-misc",
    ]);
  });
});

describe("transformIntervention (mutating)", () => {
  test("injects id={anchor} matching extractInterventions' numbering", () => {
    const node = intervention(
      { type: "contrasting-cases", addresses: "this" },
      "Body."
    );
    const tree = root([
      misconceptionAside("universe-with-a-center", [node]),
    ]) as unknown as import("mdast").Root;

    transformIntervention(tree, "ch/1");
    const idAttr = node.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "id"
    );
    expect(idAttr).toBeDefined();
    expect(idAttr?.value).toBe("intervention-contrasting-cases-1");
  });

  // Note: the prior "does NOT overwrite an explicit id" test was
  // removed per the I1 review finding. Authoring an explicit `id`
  // is now rejected at extract time (see the corresponding
  // extractor test in the "extractInterventions (pure)" suite).
  // The transform pass's id-skip logic still defends against a
  // future re-introduction of authoring `id`, but the chapter-
  // author path never reaches it because extract throws first.

  test("numbering agrees with extractInterventions across multiple blocks (DFS order)", () => {
    const a = intervention(
      { type: "contrasting-cases", addresses: "this" },
      "Body A."
    );
    const b = intervention(
      { type: "bridging-analogy", addresses: "this" },
      "Body B."
    );
    const tree1 = root([
      misconceptionAside("misc-x", [a, b]),
    ]) as unknown as import("mdast").Root;

    const entries = extractInterventions(tree1, "ch/1");
    transformIntervention(tree1, "ch/1");

    const aId = a.attributes.find(
      (x) => x.type === "mdxJsxAttribute" && x.name === "id"
    );
    const bId = b.attributes.find(
      (x) => x.type === "mdxJsxAttribute" && x.name === "id"
    );
    expect(aId?.value).toBe(entries[0]?.anchor);
    expect(bId?.value).toBe(entries[1]?.anchor);
  });
});
