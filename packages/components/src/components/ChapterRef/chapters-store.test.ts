import type { ChapterEntry, ModuleEntry } from "@sophie/core/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const hydrostaticEquilibrium: ChapterEntry = {
  slug: "hydrostatic-equilibrium",
  title: "Hydrostatic Equilibrium",
  module: "stellar-structure",
  order: 1,
  description: "How a star's pressure gradient balances gravity.",
};

const radiativeTransfer: ChapterEntry = {
  slug: "radiative-transfer",
  title: "Radiative Transfer",
  module: "stellar-structure",
  order: 2,
};

const stellarStructure: ModuleEntry = {
  slug: "stellar-structure",
  title: "Stellar Structure",
  order: 1,
  description: "Mechanical, energetic, and radiative balance inside stars.",
};

const galaxies: ModuleEntry = {
  slug: "galaxies",
  title: "Galaxies",
  order: 2,
};

/**
 * Tests for the `chapterStore` + `moduleStore` stores. PR-C4 (Task 6).
 *
 * Both stores wrap `createPedagogyStore<T>` (PR-C3 factory, decision
 * #4). The factory-level tests in `runtime/pedagogy-store.test.ts`
 * cover the SSR setter + script-tag auto-hydration paths in detail;
 * here we lock in the consumer-facing API (`__setChapters`,
 * `chapterStore.lookup`, parallels for modules) and the per-store
 * script-tag id contract (`sophie-pedagogy-chapters`,
 * `sophie-pedagogy-modules`) that the runtime depends on.
 */

describe("chapters-store", () => {
  beforeEach(async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  // T1.
  it("__setChapters(entries) populates the map; chapterStore.lookup returns the entry", async () => {
    const { __setChapters, chapterStore } = await import("./chapters-store.ts");

    __setChapters([hydrostaticEquilibrium, radiativeTransfer]);

    expect(chapterStore.lookup("hydrostatic-equilibrium")).toEqual(
      hydrostaticEquilibrium
    );
    expect(chapterStore.lookup("radiative-transfer")).toEqual(
      radiativeTransfer
    );
  });

  // T2.
  it("chapterStore.lookup(unknownSlug) returns undefined", async () => {
    const { __setChapters, chapterStore } = await import("./chapters-store.ts");

    __setChapters([hydrostaticEquilibrium]);

    expect(chapterStore.lookup("does-not-exist")).toBeUndefined();
  });

  // T3.
  it("a second __setChapters call overwrites prior state", async () => {
    const { __setChapters, chapterStore } = await import("./chapters-store.ts");

    __setChapters([hydrostaticEquilibrium]);
    expect(chapterStore.lookup("hydrostatic-equilibrium")).toEqual(
      hydrostaticEquilibrium
    );

    __setChapters([radiativeTransfer]);
    expect(chapterStore.lookup("hydrostatic-equilibrium")).toBeUndefined();
    expect(chapterStore.lookup("radiative-transfer")).toEqual(
      radiativeTransfer
    );
  });

  // T4.
  it("hydrates from <script id='sophie-pedagogy-chapters'> on first lookup when no SSR setter ran", async () => {
    const script = document.createElement("script");
    script.id = "sophie-pedagogy-chapters";
    script.type = "application/json";
    script.textContent = JSON.stringify([hydrostaticEquilibrium]);
    document.head.appendChild(script);

    const { chapterStore } = await import("./chapters-store.ts");

    expect(chapterStore.lookup("hydrostatic-equilibrium")).toEqual(
      hydrostaticEquilibrium
    );
    expect(chapterStore.lookup("missing")).toBeUndefined();
  });
});

describe("modules-store", () => {
  beforeEach(async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  // T1.
  it("__setModules(entries) populates the map; moduleStore.lookup returns the entry", async () => {
    const { __setModules, moduleStore } = await import("./modules-store.ts");

    __setModules([stellarStructure, galaxies]);

    expect(moduleStore.lookup("stellar-structure")).toEqual(stellarStructure);
    expect(moduleStore.lookup("galaxies")).toEqual(galaxies);
  });

  // T2.
  it("moduleStore.lookup(unknownSlug) returns undefined", async () => {
    const { __setModules, moduleStore } = await import("./modules-store.ts");

    __setModules([stellarStructure]);

    expect(moduleStore.lookup("does-not-exist")).toBeUndefined();
  });

  // T3.
  it("a second __setModules call overwrites prior state", async () => {
    const { __setModules, moduleStore } = await import("./modules-store.ts");

    __setModules([stellarStructure]);
    expect(moduleStore.lookup("stellar-structure")).toEqual(stellarStructure);

    __setModules([galaxies]);
    expect(moduleStore.lookup("stellar-structure")).toBeUndefined();
    expect(moduleStore.lookup("galaxies")).toEqual(galaxies);
  });

  // T4.
  it("hydrates from <script id='sophie-pedagogy-modules'> on first lookup when no SSR setter ran", async () => {
    const script = document.createElement("script");
    script.id = "sophie-pedagogy-modules";
    script.type = "application/json";
    script.textContent = JSON.stringify([stellarStructure, galaxies]);
    document.head.appendChild(script);

    const { moduleStore } = await import("./modules-store.ts");

    expect(moduleStore.lookup("stellar-structure")).toEqual(stellarStructure);
    expect(moduleStore.lookup("galaxies")).toEqual(galaxies);
    expect(moduleStore.lookup("missing")).toBeUndefined();
  });
});
