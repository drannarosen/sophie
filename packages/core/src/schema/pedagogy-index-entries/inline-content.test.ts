import { describe, expect, it } from "vitest";
import { KeyInsightEntrySchema } from "./inline-content.ts";

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
