import type { InterventionEntry, PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Misconception ↔ intervention pairing invariants per ADR 0044 §D7.
 *
 *   MG3 WARNING — orphan misconception (no <Intervention> pairs with
 *                 it course-wide). Pairing is the structural promise
 *                 of ADR 0044's misconception-graph + intervention
 *                 model. WARNING (not ERROR): zero-pairing is a gap,
 *                 not a contract violation.
 *   MG4 INFO    — course-level depth-coverage summary: counts of
 *                 misconceptions by remediation-depth bucket. Single-
 *                 finding summary table per design §D3.
 *
 * Distinct from `misconception-graph.ts` (MG1+MG2 — DAG/topology
 * integrity); this file is about coverage of declared misconceptions
 * by interventions.
 */
export function checkMisconceptionPairing(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  // MG3 WARNING — orphan misconception.
  const interventionTargets = new Set<string>(
    index.interventions.flatMap((iv) => iv.addresses)
  );
  for (const misc of index.misconceptions) {
    if (interventionTargets.has(misc.anchor)) continue;
    sink.warnings.push({
      severity: "WARNING",
      code: "MG3",
      message: `MG3: Misconception "${misc.anchor}" (chapter "${misc.unit}") is declared but no <Intervention> pairs with it course-wide. Resolution: add an <Intervention addresses="${misc.anchor}"> (nested in the misconception Aside or standalone) in some chapter, or remove the misconception declaration if it's no longer in scope.`,
      location: { unit: misc.unit, anchor: misc.anchor },
    });
  }

  // MG4 INFO — course-level depth-coverage summary. Single-finding
  // summary table per design §D3: counts of misconceptions by
  // remediation-depth bucket. MG3 separately flags the zeroes; MG4
  // surfaces the substantial-vs-light split so course-coordinators
  // can see where the heavy-lifting interventions concentrate.
  const totalMisconceptions = index.misconceptions.length;
  if (totalMisconceptions === 0) return;

  const interventionsByTarget = new Map<string, InterventionEntry[]>();
  for (const iv of index.interventions) {
    for (const target of iv.addresses) {
      const list = interventionsByTarget.get(target) ?? [];
      list.push(iv);
      interventionsByTarget.set(target, list);
    }
  }
  let substantialCount = 0;
  let lightOnlyCount = 0;
  let unaddressedCount = 0;
  for (const misc of index.misconceptions) {
    const pairs = interventionsByTarget.get(misc.anchor);
    if (!pairs || pairs.length === 0) {
      unaddressedCount += 1;
      continue;
    }
    if (pairs.some((iv) => iv.depth === "substantial")) {
      substantialCount += 1;
    } else {
      lightOnlyCount += 1;
    }
  }
  const pct = (n: number) => `${((n / totalMisconceptions) * 100).toFixed(0)}%`;
  sink.info.push({
    severity: "INFO",
    code: "MG4",
    message: `MG4 — Intervention depth coverage:\n  ${totalMisconceptions} misconceptions total\n  ${substantialCount} have ≥1 substantial intervention (${pct(substantialCount)})\n  ${lightOnlyCount} have only light interventions (${pct(lightOnlyCount)})\n  ${unaddressedCount} have no interventions (${pct(unaddressedCount)})  ← would fire MG3 separately`,
    location: {},
  });
}
