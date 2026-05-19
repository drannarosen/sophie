import type { PedagogyIndex } from "@sophie/core/schema";
import { buildAuditContext } from "./context.ts";
import { checkBiography } from "./invariants/biography.ts";
import { checkChapterStatus } from "./invariants/chapter-status.ts";
import { checkEquationRegistry } from "./invariants/equation-registry.ts";
import { passthroughExtractorFindings } from "./invariants/extractor-findings.ts";
import { checkInlineRefs } from "./invariants/inline-refs.ts";
import { checkInterventions } from "./invariants/interventions.ts";
import { checkKeyInsights } from "./invariants/key-insights.ts";
import { checkMisconceptionGraph } from "./invariants/misconception-graph.ts";
import { checkMisconceptionPairing } from "./invariants/misconception-pairing.ts";
import { checkMultiRep } from "./invariants/multirep.ts";
import {
  buildNotationDerivedState,
  checkNotationRegistry,
} from "./invariants/notation-registry.ts";
import { checkObjectives } from "./invariants/objectives.ts";
import { checkOrphans } from "./invariants/orphans.ts";
import { checkValidation } from "./invariants/validation.ts";
import type { AuditExtras, AuditReport, FindingSink } from "./types.ts";

/**
 * Systematic build-time pedagogy audit pass (PR-C4 Task 8; split per
 * ADR 0061 C2). Reads a fully-populated `PedagogyIndex` snapshot and
 * emits findings against cross-cutting invariants that single-extractor
 * defense-in-depth cannot catch (undefined cross-refs, orphan
 * definitions, registry figures with zero usages, etc.).
 *
 * Three severity levels (PR-C4 decision #3, matches biome/eslint shape):
 *   - `ERROR`   — exits non-zero; CI fails.
 *   - `WARNING` — printed to stdout; build continues.
 *   - `INFO`    — verbose-only; informational, not a defect.
 *
 * The audit is pure: it never mutates the input index. Each invariant
 * check lives in a sibling file under `./invariants/`; this module
 * orchestrates them in dependency order:
 *
 *   1. Pre-compute the shared lookup context once.
 *   2. Run cross-ref invariants (inline-refs, objectives, orphans,
 *      key-insights, misconception-graph) — they read only from the
 *      index + context.
 *   3. Surface external signals via extras (chapter-status, extractor
 *      findings passthrough, validation tracker V1–V7).
 *   4. Run the notation-registry + multirep cluster — gated on
 *      `extras.notationRegistry` being non-null.
 *   5. Run intervention + biography + equation-registry invariants.
 *
 * Invariants not implemented in v1:
 *   E1, E6, F3, F5, M1, M2 — extractor throws first; audit-level
 *                            parallel check deferred.
 *   M3 — orphan misconception heuristic; deferred until a usable
 *        signal beyond "no source-of-truth title" exists.
 *   I4 — verifies every canonical-intervention's `move:` resolves to a
 *        real entry in `move-index.ts` (ADR 0041). Deferred until
 *        `move-index.ts` ships.
 *   MR3, MR5 — RepCode deferred per ADR 0043 §R1 (pending CodeCell,
 *              ADR 0018).
 */
export function runPedagogyAudit(
  index: PedagogyIndex,
  extras: AuditExtras = {}
): AuditReport {
  const sink: FindingSink = { errors: [], warnings: [], info: [] };
  const ctx = buildAuditContext(index);

  // Cross-ref invariants (require only the index + context).
  checkInlineRefs(index, ctx, sink);
  checkObjectives(index, sink);
  checkOrphans(index, ctx, sink);
  checkKeyInsights(index, sink);
  checkMisconceptionGraph(index, sink);

  // External-signal invariants (require `extras`).
  checkChapterStatus(extras, sink);
  passthroughExtractorFindings(index, sink);
  checkValidation(index, extras, sink);

  // Notation Registry + MultiRep cluster — gated on opt-in. When
  // `notationRegistry` is null/absent the consumer hasn't declared
  // `pedagogy-contract.yaml.math_and_units_standards.notation_registry`,
  // so NR* / MR* / E8 are skipped wholesale.
  const notationRegistry = extras.notationRegistry ?? null;
  if (notationRegistry !== null) {
    const state = buildNotationDerivedState(notationRegistry, index);
    checkNotationRegistry(index, state, sink);
    checkMultiRep(index, state, sink);
  }

  // Intervention authoring + misconception-pairing + biography +
  // equation-registry invariants.
  checkInterventions(index, ctx, sink);
  checkMisconceptionPairing(index, sink);
  checkBiography(index, ctx, sink);
  checkEquationRegistry(index, sink);

  return {
    errors: sink.errors,
    warnings: sink.warnings,
    info: sink.info,
  };
}
