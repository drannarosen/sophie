import { type PedagogyIndex, PedagogyIndexSchema } from "@sophie/core/schema";

/**
 * Build a typed `PedagogyIndex` test fixture by parsing through
 * `PedagogyIndexSchema`. This is the canonical way for audit tests to
 * construct `PedagogyIndex` literals — Zod fills in every defaultable
 * collection (`equationCitations`, `multiReps`, `omiFlows`,
 * `retrievalPrompts`, `spacedReviews`, `skillReviews`, `sections`,
 * `units`, etc.) so individual tests only declare the fields they're
 * exercising.
 *
 * **Why this exists.** A literal `: PedagogyIndex = { … }` factory has
 * to keep adding fields every time the schema grows a new defaulted
 * collection — 4 fixture files broke when Wedge B-followup W1 added
 * `sections` + `units`. The parsed factory is future-proof: when W2/W3
 * add Artifact, the audit tests don't need touching.
 *
 * **What to pass.** Any subset of `Partial<PedagogyIndex>` for the
 * fields a specific test cares about; everything else defaults to `[]`.
 * The 10 collections without Zod defaults (`definitions`, `equations`,
 * `keyInsights`, `figureRegistry`, `figureUsages`, `misconceptions`,
 * `chapters`, `modules`, `objectives`, `inlineRefUsages`) are
 * pre-defaulted to `[]` inside the helper, so callers don't have to
 * list them either.
 *
 * Added 2026-05-22 in Wedge B-followup W1's pre-PR code review pass —
 * replaces the `if (!index.units || …)` and `(index.sections ?? [])`
 * defensive guards that papered over the previous test-fixture-shape
 * gap. Per the W1 audit review's Issue 1 recommendation (Option 1:
 * Zod-parse helper).
 */
export function buildPedagogyIndex(
  partial: Partial<PedagogyIndex> = {}
): PedagogyIndex {
  return PedagogyIndexSchema.parse({
    definitions: [],
    equations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    chapters: [],
    modules: [],
    objectives: [],
    inlineRefUsages: [],
    ...partial,
  });
}
