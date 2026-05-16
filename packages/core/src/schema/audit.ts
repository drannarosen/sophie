import { z } from "zod";
import { NonEmptyString } from "./primitives.ts";

/**
 * Audit-finding schema — shared by the runtime audit pass
 * (`@sophie/astro/lib/pedagogy-audit`) and the pedagogy index's
 * `extractorFindings` slot (PR 3 of ADR 0056). Lives in `@sophie/core`
 * because both the audit module and the index schema reference it; per
 * ADR 0001 schemas are core-owned.
 *
 * Three severity levels:
 *
 *   - `ERROR`   — fails the build (`auditExitCode` returns 1).
 *   - `WARNING` — printed but build continues.
 *   - `INFO`    — informational; never fails CI.
 *
 * Findings without a `code` are rejected at parse time. The `location`
 * field is optional so global findings (e.g. F4 "registry figure with
 * zero usages anywhere") can omit it. Two address shapes are supported:
 *
 *   - `location.chapter` (+ optional `anchor`) — chapter-scoped findings
 *     (D4/D5/E4/F1/F2/C1/O1/O2/K1/MG1/MG2/CS2). `chapter` is a chapter
 *     slug as it appears in the pedagogy index's `chapters[].slug`.
 *
 *   - `location.path` — file-scoped findings on docs/website/ contracts
 *     (V0–V8 — ADR 0056). `path` is the repo-root-relative path to the
 *     ADR or reference doc, e.g. `docs/website/decisions/0007-…md`.
 *     Distinct from `chapter` so future tooling can disambiguate chapter
 *     slugs from contract-file paths in the audit report.
 */
export const AuditSeveritySchema = z.enum(["ERROR", "WARNING", "INFO"]);
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;

export const AuditFindingSchema = z.object({
  severity: AuditSeveritySchema,
  /** Short invariant code (e.g. "D4", "V1", "MG1"). Stable across versions. */
  code: NonEmptyString,
  /** Human-readable explanation. May reference identifiers from the index. */
  message: NonEmptyString,
  /** Optional origin pointer for the finding. */
  location: z
    .object({
      chapter: z.string().optional(),
      anchor: z.string().optional(),
      /** Repo-root-relative file path for V0–V8 contract findings (ADR 0056). */
      path: z.string().optional(),
    })
    .optional(),
});
export type AuditFinding = z.infer<typeof AuditFindingSchema>;
