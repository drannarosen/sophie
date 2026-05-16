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
 * zero usages anywhere") can omit it; chapter-scoped findings populate
 * `location.chapter` and optionally `location.anchor`.
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
    })
    .optional(),
});
export type AuditFinding = z.infer<typeof AuditFindingSchema>;
