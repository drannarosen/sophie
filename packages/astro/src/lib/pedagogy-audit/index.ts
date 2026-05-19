/**
 * Barrel for the pedagogy-audit cluster (ADR 0061 C2).
 *
 * The cluster splits the former 1,493-LOC `pedagogy-audit.ts` into
 * focused files organized by role per ADR 0061 Rules 1 + 4:
 *
 *   - `types.ts`         — AuditReport, AuditExtras, Severity exports.
 *   - `context.ts`       — buildAuditContext: shared lookup sets.
 *   - `format.ts`        — formatAuditReport, auditExitCode, ISO date
 *                          helpers.
 *   - `runner.ts`        — runPedagogyAudit orchestrator.
 *   - `invariants/*.ts`  — one file per invariant family. The session-
 *                          prompt grouping (inline-refs, objectives,
 *                          orphans, key-insights, misconception-graph,
 *                          chapter-status, extractor-findings,
 *                          validation, notation-registry, multirep,
 *                          interventions, misconception-pairing,
 *                          biography, equation-registry) mirrors C1's
 *                          extractor categories one-to-one wherever
 *                          a domain overlaps.
 *
 * Consumers can import from this barrel for ergonomics, or from the
 * focused file for blast-radius traceability. Production code
 * (`audit-cache.ts`) imports the focused symbols it needs; tests use
 * the barrel (single import line for `runPedagogyAudit`).
 */

export {
  auditExitCode,
  formatAuditReport,
} from "./format.ts";
export { runPedagogyAudit } from "./runner.ts";
export type {
  AuditExtras,
  AuditFinding,
  AuditReport,
  FindingSink,
  Severity,
} from "./types.ts";
