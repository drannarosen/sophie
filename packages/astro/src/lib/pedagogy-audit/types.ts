import type { AuditFinding, NotationRegistry } from "@sophie/core/schema";
import type { MathSpeechCoverage } from "./math-speech-coverage.ts";

/**
 * Shared types for the pedagogy-audit cluster.
 *
 * `Severity` and `AuditFinding` themselves live in `@sophie/core/schema`
 * (PR 3 of ADR 0056) so `PedagogyIndexSchema.extractorFindings` can
 * reference the canonical shape. This module keeps a local alias for
 * `Severity` for diff-minimal call-site compatibility.
 */

export type Severity = AuditFinding["severity"];
export type { AuditFinding };

export interface AuditReport {
  errors: AuditFinding[];
  warnings: AuditFinding[];
  info: AuditFinding[];
}

/**
 * Optional inputs for the audit beyond the in-memory pedagogy index.
 * Threaded through TextbookLayout's audit call so the audit can surface
 * signals that aren't reachable from the (already-filtered) index — in
 * particular CS2 INFO, which reports `status: draft` Units that
 * the route-level filter (W2/D2 graduation; previously
 * `getStudentChapters`, deleted with `ChapterEntrySchema` in W2/D3)
 * excluded from the student build.
 */
export interface AuditExtras {
  /**
   * Slugs of chapters with `status: draft` (ADR 0051). The audit emits
   * one CS2 INFO finding per slug. Empty / undefined => no CS2 output.
   */
  draftUnitIds?: ReadonlyArray<string>;
  /**
   * Repo-root path against which evidence refs in `contractValidations`
   * are resolved (V5 — ADR 0056). Defaults to `process.cwd()` when
   * omitted, which is correct for the production caller
   * (`TextbookLayout.astro` runs at the consumer-app cwd, which IS the
   * repo root). Tests that exercise V5 (i.e. construct fixtures with
   * non-null `evidence[].ref`) MUST pass an explicit `repoRoot` — the
   * V5 loop throws if it would otherwise fall through to `process.cwd()`
   * with non-null refs, since that would silently existence-check
   * against the wrong filesystem.
   */
  repoRoot?: string;
  /**
   * Loaded Notation Registry per ADR 0043 + 2026-05-17 design hardening.
   * When `null` or absent, the NR/MR invariants are skipped (consumer
   * hasn't opted in via
   * `pedagogy-contract.yaml.math_and_units_standards.notation_registry`).
   * Threaded from `TextbookLayout.astro` (PR-ε wire-up): the layout
   * calls `loadConsumerRegistry(consumerRoot)`, pushes the registry
   * into the accumulator via `setNotationRegistry`, and passes it here
   * as the audit's NR/MR input. Tests construct fixtures inline (no
   * accumulator round-trip required).
   */
  notationRegistry?: NotationRegistry | null;
  /**
   * Build-scoped math-speech coverage snapshot (ADR 0089 B5). Threaded
   * from the `astro:build:done` hook, which calls
   * `getMathSpeechCoverage()` after every route has prerendered (so the
   * three build-time math surfaces have all recorded). Absent => the
   * MA-* invariant reports an empty snapshot (zero coverage, no MA-1
   * warning) — correct for callers that don't process math (e.g. the
   * per-render TextbookLayout dev audit + most invariant unit tests).
   */
  mathSpeechCoverage?: MathSpeechCoverage;
}

/**
 * Mutable accumulator passed to each invariant check. Invariant checks
 * push findings here instead of returning arrays — keeps each check
 * signature uniform and avoids per-check allocation. The runner
 * collects the populated arrays into the final `AuditReport`.
 */
export interface FindingSink {
  errors: AuditFinding[];
  warnings: AuditFinding[];
  info: AuditFinding[];
}
