import { describe, expect, it } from "vitest";
import {
  KeyInsightEntrySchema,
  MisconceptionEntrySchema,
} from "./inline-content.ts";

describe("KeyInsightEntrySchema slug derivation (W4c D4)", () => {
  it("requires a slug field", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "ki-1",
      title: "Light is information",
      body: "<p>...</p>",
      slug: "light-is-information",
    };
    expect(KeyInsightEntrySchema.parse(entry).slug).toBe(
      "light-is-information"
    );
  });

  it("rejects entries without slug", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "ki-1",
      body: "<p>...</p>",
    };
    expect(() => KeyInsightEntrySchema.parse(entry)).toThrow();
  });

  it("rejects entries with malformed slug (Slug primitive contract)", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "ki-1",
      title: "Light is information",
      body: "<p>Light carries data about distant sources.</p>",
      slug: "Light Is Information",
    };
    expect(() => KeyInsightEntrySchema.parse(entry)).toThrow();
  });
});

describe("MisconceptionEntrySchema slug derivation (W4c Batch 1b)", () => {
  it("requires a slug field", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "misc-1",
      length: "short" as const,
      label: "Heavier falls faster",
      body: "<p>...</p>",
      slug: "heavier-falls-faster",
    };
    expect(MisconceptionEntrySchema.parse(entry).slug).toBe(
      "heavier-falls-faster"
    );
  });

  it("rejects entries without slug", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "misc-1",
      length: "short" as const,
      body: "<p>...</p>",
    };
    expect(() => MisconceptionEntrySchema.parse(entry)).toThrow();
  });

  it("rejects entries with malformed slug (Slug primitive contract)", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "misc-1",
      length: "short" as const,
      label: "Heavier falls faster",
      body: "<p>Galileo showed otherwise.</p>",
      slug: "Heavier Falls Faster",
    };
    expect(() => MisconceptionEntrySchema.parse(entry)).toThrow();
  });
});
