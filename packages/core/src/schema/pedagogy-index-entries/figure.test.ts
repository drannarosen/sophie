import { describe, expect, it } from "vitest";
import { FigureRegistryEntrySchema } from "./figure.ts";

/**
 * ADR 0094 — the registry becomes metadata-only: a figure's asset
 * resolves from `src/figures/<name>.<ext>` by convention (optionally
 * overridden by `file`), so `src` (a public URL string) is now optional
 * and survives only as the legacy/inline escape hatch.
 */
describe("FigureRegistryEntrySchema — metadata-only (ADR 0094)", () => {
  it("accepts a metadata-only entry with no src", () => {
    const result = FigureRegistryEntrySchema.safeParse({
      name: "m51-optical-radio",
      alt: "Side-by-side optical and radio views of the Whirlpool Galaxy.",
      caption: "**What to notice:** different wavelengths, different physics.",
    });
    expect(result.success).toBe(true);
  });

  it("preserves an optional `file` override", () => {
    const result = FigureRegistryEntrySchema.safeParse({
      name: "m51",
      alt: "Whirlpool galaxy.",
      file: "m51-optical-radio.png",
    });
    expect(result.success && result.data.file).toBe("m51-optical-radio.png");
  });

  it("still accepts a legacy/inline entry that carries src", () => {
    const result = FigureRegistryEntrySchema.safeParse({
      name: "legacy",
      src: "/figures/legacy.png",
      alt: "Legacy public-URL figure.",
    });
    expect(result.success).toBe(true);
  });

  it("still requires a non-empty name and alt", () => {
    expect(FigureRegistryEntrySchema.safeParse({ alt: "x" }).success).toBe(
      false
    );
    expect(FigureRegistryEntrySchema.safeParse({ name: "x" }).success).toBe(
      false
    );
    expect(
      FigureRegistryEntrySchema.safeParse({ name: "x", alt: "" }).success
    ).toBe(false);
  });

  it("rejects an empty src when src is present", () => {
    const result = FigureRegistryEntrySchema.safeParse({
      name: "x",
      alt: "Alt",
      src: "",
    });
    expect(result.success).toBe(false);
  });
});
