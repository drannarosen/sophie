import type {
  FigureRegistryEntry,
  FigureUsageEntry,
} from "@sophie/core/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const cosmicDistanceLadder: FigureRegistryEntry = {
  name: "cosmic-distance-ladder",
  src: "/images/cosmic-distance-ladder.svg",
  alt: "Schematic of the cosmic distance ladder: parallax, standard candles, redshift.",
  caption: "The cosmic distance ladder.",
  credit: "Sophie / ASTR-201",
};

const m51: FigureRegistryEntry = {
  name: "m51-optical-radio",
  src: "/images/m51-optical-radio.png",
  alt: "Side-by-side optical and radio images of M51.",
  caption: "M51 in optical (left) and 21-cm radio (right).",
};

const ladderCh1: FigureUsageEntry = {
  name: "cosmic-distance-ladder",
  unit: "spoiler-alerts",
  anchor: "fig-cosmic-distance-ladder",
  number: 1,
  canonical: true,
};

const ladderCh2: FigureUsageEntry = {
  name: "cosmic-distance-ladder",
  unit: "standard-candles",
  anchor: "fig-cosmic-distance-ladder-2",
  number: 3,
  canonical: false,
};

const m51Ch1: FigureUsageEntry = {
  name: "m51-optical-radio",
  unit: "spoiler-alerts",
  anchor: "fig-m51-optical-radio",
  number: 2,
  canonical: false,
};

const m51Ch2: FigureUsageEntry = {
  name: "m51-optical-radio",
  unit: "galaxies",
  anchor: "fig-m51-again",
  number: 1,
  canonical: false,
};

describe("figure-registry-store", () => {
  // The store keeps `byKey` + `hydratedFromScript` as module-level
  // state. We use `vi.resetModules()` + dynamic import to guarantee
  // a pristine module instance per test (parallels
  // equations-store.test.ts).
  beforeEach(async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  // T18 (registry side).
  it("__setFigureRegistry(entries) populates the map; lookupFigureRegistry returns the entry", async () => {
    const { __setFigureRegistry, lookupFigureRegistry } = await import(
      "./figure-registry-store.ts"
    );

    __setFigureRegistry([cosmicDistanceLadder, m51]);

    expect(lookupFigureRegistry("cosmic-distance-ladder")).toEqual(
      cosmicDistanceLadder
    );
    expect(lookupFigureRegistry("m51-optical-radio")).toEqual(m51);
    expect(lookupFigureRegistry("nonexistent")).toBeUndefined();
  });

  it("throws on a duplicate figure name (PR β.3 — names are unique by contract)", async () => {
    const { __setFigureRegistry } = await import("./figure-registry-store.ts");

    const ladderDup: FigureRegistryEntry = {
      ...m51,
      name: "cosmic-distance-ladder", // collides with cosmicDistanceLadder
    };

    expect(() =>
      __setFigureRegistry([cosmicDistanceLadder, ladderDup])
    ).toThrowError(/cosmic-distance-ladder/);
  });

  it("hydrates from <script id='sophie-figure-registry'> on first lookup when no SSR setter was called", async () => {
    const script = document.createElement("script");
    script.id = "sophie-figure-registry";
    script.type = "application/json";
    script.textContent = JSON.stringify([cosmicDistanceLadder]);
    document.head.appendChild(script);

    const { lookupFigureRegistry } = await import("./figure-registry-store.ts");

    expect(lookupFigureRegistry("cosmic-distance-ladder")).toEqual(
      cosmicDistanceLadder
    );
    expect(lookupFigureRegistry("nonexistent")).toBeUndefined();
  });
});

describe("figure-usages-store", () => {
  beforeEach(async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  // T18 (usages side).
  it("__setFigureUsages populates the composite-key map; lookupFigureUsage resolves by chapter+name", async () => {
    const { __setFigureUsages, lookupFigureUsage } = await import(
      "./figure-usages-store.ts"
    );

    __setFigureUsages([ladderCh1, ladderCh2, m51Ch1]);

    expect(lookupFigureUsage("spoiler-alerts#cosmic-distance-ladder")).toEqual(
      ladderCh1
    );
    expect(
      lookupFigureUsage("standard-candles#cosmic-distance-ladder")
    ).toEqual(ladderCh2);
    expect(lookupFigureUsage("spoiler-alerts#m51-optical-radio")).toEqual(
      m51Ch1
    );
    expect(lookupFigureUsage("nope#nope")).toBeUndefined();
  });

  // T19 — canonical resolution: explicit-canonical entry wins.
  it("lookupCanonicalUsageByName returns the explicit-canonical entry when present", async () => {
    const { __setFigureUsages, lookupCanonicalUsageByName } = await import(
      "./figure-usages-store.ts"
    );

    // ladderCh1.canonical === true, ladderCh2.canonical === false.
    __setFigureUsages([ladderCh2, ladderCh1]); // order shouldn't matter

    expect(lookupCanonicalUsageByName("cosmic-distance-ladder")).toEqual(
      ladderCh1
    );
  });

  // T20 — fallback: no canonical → first by (chapter, number) sort.
  it("lookupCanonicalUsageByName falls back to first-by-(chapter,number) when no canonical flag", async () => {
    const { __setFigureUsages, lookupCanonicalUsageByName } = await import(
      "./figure-usages-store.ts"
    );

    // Neither m51 usage is canonical. Chapters: "galaxies" < "spoiler-alerts"
    // alphabetically, so m51Ch2 (unit="galaxies") should win.
    __setFigureUsages([m51Ch1, m51Ch2]);

    expect(lookupCanonicalUsageByName("m51-optical-radio")).toEqual(m51Ch2);
  });

  it("lookupCanonicalUsageByName returns undefined for an unknown name", async () => {
    const { __setFigureUsages, lookupCanonicalUsageByName } = await import(
      "./figure-usages-store.ts"
    );

    __setFigureUsages([ladderCh1]);

    expect(lookupCanonicalUsageByName("nonexistent")).toBeUndefined();
  });

  it("hydrates the composite-key map from <script id='sophie-pedagogy-figure-usages'> on first lookup", async () => {
    const script = document.createElement("script");
    script.id = "sophie-pedagogy-figure-usages";
    script.type = "application/json";
    script.textContent = JSON.stringify([ladderCh1, m51Ch1]);
    document.head.appendChild(script);

    const { lookupFigureUsage } = await import("./figure-usages-store.ts");

    expect(lookupFigureUsage("spoiler-alerts#cosmic-distance-ladder")).toEqual(
      ladderCh1
    );
    expect(lookupFigureUsage("spoiler-alerts#m51-optical-radio")).toEqual(
      m51Ch1
    );
  });

  it("lookupCanonicalUsageByName hydrates the all-usages snapshot from the script tag on first call", async () => {
    const script = document.createElement("script");
    script.id = "sophie-pedagogy-figure-usages";
    script.type = "application/json";
    script.textContent = JSON.stringify([ladderCh1, ladderCh2]);
    document.head.appendChild(script);

    const { lookupCanonicalUsageByName } = await import(
      "./figure-usages-store.ts"
    );

    // Auto-hydrate path: no __set* call ran; the canonical helper
    // should still resolve via the script-tag fallback (decision
    // documented in figure-usages-store.ts).
    expect(lookupCanonicalUsageByName("cosmic-distance-ladder")).toEqual(
      ladderCh1
    );
  });
});
