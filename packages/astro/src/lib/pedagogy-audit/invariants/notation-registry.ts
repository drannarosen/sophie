import type {
  Concept,
  NotationRegistry,
  PedagogyIndex,
} from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Notation-registry audit invariants per ADR 0043 (+ E8 from ADR 0046).
 *
 *   NR1 WARNING — <KeyEquation symbols=[…]> declares a symbol not in
 *                 the registry.
 *   NR2 INFO    — registry concept declared but never referenced
 *                 (orphan registry entry).
 *   NR3 ERROR   — registry: same canonical_symbol bound to different
 *                 concept.ids (cross-concept symbol collision).
 *   NR4 WARNING — equation declares a symbol with NO units anywhere
 *                 (registry concept's `units` ∅ AND no <Units> child).
 *   E8  WARNING — <Units symbol="X"> doesn't match any canonical_symbol
 *                 in the registry.
 *
 * All five invariants share the same precomputed maps over the
 * registry (`conceptsById`, `symbolToConcepts`, `referencedConceptIds`).
 * The MultiRep invariants (MR1/MR2/MR4/MR6) consume the same maps and
 * call `buildNotationDerivedState` from this module.
 *
 * Gated on opt-in: when `notationRegistry` is null/absent the consumer
 * hasn't declared
 * `pedagogy-contract.yaml.math_and_units_standards.notation_registry`,
 * and the runner skips this whole module wholesale.
 */

export interface NotationDerivedState {
  registry: NotationRegistry;
  conceptsById: ReadonlyMap<string, Concept>;
  /**
   * Reverse-index: canonical_symbol → all concepts that declare it.
   * Most entries are one-element arrays; multi-element entries are
   * the NR3 collision case (registry-author error). NR1, NR4, E8, and
   * the NR2 modification all read through this map.
   */
  symbolToConcepts: ReadonlyMap<string, readonly Concept[]>;
  /**
   * Concept ids that AT LEAST ONE reference signal binds to. Reference
   * signals at v1: `<MultiRep concept="…">` AND any equation symbol
   * that resolves to a registry canonical_symbol (per ADR 0043 §R5 +
   * 2026-05-17 design doc §"reference-aggregation note"). NR2 fires
   * on `registry.concepts \ referencedConceptIds`.
   */
  referencedConceptIds: ReadonlySet<string>;
}

/**
 * Precompute the registry-derived state shared across NR* and MR*
 * invariants. Called once in the runner when notationRegistry is
 * non-null; the result is threaded into `checkNotationRegistry` and
 * `checkMultiRep`.
 */
export function buildNotationDerivedState(
  registry: NotationRegistry,
  index: PedagogyIndex
): NotationDerivedState {
  const conceptsById = new Map(registry.concepts.map((c) => [c.id, c]));

  const symbolToConcepts = new Map<string, Concept[]>();
  for (const concept of registry.concepts) {
    const existing = symbolToConcepts.get(concept.canonical_symbol) ?? [];
    existing.push(concept);
    symbolToConcepts.set(concept.canonical_symbol, existing);
  }

  // Filter to registry-known concepts so the set's name matches its
  // contents — otherwise typo-bound MultiReps (which MR1 already flags)
  // would silently appear here, and any future invariant that consumes
  // the set would pick up garbage.
  const referencedConceptIds = new Set<string>(
    index.multiReps
      .filter((m) => conceptsById.has(m.concept))
      .map((m) => m.concept)
  );
  // PR-δ NR2 modification per ADR 0043 §R5 + 2026-05-17 design doc
  // §"reference-aggregation note": KeyEquation.symbols entries also
  // count as reference signals. Each symbol that resolves to a
  // registered concept's canonical_symbol promotes that concept out
  // of orphan status. (NR3 surfaces multi-concept collisions
  // separately; here we accept any matching concept so a
  // registry-author bug doesn't suppress legitimate references.)
  for (const eq of index.equations) {
    for (const symbol of eq.symbols) {
      const concepts = symbolToConcepts.get(symbol);
      if (!concepts) continue;
      for (const concept of concepts) {
        referencedConceptIds.add(concept.id);
      }
    }
  }

  return { registry, conceptsById, symbolToConcepts, referencedConceptIds };
}

export function checkNotationRegistry(
  index: PedagogyIndex,
  state: NotationDerivedState,
  sink: FindingSink
): void {
  // NR2 INFO — registry concept declared but never referenced. v1
  // reference signal: MultiRep `concept=` + KeyEquation `symbols`
  // entries (see `buildNotationDerivedState`). Future expansions
  // (CommonMisuse misconception cross-refs from EquationBiography)
  // add more reference sources.
  for (const concept of state.registry.concepts) {
    if (state.referencedConceptIds.has(concept.id)) continue;
    sink.info.push({
      severity: "INFO",
      code: "NR2",
      message: `NR2: Notation Registry concept "${concept.id}" (${concept.verbal_label}) is declared but no <MultiRep concept="${concept.id}"> or <KeyEquation symbols=[…]> references it. Authoring nudge — either add a binding chapter or remove the unused registry entry.`,
      location: {},
    });
  }

  // NR1 WARNING — <KeyEquation symbols=[…]> declares a symbol not in
  // notation-registry.yaml. Per ADR 0043 §R5 + 2026-05-17 design doc
  // §"PR-δ' bundle." Fires per (equation, symbol) pair. Warning (not
  // error) because the symbol may be a deliberate course-local alias
  // the author hasn't promoted to the registry yet.
  for (const eq of index.equations) {
    for (const symbol of eq.symbols) {
      if (state.symbolToConcepts.has(symbol)) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "NR1",
        message: `NR1: equation registry entry "${eq.id}" declares symbol "${symbol}" not present in notation-registry.yaml. Resolution: register the concept whose canonical_symbol is "${symbol}", or remove the symbol from the equation's frontmatter \`symbols\` array.`,
        location: { anchor: eq.id },
      });
    }
  }

  // NR3 ERROR — registry: same canonical_symbol bound to different
  // concept.ids (cross-concept symbol collision). Registry-author
  // error: the same symbol "r" can't simultaneously mean "orbital
  // radius" and "stellar radius" in the same course. ERROR (not
  // WARNING) because every downstream invariant that resolves a
  // symbol → concept becomes ambiguous when the collision is present.
  for (const [symbol, concepts] of state.symbolToConcepts) {
    if (concepts.length < 2) continue;
    const conceptIds = concepts
      .map((c) => c.id)
      .sort()
      .join(", ");
    sink.errors.push({
      severity: "ERROR",
      code: "NR3",
      message: `NR3: Notation Registry symbol "${symbol}" is bound to multiple concepts: ${conceptIds}. Resolution: split the symbol into per-concept variants (e.g., subscripted forms), or merge the concepts if they're truly the same thing.`,
      location: {},
    });
  }

  // NR4 WARNING — equation declares a symbol with NO units anywhere.
  // Per ADR 0046 §R10: the notation registry is the **primary source
  // of truth** for symbol units. NR4 fires only when neither the
  // registry concept for the symbol NOR a biography <Units> child
  // provides units. Resolution priorities (preferred → fallback):
  //   1. Add `units` to the notation-registry concept (one place,
  //      shared across every equation that references the concept).
  //   2. Add <Units symbol="X" unit="..." /> in the registry MDX body
  //      (only when the symbol is genuinely equation-local).
  for (const eq of index.equations) {
    const declaredUnitSymbols = new Set(
      (eq.biography?.units ?? []).map((u) => u.symbol)
    );
    for (const symbol of eq.symbols) {
      if (declaredUnitSymbols.has(symbol)) continue;
      const concepts = state.symbolToConcepts.get(symbol);
      if (!concepts) continue; // NR1 already fired for unknown symbols.
      // Per §R10: registry concept WITH units is itself the source.
      // Skip NR4 if any matching concept has non-empty units.
      const conceptWithUnits = concepts.find(
        (c) => c.units !== undefined && c.units.length > 0
      );
      if (conceptWithUnits) continue;
      // Registry has concept(s) for this symbol, but none declare
      // units, AND no <Units> biography child fills the gap.
      const firstConcept = concepts[0];
      if (!firstConcept) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "NR4",
        message: `NR4: equation registry entry "${eq.id}" declares symbol "${symbol}" (concept "${firstConcept.id}") but no units are declared anywhere — neither in the notation registry concept's \`units\` field nor as a <Units symbol="${symbol}"> biography child. Resolution: add \`units\` to the notation registry concept (preferred per ADR 0046 §R10), or add <Units symbol="${symbol}" unit="..." /> inside the registry MDX body for equation-local symbols.`,
        location: { anchor: eq.id },
      });
    }
  }

  // E8 WARNING — <Units symbol="X"> doesn't match any canonical_symbol
  // in the Notation Registry. Per ADR 0046 + 2026-05-17 design doc
  // §"Audit invariants." Fires per (equation, units-entry) pair when
  // the author-declared Units symbol has no matching concept in the
  // registry. Warning (not error) for the same reason as NR1 —
  // symbols may be deliberate course-local aliases. Gated on NR
  // opt-in (runner only calls this when notationRegistry is non-null).
  for (const eq of index.equations) {
    for (const units of eq.biography?.units ?? []) {
      if (state.symbolToConcepts.has(units.symbol)) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "E8",
        message: `E8: <Units symbol="${units.symbol}" unit="${units.unit}"> in equation registry entry "${eq.id}" doesn't match any canonical_symbol in notation-registry.yaml. Resolution: register the concept whose canonical_symbol is "${units.symbol}", or rename the Units symbol to an existing registry entry.`,
        location: { anchor: eq.id },
      });
    }
  }
}
