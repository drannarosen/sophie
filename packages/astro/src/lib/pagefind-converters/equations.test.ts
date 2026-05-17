import type { EquationEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { toEquationRecord } from "./equations.ts";

const ctx = {
  chapterTitle: "Stellar radiation",
  moduleTitle: "Stars",
  moduleSlug: "02-stars",
};

const fixture: EquationEntry = {
  slug: "stefan-boltzmann-luminosity",
  title: "Stefan-Boltzmann luminosity",
  number: 12,
  tex: "L = 4\\pi R^2 \\sigma T^4",
  body: "<p>The Stefan-Boltzmann law for stellar luminosity.</p>",
  chapter: "stellar-radiation",
  anchor: "stefan-boltzmann-luminosity",
  symbols: [],
};

describe("toEquationRecord", () => {
  test("emits url with anchor", () => {
    expect(toEquationRecord(fixture, ctx).url).toBe(
      "/chapters/stellar-radiation#stefan-boltzmann-luminosity"
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

  test("meta.number carries the per-chapter sequence number", () => {
    expect(toEquationRecord(fixture, ctx).meta.number).toBe("12");
  });

  test("content includes the equation title (so prose-text search hits)", () => {
    expect(toEquationRecord(fixture, ctx).content).toContain(
      "Stefan-Boltzmann luminosity"
    );
  });

  test("strips HTML tags from body in content", () => {
    const html = '<p>foo <span class="katex"><span>bar</span></span> baz</p>';
    const htmlFixture: EquationEntry = { ...fixture, body: html };
    const record = toEquationRecord(htmlFixture, ctx);
    expect(record.content).toContain("foo");
    expect(record.content).toContain("bar");
    expect(record.content).toContain("baz");
    expect(record.content).not.toMatch(/<|>/);
  });
});
