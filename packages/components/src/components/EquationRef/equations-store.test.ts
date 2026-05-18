import type { EquationEntry } from "@sophie/core/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const wiensLaw: EquationEntry = {
  id: "wiens-law",
  title: "Wien's Law",
  tex: "\\lambda_{\\max} T = b",
  symbols: ["T", "\\lambda_{\\max}"],
};

const inverseSquare: EquationEntry = {
  id: "inverse-square-law",
  title: "Inverse-Square Law",
  tex: "F = \\frac{L}{4\\pi r^2}",
  symbols: ["F", "L", "r"],
};

describe("equations-store", () => {
  // The store keeps `equationsById` and `hydratedFromScript` as
  // module-level state. The script-tag auto-hydrate-on-first-lookup
  // test needs a *pristine* module instance; we use `vi.resetModules()`
  // + dynamic import to guarantee one.
  beforeEach(async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("__setEquations(entries) populates the map; lookupEquation returns the entry by id", async () => {
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
