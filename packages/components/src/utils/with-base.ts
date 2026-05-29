import { getSophieBaseUrl, joinBase } from "@sophie/core/runtime";

/**
 * Prefix an author-written absolute path with the consumer's Astro
 * `base`. `import.meta.env.BASE_URL` is a Vite primitive (NOT an
 * `astro:*` import), replaced at the consumer's build time for both
 * the SSR render and the client-island bundle — so framework purity
 * (ADR 0001: `@sophie/components` imports React / Zod / `@sophie/*`
 * only) holds. Astro does not auto-prefix `<a href>` / asset URLs,
 * so every internal link emitted by a component must pass through
 * here. See `@sophie/core/runtime`'s `joinBase` for join semantics.
 */
export function withBase(path: string): string {
  // SSR (externalized dist in Node): base comes from the .astro layer via
  // setSophieBaseUrl → getSophieBaseUrl. Client: globalThis is unset, so
  // fall back to import.meta.env.BASE_URL (Vite-replaced in the client
  // bundle). import.meta.env is undefined in externalized Node SSR, hence
  // the optional chain — never throws.
  const base = getSophieBaseUrl() ?? import.meta.env?.BASE_URL ?? "/";
  return joinBase(base, path);
}
