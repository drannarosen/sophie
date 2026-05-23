import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";
import type { NotationDerivedState } from "./notation-registry.ts";

/**
 * MultiRep–Notation-Registry alignment invariants per ADR 0043.
 *
 *   MR1 ERROR  — <MultiRep concept="X"> references a concept not in
 *                the registry.
 *   MR2 WARN   — <RepEquation symbol="…"> doesn't match the bound
 *                concept's canonical_symbol.
 *   MR4 INFO   — <RepFigure> referenced figure's alt text doesn't
 *                mention the concept's verbal_label or canonical_symbol.
 *   MR6 INFO   — <RepEquation equivalent_to="X"> doesn't resolve to a
 *                <KeyEquation> in the chapter or to another
 *                <RepEquation> in the same MultiRep.
 *
 * Gated on NR opt-in (the runner only calls this when
 * notationRegistry is non-null). MR3 + MR5 are deferred per ADR 0043
 * §R1 (pending RepCode / <CodeCell>, ADR 0018).
 */
export function checkMultiRep(
  index: PedagogyIndex,
  state: NotationDerivedState,
  sink: FindingSink
): void {
  // MR1 ERROR — <MultiRep concept="X"> for X not in registry.
  for (const mr of index.multiReps) {
    if (state.conceptsById.has(mr.concept)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "MR1",
      message: `MR1: <MultiRep concept="${mr.concept}"> in chapter "${mr.unit}" — concept not present in notation-registry.yaml. Resolution: declare the concept (per docs/website/reference/notation-registry-schema.md), or fix the concept slug typo.`,
      location: { unit: mr.unit, anchor: mr.id },
    });
  }

  // MR2 WARNING — <RepEquation symbol="…"> doesn't match the bound
  // concept's canonical_symbol. v1 only checks against
  // `canonical_symbol`; alias support lands when registry concepts
  // grow an explicit `aliases?: string[]` field.
  for (const mr of index.multiReps) {
    const concept = state.conceptsById.get(mr.concept);
    if (!concept) continue; // MR1 already fired for this case.
    for (const rep of mr.reps) {
      if (rep.kind !== "equation") continue;
      if (rep.symbol === concept.canonical_symbol) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "MR2",
        message: `MR2: <MultiRep concept="${mr.concept}"> in chapter "${mr.unit}" — <RepEquation refKey="${rep.refKey}" symbol="${rep.symbol}"> doesn't match the registry's canonical_symbol "${concept.canonical_symbol}". Resolution: change the rep's symbol to match the registry, or update the registry if the symbol drifted intentionally.`,
        location: { unit: mr.unit, anchor: mr.id },
      });
    }
  }

  // MR4 INFO — <RepFigure> referenced figure's alt text doesn't
  // mention the concept's verbal_label or canonical_symbol. The
  // figure may not exist in the registry (F1/F2 already fire on that).
  // MR4 only fires when the figure exists AND the alt text is silent
  // on the concept.
  const figureRegistryByName = new Map(
    index.figureRegistry.map((f) => [f.name, f])
  );
  for (const mr of index.multiReps) {
    const concept = state.conceptsById.get(mr.concept);
    if (!concept) continue;
    for (const rep of mr.reps) {
      if (rep.kind !== "figure") continue;
      const figure = figureRegistryByName.get(rep.refName);
      if (!figure) continue; // F1/F2 will surface the missing figure.
      const altLower = figure.alt.toLowerCase();
      const mentionsVerbal = altLower.includes(
        concept.verbal_label.toLowerCase()
      );
      const mentionsSymbol = figure.alt.includes(concept.canonical_symbol);
      if (mentionsVerbal || mentionsSymbol) continue;
      sink.info.push({
        severity: "INFO",
        code: "MR4",
        message: `MR4: <MultiRep concept="${mr.concept}"> in chapter "${mr.unit}" — figure "${rep.refName}" alt text doesn't mention the concept's verbal_label ("${concept.verbal_label}") or canonical_symbol ("${concept.canonical_symbol}"). Authoring nudge — readers using screen-readers lose the binding context.`,
        location: { unit: mr.unit, anchor: mr.id },
      });
    }
  }

  // MR6 INFO — <RepEquation equivalent_to="X"> doesn't resolve.
  // Chapter-scoped at v1 (per design §D6 + ADR 0043 §R-MR6): X must
  // resolve to either (a) a <KeyEquation> in the same chapter's
  // equation index, or (b) another <RepEquation> in the same
  // MultiRep block. Cross-chapter resolution is a v2 audit-pass flip.
  // Post-ADR-0060: equations are registry-sourced (no chapter on the
  // entry). "Equations in chapter X" = equations CITED from chapter X
  // via `equationCitations[].refId`. MR6's chapter-scoping continues
  // to work because MultiRep ↔ KeyEquation co-residence is about
  // chapter-side authoring intent.
  const equationsByChapterSlug = new Map<string, Set<string>>();
  for (const citation of index.equationCitations) {
    const set = equationsByChapterSlug.get(citation.unit) ?? new Set<string>();
    set.add(citation.refId);
    equationsByChapterSlug.set(citation.unit, set);
  }
  for (const mr of index.multiReps) {
    const sameMrEquationRefKeys = new Set<string>();
    for (const rep of mr.reps) {
      if (rep.kind === "equation") sameMrEquationRefKeys.add(rep.refKey);
    }
    const chapterEquationSlugs =
      equationsByChapterSlug.get(mr.unit) ?? new Set<string>();
    for (const rep of mr.reps) {
      if (rep.kind !== "equation") continue;
      if (rep.equivalent_to === undefined) continue;
      if (chapterEquationSlugs.has(rep.equivalent_to)) continue;
      if (sameMrEquationRefKeys.has(rep.equivalent_to)) continue;
      sink.info.push({
        severity: "INFO",
        code: "MR6",
        message: `MR6: <MultiRep concept="${mr.concept}"> in chapter "${mr.unit}" — <RepEquation refKey="${rep.refKey}" equivalent_to="${rep.equivalent_to}"> doesn't resolve to a <KeyEquation> in the chapter or to another <RepEquation> in the same MultiRep. Authoring nudge — declare the equivalent equation explicitly so the binding holds.`,
        location: { unit: mr.unit, anchor: mr.id },
      });
    }
  }
}
