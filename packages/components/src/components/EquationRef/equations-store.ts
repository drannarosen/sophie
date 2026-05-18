import type { EquationEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Equations store. Per ADR 0038 and PR-C3 decision #4
 * (`createPedagogyStore<T>` factory): the SSR setter +
 * client-side-script-tag-hydration boilerplate previously duplicated
 * across definitions-store + equations-store now lives in the
 * shared factory in `../../runtime/pedagogy-store.ts`. The external
 * API (`__setEquations`, `lookupEquation`) is unchanged.
 */

const store = createPedagogyStore<EquationEntry>({
  scriptId: "sophie-pedagogy-equations",
  logTag: "[EquationRef]",
  keyOf: (e) => e.id,
});

export const __setEquations = store.set;
export const lookupEquation = store.lookup;
