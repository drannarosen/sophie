import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator (cross-chapter)", () => {
  // Top-level beforeEach wipes accumulator state before each test.

  test("aggregates definitions from multiple chapters", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Parallax",
        slug: "parallax",
        body: "",
        unit: "ch-a",
        anchor: "parallax",
        canonical: false,
      },
    ]);
    indexAccumulator.addDefinitions([
      {
        term: "Flux",
        slug: "flux",
        body: "",
        unit: "ch-b",
        anchor: "flux",
        canonical: false,
      },
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.definitions).toHaveLength(2);
    const terms = index.definitions.map((d) => d.term).sort();
    expect(terms).toEqual(["Flux", "Parallax"]);
  });

  test("ADR 0086: same slug in multiple chapters is allowed; both entries retained", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Kirchhoff's laws",
        slug: "kirchhoffs-laws",
        body: "L4 wording",
        unit: "ch-a",
        anchor: "kirchhoffs-laws",
        canonical: false,
      },
    ]);

    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Kirchhoff's laws",
          slug: "kirchhoffs-laws",
          body: "M2-L3 wording",
          unit: "ch-b",
          anchor: "kirchhoffs-laws",
          canonical: false,
        },
      ])
    ).not.toThrow();

    const index = indexAccumulator.asPedagogyIndex();
    const both = index.definitions.filter((d) => d.slug === "kirchhoffs-laws");
    expect(both).toHaveLength(2);
    expect(both.map((d) => d.unit).sort()).toEqual(["ch-a", "ch-b"]);
  });

  test("ADR 0086: two chapters marking one slug canonical throws", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Blackbody",
        slug: "blackbody",
        body: "",
        unit: "ch-a",
        anchor: "blackbody",
        canonical: true,
      },
    ]);

    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Blackbody",
          slug: "blackbody",
          body: "",
          unit: "ch-b",
          anchor: "blackbody",
          canonical: true,
        },
      ])
    ).toThrow(/canonical in multiple chapters/i);
  });

  test("ADR 0086: one canonical + one non-canonical for a slug is fine", () => {
    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Spectroscopy",
          slug: "spectroscopy",
          body: "",
          unit: "ch-a",
          anchor: "spectroscopy",
          canonical: true,
        },
        {
          term: "Spectroscopy",
          slug: "spectroscopy",
          body: "",
          unit: "ch-b",
          anchor: "spectroscopy",
          canonical: false,
        },
      ])
    ).not.toThrow();
  });

  test("clearUnit removes only that chapter's entries", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Alpha",
        slug: "alpha",
        body: "",
        unit: "ch-a",
        anchor: "alpha",
        canonical: false,
      },
      {
        term: "Beta",
        slug: "beta",
        body: "",
        unit: "ch-b",
        anchor: "beta",
        canonical: false,
      },
    ]);

    indexAccumulator.clearUnit("ch-a");
    const index = indexAccumulator.asPedagogyIndex();
    const inA = index.definitions.filter((d) => d.unit === "ch-a");
    const inB = index.definitions.filter((d) => d.unit === "ch-b");
    expect(inA).toHaveLength(0);
    expect(inB).toHaveLength(1);
  });

  test("re-adding a chapter's entries after clearUnit does not throw", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Gamma",
        slug: "gamma",
        body: "",
        unit: "ch-a",
        anchor: "gamma",
        canonical: true,
      },
    ]);
    indexAccumulator.clearUnit("ch-a");

    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Gamma",
          slug: "gamma",
          body: "",
          unit: "ch-a",
          anchor: "gamma",
          canonical: true,
        },
      ])
    ).not.toThrow();
  });
});
