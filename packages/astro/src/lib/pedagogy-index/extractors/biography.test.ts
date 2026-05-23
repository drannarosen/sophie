import type { EquationEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { extractEquationRegistryDeclaration } from "../index.ts";

/**
 * Tests over synthetic mdast trees, exercising the biography walker.
 * Post-ADR-0060, biographies live in registry MDX bodies (extracted by
 * `extractEquationRegistryDeclaration`). These tests use a thin
 * test-local shim that unwraps an old-shape `<KeyEquation>` synthetic
 * tree into the registry walker's (frontmatter, body-tree) inputs —
 * preserves the biography-edge-case coverage built up across PR-β/γ
 * without rewriting every assertion.
 *
 * Authoritative design:
 * `docs/plans/2026-05-17-equation-biography-design.md`.
 */

interface MdxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value:
    | string
    | { type: "mdxJsxAttributeValueExpression"; value: string }
    | null;
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

const root = (children: ReadonlyArray<MdastChild>): Root => ({
  type: "root",
  children,
});

const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

const mathBlock = (value: string) => ({ type: "math", value });

const whitespace = () => ({ type: "text", value: "\n  " });

const jsxAttr = (name: string, value: string): MdxAttribute => ({
  type: "mdxJsxAttribute",
  name,
  value,
});

const mdxKeyEquation = (
  attrs: MdxAttribute[],
  children: ReadonlyArray<MdastChild>
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name: "KeyEquation",
  attributes: attrs,
  children,
});

const mdxBiographyChild = (
  name: string,
  attrs: MdxAttribute[],
  children: ReadonlyArray<MdastChild> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: attrs,
  children,
});

/**
 * Test-local shim: extracts a single `EquationEntry` from a synthetic
 * tree containing one `<KeyEquation>` wrapper. Post-ADR-0060 the
 * production extractor is `extractEquationRegistryDeclaration(tree,
 * frontmatter)` — this shim unwraps the legacy KeyEquation-as-body
 * test fixtures by lifting `id`/`title`/`symbols` props to frontmatter
 * and treating KeyEquation's children as the registry body's children.
 * Returns an array (length 0 or 1) so the legacy `const [entry] = ...`
 * destructuring still works.
 */
function extractEquations(tree: Root, _unitId: string): EquationEntry[] {
  for (const child of tree.children) {
    const el = child as MdxJsxFlowElement;
    if (el.type !== "mdxJsxFlowElement" || el.name !== "KeyEquation") continue;
    const idAttr = el.attributes.find((a) => a.name === "id");
    const titleAttr = el.attributes.find((a) => a.name === "title");
    const symbolsAttr = el.attributes.find((a) => a.name === "symbols");
    const id = typeof idAttr?.value === "string" ? idAttr.value : "fixture";
    const title =
      typeof titleAttr?.value === "string" ? titleAttr.value : "Fixture";
    let symbols: string[] = ["fixture-symbol"];
    if (
      symbolsAttr &&
      typeof symbolsAttr.value === "object" &&
      symbolsAttr.value !== null
    ) {
      const expr = symbolsAttr.value as { value?: string };
      if (typeof expr.value === "string") {
        try {
          const parsed = JSON.parse(expr.value);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((s) => typeof s === "string" && s.length > 0)
          ) {
            symbols = parsed;
          }
        } catch {
          /* keep default symbols */
        }
      }
    }
    let tex = "x = 1";
    for (const c of el.children) {
      if (
        (c as { type?: string }).type === "math" &&
        typeof (c as { value?: string }).value === "string"
      ) {
        const v = (c as { value: string }).value;
        if (v.trim().length > 0) {
          tex = v;
          break;
        }
      }
    }
    const frontmatter = { id, title, tex, symbols };
    const bodyTree = { type: "root", children: el.children };
    return [extractEquationRegistryDeclaration(bodyTree as never, frontmatter)];
  }
  return [];
}

