import { describe, expect, test } from "vitest";
import { extractEquations } from "./pedagogy-index-extractor.ts";

/**
 * Tests over synthetic mdast trees, matching the convention in
 * `pedagogy-index-extractor.test.ts` + `transform-multirep.test.ts`.
 * We don't parse real MDX here; the unified pipeline does that in the
 * integration tests below. Each test builds the minimum AST shape
 * `extractEquations` consumes (KeyEquation + biography children) and
 * asserts the populated `EquationEntry.biography` shape, plus the
 * `symbols` array harvested from the `<KeyEquation symbols={[...]}>`
 * prop per ADR 0043 §R5.
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

const jsxArrayAttr = (name: string, items: string[]): MdxAttribute => ({
  type: "mdxJsxAttribute",
  name,
  value: {
    type: "mdxJsxAttributeValueExpression",
    value: JSON.stringify(items),
  },
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

  test("ignores non-biography JSX children (framing prose + EqRef etc. don't trip the walker)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          para("Framing prose."),
          mdxBiographyChild("Observable", [], [para("Peak wavelength.")]),
          // Random non-biography JSX — should be skipped silently
          mdxBiographyChild(
            "EqRef",
            [jsxAttr("slug", "stefan-boltzmann")],
            [para("see also")]
          ),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    // Biography still extracted; non-biography children don't contribute.
    expect(entry?.biography?.observable).toBeDefined();
  });

  test("KeyEquation without biography is still a valid entry — `symbols` defaults to []", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [mathBlock("x = 1")]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.symbols).toEqual([]);
    expect(entry?.biography).toBeUndefined();
  });
});

describe("extractEquations — symbols (PR-δ' bundle per ADR 0043 §R5)", () => {
  test("harvests the `symbols` JSX array attr into EquationEntry.symbols", () => {
    const tree = root([
      mdxKeyEquation(
        [
          jsxAttr("id", "wiens-law"),
          jsxAttr("title", "Wien's Law"),
          jsxArrayAttr("symbols", ["T", "\\lambda_{peak}", "b"]),
        ],
        [mathBlock("\\lambda_{peak} = b T^{-1}")]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.symbols).toEqual(["T", "\\lambda_{peak}", "b"]);
  });

  test("symbols defaults to [] when the prop is absent (forward-compat)", () => {
    const tree = root([
      mdxKeyEquation(
        [jsxAttr("id", "wiens-law"), jsxAttr("title", "Wien's Law")],
        [mathBlock("x = 1")]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.symbols).toEqual([]);
  });

  test("symbols composes with biography — both fields populated", () => {
    const tree = root([
      mdxKeyEquation(
        [
          jsxAttr("id", "wiens-law"),
          jsxAttr("title", "Wien's Law"),
          jsxArrayAttr("symbols", ["T", "\\lambda_{peak}"]),
        ],
        [
          mathBlock("\\lambda_{peak} = b T^{-1}"),
          mdxBiographyChild("Observable", [], [para("Peak wavelength.")]),
        ]
      ),
    ]);
    const [entry] = extractEquations(tree as never, "ch");
    expect(entry?.symbols).toEqual(["T", "\\lambda_{peak}"]);
    expect(entry?.biography?.observable).toBeDefined();
  });
});
