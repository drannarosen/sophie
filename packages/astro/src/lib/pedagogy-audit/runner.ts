import type { PedagogyIndex } from "@sophie/core/schema";
import { buildAuditContext } from "./context.ts";
import { checkBiography } from "./invariants/biography.ts";
import { checkBR1 } from "./invariants/bridge-uniqueness.ts";
import { checkChapterStatus } from "./invariants/chapter-status.ts";
import { checkChapterTitleCollisions } from "./invariants/chapter-title-collisions.ts";
import { checkEquationRegistry } from "./invariants/equation-registry.ts";
import { passthroughExtractorFindings } from "./invariants/extractor-findings.ts";
import { checkInlineRefs } from "./invariants/inline-refs.ts";
import { checkInterventions } from "./invariants/interventions.ts";
import {
  checkKeyInsights,
  checkKISlugUnique,
} from "./invariants/key-insights.ts";
import { checkMisconceptionGraph } from "./invariants/misconception-graph.ts";
import { checkMisconceptionPairing } from "./invariants/misconception-pairing.ts";
import { checkMisconceptionSlugUnique } from "./invariants/misconceptions.ts";
import { checkMultiRep } from "./invariants/multirep.ts";
import {
  buildNotationDerivedState,
  checkNotationRegistry,
} from "./invariants/notation-registry.ts";
import { checkObjectives } from "./invariants/objectives.ts";
import { checkOMIFlow } from "./invariants/omi-flow.ts";
import { checkOrphans } from "./invariants/orphans.ts";
import { checkRetrievalFamily } from "./invariants/retrieval-family.ts";
import { checkPRA2 } from "./invariants/topic-consistency.ts";
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
 *   M3 — orphan misconception heuristic; deferred. The extractor
 *        emits an anchor for every misconception (auto-generated
 *        `misc-N` fallback ensures this), so the "anchor exists"
 *        axis is never null. A more useful M3 would track
 *        *referencing* callsites the way D5 tracks definitions,
 *        but no `<MisconceptionRef>` component exists in v1.
 *        MG3 already covers the intervention-pairing axis. See
 *        https://github.com/drannarosen/sophie/issues/118 for the
 *        revisit-trigger conditions + when NOT to implement.
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
  // CT-1 / CT-2 — chapter-title prefix collisions (e.g. two chapters
  // both titled "Lecture 3: …"). Authoring-time nudge surfaced by the
  // 2026-05-20 verify pass.
  checkChapterTitleCollisions(index, sink);
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

  // ADR 0063 — OF-1 (slot source-order WARN). OF-2 (chapter-level
  // conformance ERROR for framing: 'OMI') lands in PR-C.
  checkOMIFlow(index, sink);

  // Wedge B1 retrieval-family invariants (PRA-1 prereq activation,
  // RET-1 retrieval coverage, SR-1 SpacedReview ref validity).
  // Wedge B-followup W4b graduates PRA-1 to ERROR severity + honors
  // `audit_overrides` per ADR 0053 (per ADR 0079).
  checkRetrievalFamily(index, sink);

  // ADR 0079 (W4b) — PRA-2: topic frontmatter ↔ body card consistency.
  // The extractor catches body→frontmatter orphans by emitting findings
  // into extractorFindings (surfaced via passthroughExtractorFindings
  // above); PRA-2 here covers the inverse axis (frontmatter→body).
  checkPRA2(index, sink);

  // ADR 0079 + 0068 (W4b) — BR-1: bridge slug uniqueness. Each
  // Section[type=bridge] renders at Course root via
  // [bridgeSlug].astro; slug collisions with regular Sections, Unit
  // ids, or reserved Library paths would silently shadow other
  // routes.
  checkBR1(index, sink);

  // ADR 0070 (W4c D4) — KI-slug-unique: KeyInsight slug uniqueness.
  // The W4c derived-slug fallback (`${unit}-${anchor}` when title
  // absent) is globally unique, but the title-derived shape is not —
  // two KeyInsights in different chapters can share a title (and
  // `slugify("!!!") === "term"` per slugify.ts:19 makes any pair of
  // non-alphanumeric-only titles collapse to the same slug). Per-Spec-
  // page URLs are `/library/key-insights/<slug>/`, so collisions
  // would silently shadow.
  checkKISlugUnique(index, sink);

  // W4c Batch 1b (mirrors KI-slug-unique) — Misconception-slug-unique:
  // Misconception slug uniqueness. Same failure class as KI-slug-unique:
  // the label-derived slug shape is not globally unique, and the
  // pathological non-alphanumeric collapse to "term" is the same. Per-
  // Spec-page URLs are `/library/misconceptions/<slug>/` (W4c Batch 7
  // Task 7.2), so collisions would silently shadow.
  checkMisconceptionSlugUnique(index, sink);

  return {
    errors: sink.errors,
    warnings: sink.warnings,
    info: sink.info,
  };
}
