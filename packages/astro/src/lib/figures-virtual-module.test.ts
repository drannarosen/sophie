import type { FigureRegistryEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  FIGURES_VIRTUAL_ID,
  figuresVirtualModule,
  generateFiguresModuleSource,
} from "./figures-virtual-module.ts";

/**
 * Unit coverage for `figuresVirtualModule()` / `generateFiguresModuleSource()`
 * — the Vite plugin + pure codegen that expose the consumer figures
 * registry as `virtual:sophie/figures` (ADR 0082 + ADR 0094).
 *
 * Per ADR 0094 (Approach A — single resolved registry) the module now
 * emits generated `astro:assets` image imports and derives each
 * optimized entry's `src`/`width`/`height` from the live `ImageMetadata`
 * binding, exporting BOTH `figures` (JSON-shaped, for the SSR-setter →
 * FigureRef store + accumulator → pagefind paths) and `figureAssets`
 * (live `ImageMetadata`, server-only, for `<Picture>` in FigureImage).
 */

const FIGURES_DIR = "/abs/consumer/src/figures";
const RESOLVED_ID = `\0${FIGURES_VIRTUAL_ID}`;

const REGISTRY: Record<string, FigureRegistryEntry> = {
  // Optimized by convention (m51.png present in src/figures).
  m51: {
    name: "m51",
    alt: "Whirlpool galaxy, optical + radio.",
    caption: "**What to notice:** different wavelengths, different physics.",
    credit: "NASA",
  },
  // Optimized via explicit `file` override.
  parallax: {
    name: "parallax",
    alt: "Parallax geometry diagram.",
    file: "parallax-diagram.png",
  },
  // Legacy/inline: public URL, no master in src/figures.
  "legacy-logo": {
    name: "legacy-logo",
    src: "/figures/legacy-logo.svg",
    alt: "A public/ logo bypassing optimization.",
  },
};

const AVAILABLE = ["m51.png", "parallax-diagram.png", "unused-orphan.png"];

describe("figuresVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = figuresVirtualModule(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(FIGURES_VIRTUAL_ID)).toBe(RESOLVED_ID);
    expect(resolveId("react")).toBeUndefined();
  });
});

describe("generateFiguresModuleSource — optimized entries", () => {
  test("emits a generated import for a convention-resolved master", () => {
    const src = generateFiguresModuleSource(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    expect(src).toContain(`from "${FIGURES_DIR}/m51.png"`);
  });

  test("uses the explicit `file` override for the import path", () => {
    const src = generateFiguresModuleSource(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    expect(src).toContain(`from "${FIGURES_DIR}/parallax-diagram.png"`);
  });

  test("exports a figureAssets map keyed by registry name → live binding", () => {
    const src = generateFiguresModuleSource(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    expect(src).toContain("export const figureAssets");
    // Each optimized key binds to an import identifier (not a string).
    expect(src).toMatch(/"m51":\s*a\d+/);
    expect(src).toMatch(/"parallax":\s*a\d+/);
  });

  test("derives src/width/height from the ImageMetadata binding, not a literal", () => {
    const src = generateFiguresModuleSource(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    // optimized `figures.m51.src` references <binding>.src
    expect(src).toMatch(/"src":\s*a\d+\.src/);
    expect(src).toMatch(/"width":\s*a\d+\.width/);
    expect(src).toMatch(/"height":\s*a\d+\.height/);
    // metadata fields stay literal
    expect(src).toContain('"credit": "NASA"');
  });

  test("an optimized entry carries no literal `src` string in figures", () => {
    const src = generateFiguresModuleSource(
      { m51: REGISTRY.m51 as FigureRegistryEntry },
      { figuresDir: FIGURES_DIR, availableFiles: ["m51.png"] }
    );
    // no `/figures/...` public URL string for the optimized entry
    expect(src).not.toContain('"src": "/');
  });
});

describe("generateFiguresModuleSource — legacy/inline entries", () => {
  test("keeps a literal src and omits it from figureAssets", () => {
    const src = generateFiguresModuleSource(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    expect(src).toContain("/figures/legacy-logo.svg");
    // legacy key is absent from the asset map
    expect(src).not.toMatch(/"legacy-logo":\s*a\d+/);
  });
});

describe("generateFiguresModuleSource — build guards", () => {
  test("throws when an explicit `file` is not present in src/figures", () => {
    expect(() =>
      generateFiguresModuleSource(
        {
          x: { name: "x", alt: "Alt", file: "missing.png" },
        },
        { figuresDir: FIGURES_DIR, availableFiles: ["m51.png"] }
      )
    ).toThrowError(/missing\.png/);
  });

  test("throws when a metadata-only entry has no resolvable asset and no src", () => {
    expect(() =>
      generateFiguresModuleSource(
        { ghost: { name: "ghost", alt: "Alt" } },
        { figuresDir: FIGURES_DIR, availableFiles: [] }
      )
    ).toThrowError(/ghost/);
  });

  test("throws when the convention matches multiple extensions", () => {
    expect(() =>
      generateFiguresModuleSource(
        { dup: { name: "dup", alt: "Alt" } },
        { figuresDir: FIGURES_DIR, availableFiles: ["dup.png", "dup.jpg"] }
      )
    ).toThrowError(/dup/);
  });

  test("throws when an entry key does not match its `name` field", () => {
    expect(() =>
      generateFiguresModuleSource(
        { "wrong-key": { name: "m51", alt: "Alt" } },
        { figuresDir: FIGURES_DIR, availableFiles: ["m51.png"] }
      )
    ).toThrowError(/wrong-key.*m51/);
  });
});

describe("figuresVirtualModule — load", () => {
  test("load() returns the generated module for the resolved id", () => {
    const plugin = figuresVirtualModule(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    const load = plugin.load as (id: string) => string | undefined;
    const src = load(RESOLVED_ID);
    expect(src).toBeDefined();
    expect(src).toContain("export const figures");
    expect(src).toContain("export const figureAssets");
  });

  test("ignores unrelated ids", () => {
    const plugin = figuresVirtualModule(REGISTRY, {
      figuresDir: FIGURES_DIR,
      availableFiles: AVAILABLE,
    });
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("not-the-virtual-id")).toBeUndefined();
  });

  test("emits empty-but-valid maps for an empty registry", () => {
    const src = generateFiguresModuleSource(
      {},
      { figuresDir: FIGURES_DIR, availableFiles: [] }
    );
    expect(src).toContain("export const figures = {");
    expect(src).toContain("export const figureAssets = {");
  });
});
