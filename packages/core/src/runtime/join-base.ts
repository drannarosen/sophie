/**
 * Join an Astro `base` prefix with an author-written absolute path.
 *
 * Astro does NOT auto-prefix author-written `<a href>` / asset URLs
 * with the configured `base`; only its own routing does. A consumer
 * deploying `@sophie/astro` under a non-root base (e.g. GitHub Pages
 * `base: "/astr201"`) therefore gets broken internal links unless
 * every emitted path is run through this join. Pure string util,
 * hoisted to `@sophie/core/runtime` so the `@sophie/astro` and
 * `@sophie/components` `withBase` wrappers share one definition.
 *
 * `base` is normalised by stripping trailing slashes ("" or
 * "/astr201"); `path` is given a leading slash if it lacks one, so
 * the result is always `${base}${path}` with exactly one joining
 * slash. Hash fragments and query strings ride along in `path`.
 *
 * External / non-path URLs pass through untouched: a `path` that
 * carries a URI scheme (`https:`, `data:`, `mailto:`, `blob:`, …) or
 * is protocol-relative (`//cdn/x`) is returned as-is. `withBase` is
 * public API and a consumer figure `src` (schema allows any non-empty
 * string) may be external; prefixing those would corrupt the URL.
 */
export function joinBase(base: string, path: string): string {
  // External / non-path URLs (https:, data:, mailto:, blob:, protocol-relative //cdn)
  // pass through untouched — base only applies to root-relative internal paths.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) return path;
  const b = (base ?? "/").replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}
