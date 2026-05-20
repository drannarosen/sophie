import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

const CANONICAL_ORDER = ["observable", "model", "inference"] as const;

/**
 * OF-1 (WARN per ADR 0063): for each `<OMIFlow>` callsite whose
 * authored slot order differs from canonical O→M→I, emit a warning.
 *
 * The renderer always emits slots in canonical observable → model →
 * inference order; the warning surfaces likely-typo / mid-refactor
 * source state without blocking the build. Authors who deliberately
 * reorder are usually mid-edit; the warning is the nudge to bring
 * source order in line with the rendered order.
 *
 * OF-2 (chapter-level conformance ERROR, "framing: 'OMI' requires
 * ≥ 1 <OMIFlow>") lands in PR-C alongside the smoke-fixture
 * migration.
 */
export function checkOMIFlow(index: PedagogyIndex, sink: FindingSink): void {
  for (const entry of index.omiFlows) {
    const inOrder = CANONICAL_ORDER.every((k, i) => entry.sourceOrder[i] === k);
    if (inOrder) continue;
    sink.warnings.push({
      severity: "WARNING",
      code: "OF-1",
      message: `OF-1: OMIFlow "${entry.anchor}" in chapter "${entry.chapter}" — slots authored in source order [${entry.sourceOrder.join(", ")}]. Renderer emits canonical observable → model → inference; this warning flags a likely typo or mid-refactor state. Resolution: reorder the <OMIFlow.{Observable,Model,Inference}> children to O → M → I in the MDX source.`,
      location: { chapter: entry.chapter, anchor: entry.anchor },
    });
  }
}
