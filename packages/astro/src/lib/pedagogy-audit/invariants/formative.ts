import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Formative-assessment audit invariants (ADR 0073 Amendment 1 —
 * formative-with-reveal v1).
 *
 *   AS-1 ERROR — MCQ with `correct`-choice count !== 1.
 *   AS-2 WARN  — any formative item with no `<Solution>`.
 *   AS-3 WARN  — `<FillBlank>` with zero `<FillBlank.Slot>` blanks.
 *   AS-4 ERROR — `<NumericQuestion>` with `<NumericQuestion.Answer>`
 *                child count !== 1.
 *   AS-5 ERROR — `<MultiSelect>` with zero `correct` choices.
 *
 * **Detection split (mirrors worked-examples' WE-3 precedent).** AS-2
 * and AS-3 are recoverable from the materialized `FormativeEntry`
 * (`hasSolution`, `answer.blanks.length`), so they are derived HERE.
 * AS-1 / AS-4 / AS-5 depend on raw counts the materialized `answer`
 * cannot carry (two correct MCQ choices collapse to one slug; a
 * zero-correct multi-choice would fail the schema's `.min(1)`), so the
 * EXTRACTOR pushes them at detection time
 * (`extractors/formative.ts`); they surface via
 * `passthroughExtractorFindings` in the audit runner. This file
 * therefore implements only AS-2 + AS-3.
 *
 * **Gated-solution awareness (ADR 0096).** A practice-tab problem
 * intentionally ships no inline `<Solution>`; its worked solution lives
 * in the unit's separate, date-gated `solutions.mdx` (a dedicated
 * `solutions` content collection, excluded from the `artifacts` sweep
 * for the build-time security property). AS-2 would otherwise warn on
 * every such problem. `unitIdsWithGatedSolutions` is an
 * **existence-only** signal — the set of unit ids that own a gated
 * solution, derived from filenames alone (never the solution body) — so
 * a formative whose unit is in the set suppresses AS-2. Absent/empty
 * set = current behavior (warn), keeping the change additive.
 */
export function checkFormative(
  index: PedagogyIndex,
  sink: FindingSink,
  unitIdsWithGatedSolutions: ReadonlySet<string> = new Set()
): void {
  for (const f of index.formatives) {
    // AS-2 — authored-but-answerless formative items leave students
    // without reveal feedback.
    if (!f.hasSolution && !unitIdsWithGatedSolutions.has(f.unit)) {
      sink.warnings.push({
        severity: "WARNING",
        code: "AS-2",
        message: `AS-2: ${f.kind} "${f.anchor}" in chapter "${f.unit}" has no <Solution>. Authored-but-answerless formative items leave students without reveal feedback. Resolution: add a <Solution>…</Solution> child explaining the reasoning.`,
        location: { unit: f.unit, anchor: f.anchor },
      });
    }

    // AS-3 — a fill-blank with no slots renders as inert prose; the
    // student has nothing to fill in.
    if (f.answer.type === "fill-blank" && f.answer.blanks.length === 0) {
      sink.warnings.push({
        severity: "WARNING",
        code: "AS-3",
        message: `AS-3: FillBlank "${f.anchor}" in chapter "${f.unit}" has zero <FillBlank.Slot> blanks. A fill-blank with no slots renders as inert prose. Resolution: add at least one <FillBlank.Slot id correct /> inside <FillBlank.Prompt>.`,
        location: { unit: f.unit, anchor: f.anchor },
      });
    }
  }
}
