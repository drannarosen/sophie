import type { PedagogyIndex } from "@sophie/core/schema";
import { slugify } from "@sophie/core/schema";

/**
 * Pre-computed lookup sets shared across the invariant checks. Built
 * once per audit run from the `PedagogyIndex` snapshot so each
 * invariant reads from O(1) sets instead of re-scanning the index.
 *
 * Centralized here so the runner and invariant files agree on a
 * single source of truth for these derived views. Per ADR 0061 Rule
 * 4: filename routing — if an invariant needs "all defined slugs", it
 * reads `ctx.definitionSlugs` not `index.definitions.map(...)`.
 */
export interface AuditContext {
  /**
   * All chapter slugs known to the audit. W2/D4 (Path A) graduation:
   * sourced from `index.units` (each Unit's `id` IS the chapter slug
   * for reading-artifact lookups under the W2 1:1 convention; the W3
   * per-callsite rename `chapter` → `unit` keeps this set's semantic
   * intact).
   */
  chapterSlugs: ReadonlySet<string>;
  /** All defined-term slugs (powers D4 lookups). */
  definitionSlugs: ReadonlySet<string>;
  /** All registry-declared equation ids (powers E4 + R1 lookups). */
  equationSlugs: ReadonlySet<string>;
  /** Names declared in the consumer's figureRegistry (powers F1 + F2). */
  figureRegistryNames: ReadonlySet<string>;
  /**
   * Slugify(name)-normalized GlossaryTerm references. Definitions
   * store slugs; <GlossaryTerm> name props are author-typed prose —
   * slugify both sides to make casing/whitespace differences invisible.
   */
  glossaryRefSlugs: ReadonlySet<string>;
  /** All chapter slugs referenced by <ChapterRef>. */
  chapterRefKeys: ReadonlySet<string>;
  /** All registry refIds referenced by <EquationRef>. */
  eqRefKeys: ReadonlySet<string>;
  /** All registry names referenced by <FigureRef>. */
  figureRefKeys: ReadonlySet<string>;
  /** All declared misconception anchors course-wide (powers I1, MG3, E10). */
  declaredMisconceptionAnchors: ReadonlySet<string>;
}

export function buildAuditContext(index: PedagogyIndex): AuditContext {
  const definitionSlugs = new Set(index.definitions.map((d) => d.slug));
  const equationSlugs = new Set(index.equations.map((e) => e.id));
  const figureRegistryNames = new Set(index.figureRegistry.map((f) => f.name));
  const chapterSlugs = new Set(index.units.map((u) => u.id));

  const glossaryRefSlugs = new Set<string>();
  const eqRefKeys = new Set<string>();
  const figureRefKeys = new Set<string>();
  const chapterRefKeys = new Set<string>();

  for (const usage of index.inlineRefUsages) {
    switch (usage.kind) {
      case "glossary-term":
        glossaryRefSlugs.add(slugify(usage.refKey));
        break;
      case "eq-ref":
        eqRefKeys.add(usage.refKey);
        break;
      case "figure-ref":
        figureRefKeys.add(usage.refKey);
        break;
      case "chapter-ref":
        chapterRefKeys.add(usage.refKey);
        break;
    }
  }

  const declaredMisconceptionAnchors = new Set<string>(
    index.misconceptions.map((m) => m.anchor)
  );

  return {
    chapterSlugs,
    definitionSlugs,
    equationSlugs,
    figureRegistryNames,
    glossaryRefSlugs,
    chapterRefKeys,
    eqRefKeys,
    figureRefKeys,
    declaredMisconceptionAnchors,
  };
}
