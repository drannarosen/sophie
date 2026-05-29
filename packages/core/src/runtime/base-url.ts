const BASE_URL_KEY = "__SOPHIE_BASE_URL__";

/** SSR-setter. Called from the @sophie/astro .astro layer (where
 *  import.meta.env.BASE_URL is reliably Vite-replaced) so the
 *  externalized-in-Node SSR/prerender dist of @sophie/* can read the
 *  base — import.meta.env is undefined in that context. Mirrors the
 *  definitions/figures SSR-setter doctrine; globalThis (not module
 *  state) because tsup chunking can dupe modules. */
export function setSophieBaseUrl(base: string): void {
  (globalThis as { [BASE_URL_KEY]?: string })[BASE_URL_KEY] = base;
}

/** Reads the SSR-set base; undefined when unset (e.g. client, where
 *  the withBase wrappers fall back to import.meta.env.BASE_URL). */
export function getSophieBaseUrl(): string | undefined {
  return (globalThis as { [BASE_URL_KEY]?: string })[BASE_URL_KEY];
}
