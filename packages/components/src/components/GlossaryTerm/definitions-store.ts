import type { DefinitionEntry } from "@sophie/core/schema";

/**
 * Glossary definitions store. The map is populated by
 * `__setGlossaryDefinitions(entries)` — called from
 * `@sophie/astro`'s `<TextbookLayout>` frontmatter, which imports
 * `virtual:sophie/pedagogy-index` (resolved by the consumer's
 * Vite at render time).
 *
 * Why a setter instead of a direct virtual-module import: the
 * `virtual:` protocol is a Vite-only convention. If
 * `@sophie/components` statically imported `virtual:sophie/...`
 * it would surface in `dist/index.js`, and any consumer that
 * does a bare-Node import of `@sophie/components` (e.g. Astro's
 * config loader reaching through `@sophie/astro` → `makeStaticComponents`
 * → component imports) would hit `ERR_UNKNOWN_URL_SCHEME` at
 * runtime. Keeping the virtual import behind a setter, in the
 * Vite-aware @sophie/astro layer, isolates the protocol coupling.
 *
 * Per ADR 0038. Setter name carries an underscore prefix to flag
 * it as internal-use (not part of the public authoring API).
 */

let definitionsBySlug: Map<string, DefinitionEntry> = new Map();

export function __setGlossaryDefinitions(
  entries: ReadonlyArray<DefinitionEntry>
): void {
  definitionsBySlug = new Map(entries.map((d) => [d.slug, d]));
}

export function lookupDefinition(slug: string): DefinitionEntry | undefined {
  return definitionsBySlug.get(slug);
}
