import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

const CANONICAL_ORDER = ["observable", "model", "inference"] as const;

/**
 * `<OMIFlow>` audit invariants per ADR 0063.
 *
 *   - **OF-1** (WARN, per-callsite): slot source order differs from
 *     canonical O→M→I. The renderer always emits canonical order;
 *     the warning flags likely typo / mid-refactor source state.
 *     Authors who deliberately reorder are usually mid-edit; surface
 *     without blocking.
 *
 *   - **OF-2** (ERROR, per-chapter): chapter declares
 *     `framing: "OMI"` but renders zero `<OMIFlow>` callsites.
 *     Graduates ADR 0058's deferred OMI-coherence audit invariant.
 *     Trivially satisfied by authoring one OMIFlow per OMI-framed
 *     chapter; strict-3 + slot-name-binds-role together guarantee
 *     that one OMIFlow proves all three roles are reached.
 */
export function checkOMIFlow(index: PedagogyIndex, sink: FindingSink): void {
  // OF-1: per-callsite source-order WARN.
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

  // OF-2: per-chapter framing:"OMI" conformance ERROR. Two-pass:
  // collect chapters with OMIFlow coverage, then iterate OMI-framed
  // chapters and emit ERROR for any missing coverage. Strict-3 +
  // slot-name-binds-role guarantee that one OMIFlow proves all three
  // OMI roles are reached, so this is THE chapter-level invariant
  // ADR 0058 §5 deferred.
  const chaptersWithOMIFlow = new Set(index.omiFlows.map((e) => e.chapter));
  for (const ch of index.chapters) {
    if (ch.framing !== "OMI") continue;
    if (chaptersWithOMIFlow.has(ch.slug)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "OF-2",
      message: `OF-2: chapter "${ch.slug}" declares \`framing: "OMI"\` but renders zero <OMIFlow> callsites. Resolution: either author at least one <OMIFlow>…</OMIFlow> in the chapter MDX (per ADR 0063) so the OMI arc is visible on the page, or change the chapter's framing.`,
      location: { chapter: ch.slug },
    });
  }
}
