import type { DefinitionEntry } from "@sophie/core/schema";

/**
 * ADR 0086 — collapse multi-chapter definitions to one entry per slug for
 * the course-level glossary room (`CourseGlossary`).
 *
 * A term may be defined in several chapters (deliberate cross-lecture
 * reinforcement). The course glossary shows ONE definition per slug: the
 * chapter that opted in via `<Aside kind="definition" ... canonical>`,
 * otherwise the first-accumulated definition. The accumulator
 * (`addDefinitions`) guarantees at most one canonical per slug, so the
 * `canonical` upgrade below is unambiguous regardless of traversal order.
 *
 * Per-chapter `ChapterGlossary` does NOT use this — it shows each chapter's
 * own definition by filtering the (multi-entry) index on `unit`.
 */
export function canonicalDefinitions(
  definitions: ReadonlyArray<DefinitionEntry>
): DefinitionEntry[] {
  const bySlug = new Map<string, DefinitionEntry>();
  for (const entry of definitions) {
    const existing = bySlug.get(entry.slug);
    if (!existing || (entry.canonical && !existing.canonical)) {
      bySlug.set(entry.slug, entry);
    }
  }
  return [...bySlug.values()];
}
