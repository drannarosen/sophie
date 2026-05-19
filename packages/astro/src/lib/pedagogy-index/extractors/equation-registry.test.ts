import type { EquationRegistryEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
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
