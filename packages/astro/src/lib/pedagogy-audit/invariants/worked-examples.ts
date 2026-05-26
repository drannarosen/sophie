import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * `<WorkedExample>` audit invariants (ADR 0081 + WS B+D).
 *
 *   WE-1 WARNING — `<WorkedExample>` has ≥1 `<WorkedExample.Step>` but
 *                  zero `<WorkedExample.DimCheck>` slots. The
 *                  `data-dim-check` runtime hook (QB6 "units shown at
 *                  every step") is what makes worked examples
 *                  epistemically loadbearing for the `numerical`
 *                  role per ADR 0058; absent `.DimCheck`s the example
 *                  reads as a calculation, not a derivation.
 *                  Conceptual examples with zero steps are exempt —
 *                  WE-1 only fires when the author authored numerical
 *                  steps without showing the units.
 *
 *   WE-2 ERROR   — `<WorkedExample>` is missing exactly one
 *                  `<WorkedExample.Problem>` or `<WorkedExample.Result>`
 *                  slot. Both are structural — Problem frames the
 *                  question; Result anchors the inference. A missing
 *                  Problem produces an answer in search of a question;
 *                  a missing Result leaves the derivation hanging.
 *                  The extractor catches over-count (duplicate slots)
 *                  at extract-time with a thrown error; WE-2 here
 *                  catches under-count (zero of either).
 *
 *   WE-3 WARNING — already emitted at extract-time
 *                  (`extractors/worked-examples.ts` R7 disposition)
 *                  for unknown JSX flow children. Surfaced via
 *                  `passthroughExtractorFindings`; not implemented in
 *                  this file.
 *
 * The eight-role contract (ADR 0058) declares `<WorkedExample>` as
 * `role: "numerical"`. WE-1 polices the QB6 hook coverage that
 * makes that role honest at audit-time.
 */
export function checkWorkedExamples(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  for (const we of index.workedExamples) {
    // WE-1 — units-at-every-step coverage gap.
    if (we.slots.steps >= 1 && we.slots.dimChecks === 0) {
      sink.warnings.push({
        severity: "WARNING",
        code: "WE-1",
        message: `WE-1: WorkedExample "${we.anchor}" in chapter "${we.unit}" has ${we.slots.steps} <WorkedExample.Step> slot${we.slots.steps === 1 ? "" : "s"} but no <WorkedExample.DimCheck>. The \`data-dim-check\` runtime hook (QB6 "units shown at every step") is what makes a worked example epistemically loadbearing for the \`numerical\` role per ADR 0058. Resolution: add at least one <WorkedExample.DimCheck> slot, or remove the steps if the example is purely conceptual.`,
        location: { unit: we.unit, anchor: we.anchor },
      });
    }

    // WE-2 — structural completeness (under-count caught here;
    // over-count throws at extract time).
    if (!we.slots.problem) {
      sink.errors.push({
        severity: "ERROR",
        code: "WE-2",
        message: `WE-2: WorkedExample "${we.anchor}" in chapter "${we.unit}" is missing <WorkedExample.Problem>. Every worked example must frame the question it solves. Resolution: add a <WorkedExample.Problem> slot at the top of the example.`,
        location: { unit: we.unit, anchor: we.anchor },
      });
    }
    if (!we.slots.result) {
      sink.errors.push({
        severity: "ERROR",
        code: "WE-2",
        message: `WE-2: WorkedExample "${we.anchor}" in chapter "${we.unit}" is missing <WorkedExample.Result>. Every worked example must anchor the inference it draws. Resolution: add a <WorkedExample.Result> slot at the end of the example.`,
        location: { unit: we.unit, anchor: we.anchor },
      });
    }
  }
}
