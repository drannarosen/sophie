import type { FigureRegistryEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Figure registry store — keyed by figure `name` (flat namespace).
 * Per ADR 0038 + PR-C3 decisions #3 (two-tier figures) and #4
 * (createPedagogyStore factory): the consumer app owns the
 * registry source-of-truth in `src/content/figures.ts`;
 * @sophie/astro's <TextbookLayout> forwards it to `__setFigureRegistry`
 * at SSR. Client-side renders rely on auto-hydration from the
 * `<script id="sophie-figure-registry">` tag emitted at SSR.
 *
 * The registry is the "asset" tier (immutable per-name metadata —
 * `src`, `alt`, default `caption`, `credit`); the per-usage tier
 * lives in `figure-usages-store.ts` (chapter-specific number,
 * anchor, captionOverride, canonical flag).
 */
const store = createPedagogyStore<FigureRegistryEntry>({
  scriptId: "sophie-figure-registry",
  logTag: "[FigureRef:registry]",
  keyOf: (f) => f.name,
  // The registry is a flat name→asset namespace; a duplicate `name`
  // silently overwrites an earlier figure's asset metadata (the exact
  // class PR β.3 targets). Figure names are unique by contract, so
  // fail the build on collision. Complements the build-time
  // key/name-match guard in `figures-virtual-module.ts`.
  onDuplicateKey: "throw",
});

export const __setFigureRegistry = store.set;
export const lookupFigureRegistry = store.lookup;
