/**
 * Structural type for the minimal Vite plugin shape the
 * `*-virtual-module.ts` factories return.
 *
 * Avoids importing the Vite `Plugin` type directly, which differs
 * between vite@7 and vite@8 (both resolvable under @sophie/astro's
 * `^7 || ^8` peer range). The integration file casts the returned
 * value to `PluginOption` at the consumer boundary; here we keep the
 * type local and inferable so neither vite version's `Plugin` shape
 * leaks into our public API.
 *
 * Canonical declaration shared by `figures-virtual-module.ts` +
 * `course-spec-virtual-module.ts` (R9-production: one declaration per
 * named interface).
 */
export interface VitePluginLike {
  name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
}
