import { describe, expect, it } from "vitest";
import { isFigureFile, resolveFigureFile } from "./resolve-figure-file.ts";

/**
 * ADR 0094 — the figure name→file resolution *convention* lives here as
 * one authority (Anna-approved extraction, 2026-05-30): both the
 * build-time codegen (`@sophie/astro` figures virtual module) and the
 * `sophie figures check` CLI audit resolve through this function, so the
 * two can never silently disagree about which master backs a registry
 * entry.
 *
 * Convention: an explicit `file` wins; otherwise the registry name
 * resolves by `<name>.<ext>` against the available files. Returns
 * `undefined` when no master matches (a legacy/inline `src` entry).
 * Throws on an explicit-but-missing `file` and on an ambiguous
 * convention match (multiple extensions for one name).
 */
describe("resolveFigureFile (ADR 0094)", () => {
  it("returns the explicit `file` when present in availableFiles", () => {
    expect(
      resolveFigureFile({ name: "m51", file: "m51-optical-radio.png" }, [
        "m51-optical-radio.png",
        "other.png",
      ])
    ).toBe("m51-optical-radio.png");
  });

  it("throws when an explicit `file` is absent from availableFiles", () => {
    expect(() =>
      resolveFigureFile({ name: "m51", file: "missing.png" }, ["other.png"])
    ).toThrow(/file "missing\.png"/);
  });

  it("resolves by <name>.<ext> convention when no explicit file", () => {
    expect(
      resolveFigureFile({ name: "ngc1300" }, ["ngc1300.jpg", "m51.png"])
    ).toBe("ngc1300.jpg");
  });

  it("returns undefined when no master matches the name (legacy/inline)", () => {
    expect(
      resolveFigureFile({ name: "external-logo" }, ["m51.png"])
    ).toBeUndefined();
  });

  it("throws on an ambiguous convention match (two extensions, one name)", () => {
    expect(() =>
      resolveFigureFile({ name: "m51" }, ["m51.png", "m51.webp"])
    ).toThrow(/multiple files/);
  });
});

describe("isFigureFile (ADR 0094 — shared supported-extension set)", () => {
  it("accepts the raster + vector formats astro:assets handles", () => {
    for (const f of [
      "m51.png",
      "m51.jpg",
      "m51.jpeg",
      "m51.webp",
      "m51.avif",
      "m51.gif",
      "m51.svg",
    ]) {
      expect(isFigureFile(f)).toBe(true);
    }
  });

  it("is case-insensitive on the extension", () => {
    expect(isFigureFile("M51.PNG")).toBe(true);
    expect(isFigureFile("photo.JPEG")).toBe(true);
  });

  it("rejects non-image files and extension-less names", () => {
    expect(isFigureFile("notes.txt")).toBe(false);
    expect(isFigureFile("figures.ts")).toBe(false);
    expect(isFigureFile("m51")).toBe(false);
  });
});