describe("extractEquations — biography (PR-γ)", () => {
  test("returns an EquationEntry with `biography: undefined` when no biography children present (per-equation opt-in)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [mathBlock("\\lambda_{peak} = b T^{-1}")]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry).toBeDefined();
    expect(entry?.biography).toBeUndefined();
  });

  test("populates Observable singleton with role 'observable'", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild(
            "Observable",
            [],
            [
              para(
                "Peak wavelength of thermal emission as a function of temperature."
              ),
            ]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography?.observable).toBeDefined();
    expect(entry?.biography?.observable?.epistemicRole).toBe("observable");
    expect(entry?.biography?.observable?.body).toContain(
      "Peak wavelength of thermal emission"
    );
  });

  test("populates Assumption list with role 'assumption' + optional type slug", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild(
            "Assumption",
            [jsxAttr("type", "thermal-equilibrium")],
            [para("Source is in local thermodynamic equilibrium.")]
          ),
          whitespace(),
          mdxBiographyChild(
            "Assumption",
            [],
            [para("Source emits as an ideal blackbody.")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography?.assumptions).toHaveLength(2);
    expect(entry?.biography?.assumptions[0]).toMatchObject({
      type: "thermal-equilibrium",
      epistemicRole: "assumption",
    });
    expect(entry?.biography?.assumptions[1]?.type).toBeUndefined();
    expect(entry?.biography?.assumptions[1]?.epistemicRole).toBe("assumption");
  });

  test("populates Units list with symbol + unit pairs (NO epistemicRole — descriptive metadata)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild("Units", [
            jsxAttr("symbol", "T"),
            jsxAttr("unit", "K"),
          ]),
          whitespace(),
          mdxBiographyChild("Units", [
            jsxAttr("symbol", "\\lambda_{peak}"),
            jsxAttr("unit", "cm"),
          ]),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography?.units).toHaveLength(2);
    expect(entry?.biography?.units[0]).toEqual({ symbol: "T", unit: "K" });
    expect(entry?.biography?.units[1]).toEqual({
      symbol: "\\lambda_{peak}",
      unit: "cm",
    });
    // Schema is `.strict()` — verify no epistemicRole leaks in.
    expect("epistemicRole" in (entry?.biography?.units[0] ?? {})).toBe(false);
  });

  test("populates BreaksWhen singleton with role 'approximation'", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild(
            "BreaksWhen",
            [],
            [para("Non-thermal emission (synchrotron, masers, line emission).")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography?.breaks_when?.epistemicRole).toBe("approximation");
    expect(entry?.biography?.breaks_when?.body).toContain(
      "Non-thermal emission"
    );
  });

  test("populates CommonMisuse list with optional misconception cross-ref (NO own role — linked node carries 'misconception')", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild(
            "CommonMisuse",
            [jsxAttr("misconception", "wiens-law-absorption-spectra")],
            [para("Applying Wien's law to absorption-line spectra.")]
          ),
          whitespace(),
          mdxBiographyChild(
            "CommonMisuse",
            [],
            [para("Confusing wavelength peak with frequency peak.")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography?.common_misuses).toHaveLength(2);
    expect(entry?.biography?.common_misuses[0]?.misconception).toBe(
      "wiens-law-absorption-spectra"
    );
    expect(entry?.biography?.common_misuses[1]?.misconception).toBeUndefined();
    expect("epistemicRole" in (entry?.biography?.common_misuses[0] ?? {})).toBe(
      false
    );
  });

  test("populates a full Wien's-law biography (Observable + 2 Assumptions + 2 Units + BreaksWhen + 1 CommonMisuse)", () => {
    // The smoke fixture exercises every biography child.
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild(
            "Observable",
            [],
            [para("Peak wavelength of thermal emission.")]
          ),
          whitespace(),
          mdxBiographyChild(
            "Assumption",
            [jsxAttr("type", "thermal-equilibrium")],
            [para("LTE.")]
          ),
          whitespace(),
          mdxBiographyChild(
            "Assumption",
            [jsxAttr("type", "blackbody")],
            [para("Ideal blackbody.")]
          ),
          whitespace(),
          mdxBiographyChild("Units", [
            jsxAttr("symbol", "T"),
            jsxAttr("unit", "K"),
          ]),
          whitespace(),
          mdxBiographyChild("Units", [
            jsxAttr("symbol", "\\lambda_{peak}"),
            jsxAttr("unit", "cm"),
          ]),
          whitespace(),
          mdxBiographyChild("BreaksWhen", [], [para("Non-thermal emission.")]),
          whitespace(),
          mdxBiographyChild(
            "CommonMisuse",
            [jsxAttr("misconception", "wiens-law-absorption-spectra")],
            [para("Applying to absorption spectra.")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography).toBeDefined();
    expect(entry?.biography?.observable).toBeDefined();
    expect(entry?.biography?.assumptions).toHaveLength(2);
    expect(entry?.biography?.units).toHaveLength(2);
    expect(entry?.biography?.breaks_when).toBeDefined();
    expect(entry?.biography?.common_misuses).toHaveLength(1);
  });

  test("renders biography prose bodies as HTML (via renderChildrenToHtml)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild(
            "Observable",
            [],
            [para("Wavelength peak of thermal emission.")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    // Body is HTML-rendered; <p> wrapper visible.
    expect(entry?.biography?.observable?.body).toMatch(/<p>.*<\/p>/);
  });

  test("throws on a second <Observable> child (Observable is a singleton per ADR 0046)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("x = 1"),
          mdxBiographyChild("Observable", [], [para("First.")]),
          mdxBiographyChild("Observable", [], [para("Second — should throw.")]),
        ]
      ),
    ]);
    expect(() => extractEquations(tree as never, "ch")).toThrowError(
      /more than one <Observable>/
    );
  });

  test("throws on a second <BreaksWhen> child (BreaksWhen is a singleton per ADR 0046)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("x = 1"),
          mdxBiographyChild("BreaksWhen", [], [para("First.")]),
          mdxBiographyChild("BreaksWhen", [], [para("Second.")]),
        ]
      ),
    ]);
    expect(() => extractEquations(tree as never, "ch")).toThrowError(
      /more than one <BreaksWhen>/
    );
  });

  test("throws on <Observable> with empty body", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [mathBlock("x = 1"), mdxBiographyChild("Observable", [], [])]
      ),
    ]);
    expect(() => extractEquations(tree as never, "ch")).toThrowError(
      /<Observable>.*empty body/
    );
  });

  test("throws on <Units> missing symbol or unit attr", () => {
    const treeNoSymbol = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [mathBlock("x = 1"), mdxBiographyChild("Units", [jsxAttr("unit", "K")])]
      ),
    ]);
    expect(() => extractEquations(treeNoSymbol as never, "ch")).toThrowError(
      /<Units>.*missing.*symbol/
    );

    const treeNoUnit = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("x = 1"),
          mdxBiographyChild("Units", [jsxAttr("symbol", "T")]),
        ]
      ),
    ]);
    expect(() => extractEquations(treeNoUnit as never, "ch")).toThrowError(
      /<Units symbol="T">.*missing.*unit/
    );
  });

  test("ignores non-biography JSX children (framing prose + EquationRef etc. don't trip the walker)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          para("Framing prose."),
          mdxBiographyChild("Observable", [], [para("Peak wavelength.")]),
          // Random non-biography JSX — should be skipped silently
          mdxBiographyChild(
            "EquationRef",
            [jsxAttr("refId", "stefan-boltzmann")],
            [para("see also")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    // Biography still extracted; non-biography children don't contribute.
    expect(entry?.biography?.observable).toBeDefined();
  });

  test("registry entry without biography children is valid (per-equation opt-in per ADR 0046 §R8)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [mathBlock("x = 1")]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography).toBeUndefined();
  });

  test("biography children authored in any source order populate canonical slots correctly (order-independence)", () => {
    // Per ADR 0046's authoring rules: "Biography children in any order;
    // `<KeyEquation>` walker handles serialization." The schema imposes
    // canonical field ordering (observable / assumptions / units /
    // breaks_when / common_misuses); the source-doc order is not
    // load-bearing. This test locks the walker against a future refactor
    // that accidentally introduces order-dependence.
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("x = 1"),
          // Source order: BreaksWhen → CommonMisuse → Units → Assumption → Observable
          // (reverse of canonical slot order)
          mdxBiographyChild("BreaksWhen", [], [para("Breaks-when body.")]),
          whitespace(),
          mdxBiographyChild(
            "CommonMisuse",
            [jsxAttr("misconception", "some-misc")],
            [para("Misuse body.")]
          ),
          whitespace(),
          mdxBiographyChild("Units", [
            jsxAttr("symbol", "T"),
            jsxAttr("unit", "K"),
          ]),
          whitespace(),
          mdxBiographyChild(
            "Assumption",
            [jsxAttr("type", "thermal-equilibrium")],
            [para("LTE.")]
          ),
          whitespace(),
          mdxBiographyChild("Observable", [], [para("Peak wavelength.")]),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    // All five slots populate regardless of source order.
    expect(entry?.biography?.observable?.epistemicRole).toBe("observable");
    expect(entry?.biography?.assumptions).toHaveLength(1);
    expect(entry?.biography?.assumptions[0]?.type).toBe("thermal-equilibrium");
    expect(entry?.biography?.units).toHaveLength(1);
    expect(entry?.biography?.units[0]?.symbol).toBe("T");
    expect(entry?.biography?.breaks_when?.epistemicRole).toBe("approximation");
    expect(entry?.biography?.common_misuses).toHaveLength(1);
    expect(entry?.biography?.common_misuses[0]?.misconception).toBe(
      "some-misc"
    );
  });

  test("populates DerivationStep list with role 'model' + optional label (ADR 0046 §R9)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          whitespace(),
          mdxBiographyChild(
            "DerivationStep",
            [jsxAttr("label", "Start from Planck's law")],
            [
              para(
                "Spectral radiance of a blackbody at temperature T as a function of wavelength."
              ),
            ]
          ),
          whitespace(),
          mdxBiographyChild(
            "DerivationStep",
            [jsxAttr("label", "Differentiate and set to zero")],
            [para("Solve for the wavelength at which the spectrum peaks.")]
          ),
          whitespace(),
          // A step with no label — label is optional per the schema.
          mdxBiographyChild(
            "DerivationStep",
            [],
            [
              para(
                "Root of the resulting transcendental equation gives Wien's constant b."
              ),
            ]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography?.derivation_steps).toHaveLength(3);
    expect(entry?.biography?.derivation_steps[0]).toMatchObject({
      label: "Start from Planck's law",
      epistemicRole: "model",
    });
    expect(entry?.biography?.derivation_steps[1]?.label).toBe(
      "Differentiate and set to zero"
    );
    expect(entry?.biography?.derivation_steps[1]?.epistemicRole).toBe("model");
    // Third step omitted `label` — extractor leaves the field unset.
    expect(entry?.biography?.derivation_steps[2]?.label).toBeUndefined();
    expect(entry?.biography?.derivation_steps[2]?.epistemicRole).toBe("model");
  });

  test("throws on <DerivationStep> with empty body", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [mathBlock("x = 1"), mdxBiographyChild("DerivationStep", [], [])]
      ),
    ]);
    expect(() => extractEquations(tree as never, "ch")).toThrowError(
      /<DerivationStep>.*empty body/
    );
  });

  test("DerivationStep list defaults to [] when no steps present (per-equation opt-in)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("x = 1"),
          mdxBiographyChild("Observable", [], [para("Some observable.")]),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    // Biography is populated (Observable triggers it); derivation_steps
    // defaults to [] from BiographySchema's `.default([])`.
    expect(entry?.biography?.derivation_steps).toEqual([]);
  });

  test("multiple list-type biography children preserve source order within their slot (lists are stable, slots are canonical)", () => {
    // Within a list-type slot (assumptions, units, common_misuses),
    // source order IS preserved — readers see assumptions in the order
    // the author wrote them. Across slots, canonical order applies (per
    // BiographyRender.astro). Lock the list-stable contract here.
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("x = 1"),
          mdxBiographyChild(
            "Assumption",
            [jsxAttr("type", "first")],
            [para("First.")]
          ),
          mdxBiographyChild(
            "Assumption",
            [jsxAttr("type", "second")],
            [para("Second.")]
          ),
          mdxBiographyChild(
            "Assumption",
            [jsxAttr("type", "third")],
            [para("Third.")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.biography?.assumptions.map((a) => a.type)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});

// Symbols-extraction tests (PR-δ' bundle) removed in Batch 4 per ADR
// 0060: `<KeyEquation symbols={[...]}>` is no longer the source of
// truth for symbol declarations. Symbols now come from frontmatter on
// the registry MDX file (`src/content/equations/<id>.mdx`); the JSX-
// array-attr extraction path is dead. Test coverage for the new
// frontmatter-symbols path lives in pedagogy-index.test.ts (via
// EquationRegistryEntrySchema's `symbols: z.array(NonEmptyString).min(1)`).
