/**
 * Pure slug generator. Lowercases, normalizes Unicode via NFKD,
 * replaces non-alphanumerics with single hyphens, strips edge
 * hyphens. Empty / non-alphanumeric input falls back to "term".
 * Deterministic; no collision tracking.
 *
 * The pedagogy-index extractor uses this directly + detects
 * collisions explicitly (per audit invariant #2: intra-chapter
 * slug collision is a build error, not auto-disambiguated). The
 * runtime `<GlossaryTerm name="X">` consumer uses it to resolve
 * "X" to its index entry by slug match.
 */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "term"
  );
}
