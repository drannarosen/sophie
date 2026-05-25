import type { FigureRegistryEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  FIGURES_VIRTUAL_ID,
  figuresVirtualModule,
} from "./figures-virtual-module.ts";

/**
 * Unit coverage for `figuresVirtualModule()` — the Vite plugin that
 * exposes the consumer-supplied figures registry as
 * `virtual:sophie/figures` (ADR 0082).
 *
 * Unlike `pedagogyIndexVirtualModule()`, this factory takes the
 * registry as an argument (consumer-supplied literal at config-parse
 * time) rather than reading from a module-level accumulator. That is
 * a deliberate trade-off — see ADR 0082 § Consequences for the HMR-
 * cost rationale.
 */

const RESOLVED_ID = `\0${FIGURES_VIRTUAL_ID}`;

const FIXTURE_REGISTRY: Record<string, FigureRegistryEntry> = {
  parallax: {
    name: "parallax",
    src: "/figures/parallax.png",
    alt: "Geometric diagram showing a nearby star shifting against a distant background as Earth orbits the Sun.",
    caption:
      "**What to notice:** The shift is small but measurable; it's the geometric foundation of the cosmic distance ladder.",
    credit: "Course illustration (A. Rosen)",
  },
  "hr-diagram": {
    name: "hr-diagram",
    src: "/figures/hr-diagram.png",
    alt: "Hertzsprung-Russell diagram with luminosity on the y-axis and effective temperature on the x-axis; the main sequence runs from upper-left to lower-right.",
    caption:
      "**What to notice:** Stars cluster on the main sequence — a one-parameter family in mass.",
  },
  "blackbody-curves": {
    name: "blackbody-curves",
    src: "/figures/blackbody.png",
    alt: "Three blackbody spectra at 3000 K, 5800 K, and 10000 K showing peak wavelengths shifting blueward with temperature.",
    caption: "**What to notice:** Wien's law in one image.",
    credit: "NIST",
  },
};

describe("figuresVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = figuresVirtualModule(FIXTURE_REGISTRY);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(FIGURES_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = figuresVirtualModule(FIXTURE_REGISTRY);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId("react")).toBeUndefined();
    expect(resolveId("./local-file.ts")).toBeUndefined();
    expect(resolveId("virtual:sophie/pedagogy-index")).toBeUndefined();
  });
});

describe("figuresVirtualModule — load", () => {
  test("emits valid JS source exporting the supplied registry", () => {
    const plugin = figuresVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    const src = load(RESOLVED_ID);

    expect(src).toBeDefined();
    expect(src).toContain("export const figures");
  });

  test("emitted source serializes every fixture entry by name", () => {
    const plugin = figuresVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    const src = load(RESOLVED_ID);

    expect(src).toBeDefined();
    expect(src).toContain('"parallax"');
    expect(src).toContain('"hr-diagram"');
    expect(src).toContain('"blackbody-curves"');
    expect(src).toContain('"/figures/parallax.png"');
    expect(src).toContain('"NIST"');
  });

  test("emitted source round-trips back to the original registry shape", () => {
    const plugin = figuresVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    const src = load(RESOLVED_ID);

    expect(src).toBeDefined();
    // Strip the `export const figures = ` prefix and trailing `;\n`
    // to recover the JSON literal.
    const match = src?.match(/export const figures = (.+);\n$/s);
    expect(match).not.toBeNull();
    const recovered = JSON.parse(match?.[1] ?? "null") as Record<
      string,
      FigureRegistryEntry
    >;
    expect(recovered).toEqual(FIXTURE_REGISTRY);
  });

  test("ignores load() calls for unrelated ids", () => {
    const plugin = figuresVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("not-the-virtual-id")).toBeUndefined();
    expect(load(`\0virtual:sophie/pedagogy-index`)).toBeUndefined();
  });

  test("emits an empty-but-valid module when the registry is empty", () => {
    const plugin = figuresVirtualModule({});
    const load = plugin.load as (id: string) => string | undefined;
    const src = load(RESOLVED_ID);

    expect(src).toBeDefined();
    expect(src).toContain("export const figures = {}");
  });
});
