import type { AuditFinding, AuditReport } from "./types.ts";

/**
 * Human-readable formatting helpers for the audit report.
 *
 * Separated from the runner + invariants so the formatting surface can
 * evolve (e.g. JSON output, colored TTY output, MyST-formatted output
 * for a docs page) without churn elsewhere.
 */

/** ISO YYYY-MM-DD validator. Rejects malformed strings like "May 14, 2026" or "2026-13-99". */
export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  // Round-trip check rejects things like 2026-02-31 that Date.parse
  // tolerates by wrapping to March.
  const round = new Date(t).toISOString().slice(0, 10);
  return round === s;
}

/** Today's date in ISO YYYY-MM-DD (UTC). */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Pluralize "error/errors", "warning/warnings", "info" finding count for the summary line. */
function pluralize(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? "" : "s"}`;
}

/**
 * Format a finding as a single human-readable line. Shape:
 *   `  [SEVERITY code] message (chapter: X, anchor: Y)`
 */
function formatFinding(f: AuditFinding): string {
  const locParts: string[] = [];
  // `path` (V0–V8 contract findings) and `unit` (D4/D5/E4/F1/F2/C1/O1/
  // O2/K1/MG1/MG2/CS2) are mutually exclusive in practice; render whichever
  // is present. `path` first since it carries the more specific
  // file-system identity when both somehow appear together. Per W3/D2 the
  // CLI prefix word stays as "chapter:" because educators think in chapter
  // vocabulary (D7 lock); the internal field is `location.unit` post-W3.
  if (f.location?.path) locParts.push(`path: ${f.location.path}`);
  if (f.location?.unit) locParts.push(`chapter: ${f.location.unit}`);
  if (f.location?.anchor) locParts.push(`anchor: ${f.location.anchor}`);
  const loc = locParts.length > 0 ? ` (${locParts.join(", ")})` : "";
  return `  [${f.severity} ${f.code}] ${f.message}${loc}`;
}

/**
 * Format an AuditReport as a human-readable text block for stdout.
 * Prints a one-line summary on top followed by each finding on its
 * own line, grouped by severity.
 */
export function formatAuditReport(report: AuditReport): string {
  const header = `Pedagogy audit: ${pluralize(report.errors.length, "error")}, ${pluralize(
    report.warnings.length,
    "warning"
  )}, ${pluralize(report.info.length, "info")}`;
  const lines: string[] = [header];

  if (report.errors.length > 0) {
    lines.push("");
    for (const e of report.errors) lines.push(formatFinding(e));
  }
  if (report.warnings.length > 0) {
    lines.push("");
    for (const w of report.warnings) lines.push(formatFinding(w));
  }
  if (report.info.length > 0) {
    lines.push("");
    for (const i of report.info) lines.push(formatFinding(i));
  }

  return lines.join("\n");
}

/**
 * Map an AuditReport to a process exit code: 0 when there are no
 * errors, 1 when at least one error finding exists. Warnings and info
 * findings never fail the build.
 */
export function auditExitCode(report: AuditReport): 0 | 1 {
  return report.errors.length > 0 ? 1 : 0;
}
