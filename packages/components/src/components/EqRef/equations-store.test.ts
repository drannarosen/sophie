import type { EquationEntry } from "@sophie/core/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const wiensLaw: EquationEntry = {
  slug: "wiens-law",
  title: "Wien's Law",
  number: 2,
  tex: "\\lambda_{\\max} T = b",
  body: "<p>Peak wavelength of blackbody emission scales inversely with temperature.</p>",
  chapter: "spoiler-alerts",
  anchor: "wiens-law",
};

const inverseSquare: EquationEntry = {
  slug: "inverse-square-law",
  title: "Inverse-Square Law",
  number: 1,
  tex: "F = \\frac{L}{4\\pi r^2}",
  body: "<p>Flux falls off as the inverse square of the distance.</p>",
  chapter: "spoiler-alerts",
  anchor: "inverse-square-law",
};

describe("equations-store", () => {
  // The store keeps `equationsBySlug` and `hydratedFromScript` as
  // module-level state. T15 (script-tag auto-hydrate on first
  // lookup) needs a *pristine* module instance; we use
  // `vi.resetModules()` + dynamic import to guarantee one. T14
  // resets state explicitly via `__setEquations([])` after the
  // assertions to be a good citizen.
  beforeEach(async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("__setEquations(entries) populates the map; lookupEquation returns the entry", async () => {
    const { __setEquations, lookupEquation } = await import(
      "./equations-store.ts"
    );

    __setEquations([wiensLaw, inverseSquare]);

    expect(lookupEquation("wiens-law")).toEqual(wiensLaw);
    expect(lookupEquation("inverse-square-law")).toEqual(inverseSquare);
    expect(lookupEquation("nonexistent")).toBeUndefined();
  });

  it("hydrates from <script id='sophie-pedagogy-equations'> on first lookup when no SSR setter was called", async () => {
    const script = document.createElement("script");
    script.id = "sophie-pedagogy-equations";
    script.type = "application/json";
    script.textContent = JSON.stringify([wiensLaw]);
    document.head.appendChild(script);

    const { lookupEquation } = await import("./equations-store.ts");

    expect(lookupEquation("wiens-law")).toEqual(wiensLaw);
    expect(lookupEquation("nonexistent")).toBeUndefined();
  });
});
