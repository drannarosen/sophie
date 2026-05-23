import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.ts";

/**
 * Per-author exception to a specific audit invariant, declared
 * in MDX frontmatter (chapter / unit / topic, depending on the
 * invariant's natural locus). Per
 * [ADR 0053](../../../../docs/website/decisions/0053-conformance-failure-modes.md)
 * §"audit_overrides chapter frontmatter".
 *
 * Three grains of suppression (ADR 0053):
 *
 * - **Grain 1 — per-invariant** (`anchor` omitted): suppress all
 *   findings for `invariant` within the host scope.
 * - **Grain 2 — per-anchor** (`anchor` present): suppress only
 *   findings whose `location.anchor` matches.
 * - **Grain 3 — per-(invariant, anchor) pair** (default when both
 *   set): identical to Grain 2 with strict matching.
 *
 * `tdr` is **mandatory** (CF2 ERROR otherwise): every override
 * carries provenance back to a Teaching Decision Record file in
 * `teaching-decisions/`. `reason` documents the human-readable
 * rationale.
 *
 * W4b introduces this schema; PRA-1 (ADR 0079) is the first
 * invariant to honor `audit_overrides` at runtime.
 */
export const AuditOverrideSchema = z.object({
  invariant: NonEmptyString,
  anchor: Slug.optional(),
  tdr: NonEmptyString,
  reason: NonEmptyString,
});
export type AuditOverride = z.infer<typeof AuditOverrideSchema>;
