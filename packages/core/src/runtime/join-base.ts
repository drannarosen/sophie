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
 */
export function joinBase(base: string, path: string): string {
  const b = (base ?? "/").replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}
