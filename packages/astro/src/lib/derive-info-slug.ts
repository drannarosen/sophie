/**
 * Derive an info-page slug from `Astro.url.pathname`.
 *
 * The info-page dispatcher (`routes/info-page.astro`) looks up
 * `courseSpec.info_pages[slug]` keyed by the bare slug. Under a
 * non-root Astro `base` (e.g. `base: "/astr201"`), `pathname` is
 * `/astr201/accommodations/`, so the previous `replace(/^\/|\/$/g, "")`
 * yielded `astr201/accommodations` → lookup miss → the dispatcher
 * invariant throws → build dies. The slug is the LAST non-empty path
 * segment regardless of how many base segments precede it.
 */
export function deriveInfoSlug(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
}
