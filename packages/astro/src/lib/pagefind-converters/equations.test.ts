import type { EquationEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { toEquationRecord } from "./equations.ts";

const ctx = {
  chapterTitle: "Stellar radiation",
  moduleTitle: "Stars",
  moduleSlug: "02-stars",
};

// Post-ADR-0060: registry-shaped EquationEntry. URL is `/equations/<id>`
// (registry route), not `/chapters/X#anchor`. Content aggregates title +
// tex + biography prose stripped to text.
const fixture: EquationEntry = {
  id: "stefan-boltzmann-luminosity",
  title: "Stefan-Boltzmann luminosity",
  tex: "L = 4\\pi R^2 \\sigma T^4",
  symbols: ["L", "R", "T"],
};

describe("toEquationRecord", () => {
  test("emits url at the registry route (/equations/<id>)", () => {
    expect(toEquationRecord(fixture, ctx).url).toBe(
      "/equations/stefan-boltzmann-luminosity"
    );
  });

  test("filters.type is ['equation']", () => {
    expect(toEquationRecord(fixture, ctx).filters.type).toEqual(["equation"]);
  });

  test("meta.title carries the equation title", () => {
    expect(toEquationRecord(fixture, ctx).meta.title).toBe(
      "Stefan-Boltzmann luminosity"
    );
  });

  test("meta.tex carries the raw TeX source for KaTeX render in card", () => {
    expect(toEquationRecord(fixture, ctx).meta.tex).toBe(
      "L = 4\\pi R^2 \\sigma T^4"
    );
  });

  test("meta.slug carries the equation id (registry key)", () => {
    expect(toEquationRecord(fixture, ctx).meta.slug).toBe(
      "stefan-boltzmann-luminosity"
    );
  });

  test("content includes the equation title (so prose-text search hits)", () => {
    expect(toEquationRecord(fixture, ctx).content).toContain(
      "Stefan-Boltzmann luminosity"
    );
  });

  test("strips HTML tags from biography prose in content", () => {
    const fixtureWithBiography: EquationEntry = {
      ...fixture,
      biography: {
        observable: {
          body: '<p>foo <span class="katex"><span>bar</span></span> baz</p>',
          epistemicRole: "observable",
        },
        assumptions: [],
        units: [],
        common_misuses: [],
        derivation_steps: [],
      },
    };
    const record = toEquationRecord(fixtureWithBiography, ctx);
    expect(record.content).toContain("foo");
    expect(record.content).toContain("bar");
    expect(record.content).toContain("baz");
    expect(record.content).not.toMatch(/<|>/);
  });
});
