import type {
  FigureRegistryEntry,
  FigureUsageEntry,
} from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { toFigureUsageRecord } from "./figure-usages.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const registry: FigureRegistryEntry = {
  name: "hr-diagram",
  src: "/figures/hr-diagram.svg",
  alt: "Hertzsprung-Russell diagram with main sequence highlighted",
  caption:
    "Stars cluster along the main sequence in luminosity-temperature space.",
};

const usage: FigureUsageEntry = {
  name: "hr-diagram",
  chapter: "measuring-the-sky",
  anchor: "fig-hr-diagram-1",
  number: 1,
  canonical: true,
};

describe("toFigureUsageRecord", () => {
  test("filters.type is ['figure']", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).filters.type).toEqual([
      "figure",
    ]);
  });

  test("content combines alt + registry caption (both searchable)", () => {
    const content = toFigureUsageRecord(usage, registry, ctx).content;
    expect(content).toContain(
      "Hertzsprung-Russell diagram with main sequence highlighted"
    );
    expect(content).toContain(
      "Stars cluster along the main sequence in luminosity-temperature space."
    );
  });

  test("captionOverride wins over registry caption when present", () => {
    const withOverride: FigureUsageEntry = {
      ...usage,
      captionOverride: "Per-chapter caption override.",
    };
    const content = toFigureUsageRecord(withOverride, registry, ctx).content;
    expect(content).toContain("Per-chapter caption override.");
    expect(content).not.toContain(
      "Stars cluster along the main sequence in luminosity-temperature space."
    );
  });

  test("meta.title is the figure name", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).meta.title).toBe(
      "hr-diagram"
    );
  });

  test("meta.thumbnail carries the registry src URL", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).meta.thumbnail).toBe(
      "/figures/hr-diagram.svg"
    );
  });

  test("url uses chapter slug + usage anchor", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).url).toBe(
      "/units/measuring-the-sky/reading#fig-hr-diagram-1"
    );
  });
});
