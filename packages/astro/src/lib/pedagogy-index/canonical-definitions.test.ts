import type { DefinitionEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { canonicalDefinitions } from "./canonical-definitions.ts";

function def(
  slug: string,
  unit: string,
  canonical: boolean,
  term = slug
): DefinitionEntry {
  return { term, slug, body: `${unit} body`, unit, anchor: slug, canonical };
}

describe("canonicalDefinitions (ADR 0086 course-glossary dedup)", () => {
  test("dedupes to one entry per slug", () => {
    const out = canonicalDefinitions([
      def("kirchhoff", "ch-a", false),
      def("kirchhoff", "ch-b", false),
      def("flux", "ch-a", false),
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((d) => d.slug).sort()).toEqual(["flux", "kirchhoff"]);
  });

  test("first-accumulated wins when no chapter is canonical", () => {
    const out = canonicalDefinitions([
      def("kirchhoff", "ch-a", false),
      def("kirchhoff", "ch-b", false),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.unit).toBe("ch-a");
  });

  test("explicit canonical wins regardless of order", () => {
    const out = canonicalDefinitions([
      def("kirchhoff", "ch-a", false),
      def("kirchhoff", "ch-b", true),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.unit).toBe("ch-b");
  });

  test("canonical earlier in the list still wins over a later non-canonical", () => {
    const out = canonicalDefinitions([
      def("kirchhoff", "ch-b", true),
      def("kirchhoff", "ch-a", false),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.unit).toBe("ch-b");
  });
});
