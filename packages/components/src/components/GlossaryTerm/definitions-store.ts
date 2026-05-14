import type { DefinitionEntry } from "@sophie/core/schema";

/**
 * Glossary definitions store. Two population paths:
 *
 *   - **Server (SSR):** `<TextbookLayout>`'s frontmatter reads
 *     `indexAccumulator.asPedagogyIndex().definitions` (the
 *     build-time pedagogy index, ADR 0038) and calls
 *     `__setGlossaryDefinitions(entries)`. Used by the SSR pass.
 *
 *   - **Client (post-hydration):** server-side module state
 *     doesn't survive to the wire. `<TextbookLayout>` also
 *     emits a `<script id="sophie-pedagogy-definitions"
 *     type="application/json">[...]</script>` tag carrying the
 *     same data. On first client-side lookup, this module
 *     reads the script tag and hydrates the map. Without this
 *     path, `<GlossaryTerm>` would render correctly on SSR
 *     but rerender as the bare-prose fallback after React
 *     hydration (the client's empty store wins).
 *
 * Why a setter instead of a direct virtual-module import: the
 * `virtual:` protocol is a Vite-only convention. If
 * `@sophie/components` statically imported `virtual:sophie/...`
 * it would surface in `dist/index.js`, and any consumer that
 * does a bare-Node import (e.g. Astro's config loader) would
 * hit `ERR_UNKNOWN_URL_SCHEME` at runtime. Keeping the virtual
 * import behind the setter, in the Vite-aware @sophie/astro
 * layer, isolates the protocol coupling.
 *
 * Per ADR 0038. Setter name carries an underscore prefix to
 * flag it as internal-use (not part of the public authoring
 * API).
 */

const SCRIPT_ID = "sophie-pedagogy-definitions";

let definitionsBySlug: Map<string, DefinitionEntry> = new Map();
let hydratedFromScript = false;

function hydrateFromScriptTagIfPresent(): void {
  if (hydratedFromScript) return;
  if (typeof document === "undefined") return; // SSR — script-tag path is client-only
  const el = document.getElementById(SCRIPT_ID);
  const raw = el?.textContent;
  if (!raw) {
    hydratedFromScript = true;
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new TypeError(
        `Expected an array of DefinitionEntry; got ${typeof parsed}`
      );
    }
    const entries = parsed as ReadonlyArray<DefinitionEntry>;
    definitionsBySlug = new Map(entries.map((d) => [d.slug, d]));
  } catch (err) {
    // Malformed payload; leave the map as-is + surface the error
    // to the dev console so the build-vs-runtime mismatch is
    // debuggable. Silent in production.
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.error(
        "[GlossaryTerm] Failed to parse `sophie-pedagogy-definitions` script payload; <GlossaryTerm> will fall back to bare prose for every lookup on this page.",
        err
      );
    }
  }
  hydratedFromScript = true;
}

export function __setGlossaryDefinitions(
  entries: ReadonlyArray<DefinitionEntry>
): void {
  // Explicit setter wins; suppress later auto-hydration so a
  // test or future consumer can override the script-tag payload.
  hydratedFromScript = true;
  definitionsBySlug = new Map(entries.map((d) => [d.slug, d]));
}

export function lookupDefinition(slug: string): DefinitionEntry | undefined {
  hydrateFromScriptTagIfPresent();
  return definitionsBySlug.get(slug);
}
