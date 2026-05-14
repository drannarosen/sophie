import type { DefinitionEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Glossary definitions store. Per ADR 0038 and PR-C3 decision #4
 * (`createPedagogyStore<T>` factory): the SSR setter +
 * client-side-script-tag-hydration boilerplate previously duplicated
 * across definitions-store + equations-store now lives in the
 * shared factory in `../../runtime/pedagogy-store.ts`. The external
 * API (`__setGlossaryDefinitions`, `lookupDefinition`) is unchanged.
 */

const store = createPedagogyStore<DefinitionEntry>({
  scriptId: "sophie-pedagogy-definitions",
  logTag: "[GlossaryTerm]",
  keyOf: (d) => d.slug,
});

export const __setGlossaryDefinitions = store.set;
export const lookupDefinition = store.lookup;
