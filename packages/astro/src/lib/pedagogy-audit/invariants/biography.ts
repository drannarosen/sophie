import type { PedagogyIndex } from "@sophie/core/schema";
import type { AuditContext } from "../context.ts";
import type { FindingSink } from "../types.ts";

/**
 * EquationBiography audit invariants per ADR 0046 §"Audit invariants."
 *
 *   E7  INFO     biography children present but missing <Observable>.
 *                Per ADR 0046's "structured-for-facts, prose-for-stances"
 *                principle: Observable is the *anchor* — what the
 *                equation measures.
 *   E9  INFO     <CommonMisuse> lacks misconception="<slug>" cross-ref.
 *                Optional at v1; nudges toward populating the link.
 *   E10 WARNING  <CommonMisuse misconception="…"> references a slug
 *                not declared anywhere course-wide. Mirrors I1's
 *                WARNING shape (unresolved cross-ref to misconception-
 *                graph node).
 *
 * E8 (Units symbol mismatch) lives in `notation-registry.ts` because
 * it's gated on the registry opt-in.
 *
 * E7 + E9 fire only when biography children are present — preserves
 * ADR 0046's "universal with per-equation opt-in" property.
 */
export function checkBiography(
  index: PedagogyIndex,
  ctx: AuditContext,
  sink: FindingSink
): void {
  // E7 INFO — biography children present but missing <Observable>.
  for (const eq of index.equations) {
    if (eq.biography === undefined) continue;
    if (eq.biography.observable !== undefined) continue;
    sink.info.push({
      severity: "INFO",
      code: "E7",
      message: `E7: equation registry entry "${eq.id}" has biography children but lacks an <Observable>. Authoring nudge — declare what the equation measures so readers can anchor the model in observation.`,
      location: { anchor: eq.id },
    });
  }

  // E9 INFO — <CommonMisuse> lacks misconception="<slug>" cross-ref.
  // Per ADR 0046 + ADR 0044's misconception-graph contract: linking
  // CommonMisuse to a declared misconception strengthens curriculum
  // coherence (the misuse becomes navigable from the misconception
  // graph + future cross-link rendering). The cross-ref is optional
  // at v1 — E9 nudges toward populating it without blocking.
  for (const eq of index.equations) {
    if (eq.biography === undefined) continue;
    for (const misuse of eq.biography.common_misuses) {
      if (misuse.misconception !== undefined) continue;
      sink.info.push({
        severity: "INFO",
        code: "E9",
        message: `E9: <CommonMisuse> in equation registry entry "${eq.id}" lacks a misconception="<slug>" cross-ref to the misconception graph (ADR 0044). Authoring nudge — link the misuse to a declared misconception so it surfaces in cross-link rendering.`,
        location: { anchor: eq.id },
      });
    }
  }

  // E10 WARNING — <CommonMisuse misconception="…"> references a slug
  // not declared anywhere in the course. Mirrors I1's WARNING shape
  // (Intervention `addresses="…"` referencing an unknown misconception)
  // — same structural class of "unresolved cross-ref to misconception-
  // graph node." Authors will sometimes link CommonMisuse to a
  // misconception they intend to add to *another* chapter; we check
  // the course-wide set, not per-chapter, so legitimate cross-chapter
  // refs pass cleanly.
  //
  // Distinct from E9 (INFO) which fires when the cross-ref is *missing*;
  // E10 fires when the cross-ref is *present but broken*.
  for (const eq of index.equations) {
    if (eq.biography === undefined) continue;
    for (const misuse of eq.biography.common_misuses) {
      if (misuse.misconception === undefined) continue;
      if (ctx.declaredMisconceptionAnchors.has(misuse.misconception)) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "E10",
        message: `E10: <CommonMisuse misconception="${misuse.misconception}"> in equation registry entry "${eq.id}" references a misconception not declared anywhere in the course. Resolution: declare the misconception (Aside or Callout with that anchor) in some chapter, or fix the slug typo.`,
        location: { anchor: eq.id },
      });
    }
  }
}
