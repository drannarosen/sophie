import type { ObjectiveEntry } from "@sophie/core/schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const photons: ObjectiveEntry = {
  id: "lo-1",
  verb: "Recognize",
  body: "Photons carry energy quanta.",
  unit: "spoiler-alerts",
  anchor: "lo-lo-1",
};

const wavelengths: ObjectiveEntry = {
  id: "lo-2",
  verb: "Understand",
  body: "Wavelength is the spatial period of an EM wave.",
  unit: "spoiler-alerts",
  anchor: "lo-lo-2",
};

/**
 * Tests for the `objectiveStore` (PR-C4 Task 7). Mirrors
 * `chapters-store.test.ts` / `modules-store.test.ts` — locks in the
 * consumer-facing API (`__setObjectives`, `objectiveStore.lookup`) and
 * the per-store script-tag id contract (`sophie-pedagogy-objectives`)
 * that the runtime depends on.
 *
 * Per-store factory-level tests live in
 * `runtime/pedagogy-store.test.ts`; this file covers the per-role
 * wiring only.
 */

describe("objectives-store", () => {
  beforeEach(async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("__setObjectives(entries) populates the map; objectiveStore.lookup returns the entry", async () => {
    const { __setObjectives, objectiveStore } = await import(
      "./objectives-store.ts"
    );

    __setObjectives([photons, wavelengths]);

    expect(objectiveStore.lookup("lo-lo-1")).toEqual(photons);
    expect(objectiveStore.lookup("lo-lo-2")).toEqual(wavelengths);
  });

  it("objectiveStore.lookup(unknownAnchor) returns undefined", async () => {
    const { __setObjectives, objectiveStore } = await import(
      "./objectives-store.ts"
    );

    __setObjectives([photons]);

    expect(objectiveStore.lookup("lo-missing")).toBeUndefined();
  });

  it("a second __setObjectives call overwrites prior state", async () => {
    const { __setObjectives, objectiveStore } = await import(
      "./objectives-store.ts"
    );

    __setObjectives([photons]);
    expect(objectiveStore.lookup("lo-lo-1")).toEqual(photons);

    __setObjectives([wavelengths]);
    expect(objectiveStore.lookup("lo-lo-1")).toBeUndefined();
    expect(objectiveStore.lookup("lo-lo-2")).toEqual(wavelengths);
  });

  it("hydrates from <script id='sophie-pedagogy-objectives'> on first lookup when no SSR setter ran", async () => {
    const script = document.createElement("script");
    script.id = "sophie-pedagogy-objectives";
    script.type = "application/json";
    script.textContent = JSON.stringify([photons]);
    document.head.appendChild(script);

    const { objectiveStore } = await import("./objectives-store.ts");

    expect(objectiveStore.lookup("lo-lo-1")).toEqual(photons);
    expect(objectiveStore.lookup("lo-missing")).toBeUndefined();
  });
});
