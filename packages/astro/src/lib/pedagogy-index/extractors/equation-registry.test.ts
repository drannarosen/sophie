import type { EquationRegistryEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { formatUnitTex } from "../../math-render/format-unit-tex.ts";
import { renderMath } from "../../math-render/render-math.ts";
import { para, root } from "../_test-helpers.ts";
import {
  extractEquationRegistryDeclaration,
  resetIndexAccumulator,
} from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("extractEquationRegistryDeclaration (pure, registry walker)", () => {
  const validFrontmatter: EquationRegistryEntry = {
    id: "wiens-law",
    title: "Wien's Law",
    tex: "\\lambda_{peak} = b T^{-1}",
    symbols: ["T", "\\lambda_{peak}"],
  };

  test("returns the frontmatter unchanged when body has no biography children", () => {
    const tree = root([para("Some prose without biography children.")]);
    const entry = extractEquationRegistryDeclaration(
      tree as never,
      validFrontmatter
    );
    expect(entry.id).toBe("wiens-law");
    expect(entry.title).toBe("Wien's Law");
    expect(entry.tex).toBe("\\lambda_{peak} = b T^{-1}");
    expect(entry.symbols).toEqual(["T", "\\lambda_{peak}"]);
    expect(entry.biography).toBeUndefined();
  });

  test("walks Root.children for biography (no <KeyEquation> wrapper required)", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "Observable",
        attributes: [],
        children: [para("Peak wavelength of thermal emission.")],
      },
      {
        type: "mdxJsxFlowElement",
        name: "Assumption",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "type",
            value: "thermal-equilibrium",
          },
        ],
        children: [para("LTE.")],
      },
      {
        type: "mdxJsxFlowElement",
        name: "BreaksWhen",
        attributes: [],
        children: [para("Non-thermal emission.")],
      },
    ]);
    const entry = extractEquationRegistryDeclaration(
      tree as never,
      validFrontmatter
    );
    expect(entry.biography).toBeDefined();
    expect(entry.biography?.observable?.epistemicRole).toBe("observable");
    expect(entry.biography?.assumptions).toHaveLength(1);
    expect(entry.biography?.assumptions[0]?.type).toBe("thermal-equilibrium");
    expect(entry.biography?.breaks_when?.epistemicRole).toBe("approximation");
  });

  test("composes constants/rearranged_forms/related from frontmatter through to entry", () => {
    const frontmatter: EquationRegistryEntry = {
      ...validFrontmatter,
      constants: [{ symbol: "b", value: "0.29", unit: "cm K" }],
      rearranged_forms: [
        { tex: "T = b \\lambda_{peak}^{-1}", solves_for: "T" },
      ],
      related: [{ refId: "stefan-boltzmann", kind: "see-also" }],
    };
    const tree = root([]);
    const entry = extractEquationRegistryDeclaration(
      tree as never,
      frontmatter
    );
    expect(entry.constants).toHaveLength(1);
    expect(entry.rearranged_forms).toHaveLength(1);
    expect(entry.related).toHaveLength(1);
  });
});

describe("extractEquationRegistryDeclaration prerendered html (ADR 0090)", () => {
  const frontmatter: EquationRegistryEntry = {
    id: "wiens-law",
    title: "Wien's Law",
    tex: "\\lambda_{peak} = b T^{-1}",
    symbols: ["T", "\\lambda_{peak}"],
    constants: [{ symbol: "b", value: "0.29", unit: "cm s^{-1}" }],
    rearranged_forms: [{ tex: "T = b \\lambda_{peak}^{-1}", solves_for: "T" }],
  };

  test("bakes display-mode html on the primary equation", () => {
    const entry = extractEquationRegistryDeclaration(
      root([]) as never,
      frontmatter
    );
    expect(entry.html).toContain('class="katex"');
    // Display mode differs from an inline render of the same latex.
    expect(entry.html).not.toBe(renderMath(frontmatter.tex).html);
    expect(entry.html).toBe(
      renderMath(frontmatter.tex, { displayMode: true }).html
    );
  });

  test("bakes display-mode html on each rearranged form", () => {
    const entry = extractEquationRegistryDeclaration(
      root([]) as never,
      frontmatter
    );
    expect(entry.rearranged_forms?.[0]?.html).toContain('class="katex"');
    expect(entry.rearranged_forms?.[0]?.html).toBe(
      renderMath("T = b \\lambda_{peak}^{-1}", { displayMode: true }).html
    );
  });

  test("bakes inline-mode symbol/value/unit html on each constant", () => {
    const entry = extractEquationRegistryDeclaration(
      root([]) as never,
      frontmatter
    );
    const c = entry.constants?.[0];
    expect(c?.symbol_html).toContain('class="katex"');
    expect(c?.value_html).toContain('class="katex"');
    expect(c?.unit_html).toContain('class="katex"');
    expect(c?.symbol_html).toBe(renderMath("b", { displayMode: false }).html);
    expect(c?.unit_html).toBe(
      renderMath(formatUnitTex("cm s^{-1}"), { displayMode: false }).html
    );
  });

  test("omits unit_html when the constant has no unit", () => {
    const entry = extractEquationRegistryDeclaration(root([]) as never, {
      ...frontmatter,
      constants: [{ symbol: "b", value: "0.29" }],
    });
    const c = entry.constants?.[0];
    expect(c?.symbol_html).toBeDefined();
    expect(c?.unit_html).toBeUndefined();
  });
});
