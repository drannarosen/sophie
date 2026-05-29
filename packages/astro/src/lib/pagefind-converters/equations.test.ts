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

  test("meta.html carries the build-time prerendered html (ADR 0090)", () => {
    const fixtureWithHtml: EquationEntry = {
      ...fixture,
      html: '<span class="katex katex-display">…</span>',
    };
    expect(toEquationRecord(fixtureWithHtml, ctx).meta.html).toBe(
      '<span class="katex katex-display">…</span>'
    );
  });

  test("omits meta.html when the entry carries no prerendered html", () => {
    expect(toEquationRecord(fixture, ctx).meta.html).toBeUndefined();
  });

  test("meta.speech carries the build-time SRE speech (ADR 0089)", () => {
    const fixtureWithSpeech: EquationEntry = {
      ...fixture,
      speech: "L equals 4 pi R squared sigma T to the fourth power",
    };
    expect(toEquationRecord(fixtureWithSpeech, ctx).meta.speech).toBe(
      "L equals 4 pi R squared sigma T to the fourth power"
    );
  });

  test("omits meta.speech when the entry carries no speech", () => {
    expect(toEquationRecord(fixture, ctx).meta.speech).toBeUndefined();
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
