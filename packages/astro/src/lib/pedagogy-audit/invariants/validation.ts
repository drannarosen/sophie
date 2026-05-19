import { existsSync } from "node:fs";
import { relative as relativePath, resolve as resolvePath } from "node:path";
import type { PedagogyIndex } from "@sophie/core/schema";
import { isValidIsoDate, todayIsoDate } from "../format.ts";
import type { AuditExtras, FindingSink } from "../types.ts";

/**
 * Validation-tracker audit invariants (V1–V7) per ADR 0056 PR 3.
 *
 *   V1  ERROR    ADR missing a validation block (promoted from WARNING
 *                in PR 6 after the bulk migration in PR #44 guaranteed
 *                coverage).
 *   V2  ERROR    Reference doc missing a validation block (promoted
 *                from WARNING in PR 6).
 *   V3  ERROR    status=validated/re-validation-needed but
 *                last_validated_date is null. Defense-in-depth: the
 *                schema's V3 refinement (PR #43) catches this at parse
 *                time, and extractor V0 surfaces parse failures. V3
 *                here guards inputs that bypass both (direct
 *                ContractValidationEntry construction in tests, future
 *                synthesizers).
 *   V4  ERROR    status=unvalidated but evidence or last_validated_date
 *                is non-empty.
 *   V5  ERROR    Evidence ref does not resolve on disk. Refs are
 *                repo-root-relative; resolved via `extras.repoRoot`.
 *   V6  ERROR    Evidence date is not a valid ISO YYYY-MM-DD.
 *   V7  WARNING  last_validated_date is in the future (date-only ISO
 *                compare — TZ-stable).
 *
 * V0 + V8 live in the extractor-findings passthrough (they're
 * raw-frontmatter-time signals, not typed-validation-time signals).
 */
export function checkValidation(
  index: PedagogyIndex,
  extras: AuditExtras,
  sink: FindingSink
): void {
  // V5 safety: if any contract has non-null evidence refs and the
  // caller didn't pass `repoRoot` explicitly, fail loudly rather than
  // silently existence-check against `process.cwd()` (which would be
  // the harness's cwd in tests — wrong filesystem). The production
  // caller in TextbookLayout.astro always passes `repoRoot`, so this
  // only fires for test fixtures that exercise V5 without setting it
  // up.
  if (extras.repoRoot === undefined) {
    const v5Hit = index.contractValidations.find(
      (entry) =>
        entry.validation?.evidence.some((ev) => ev.ref !== null) ?? false
    );
    if (v5Hit !== undefined) {
      throw new Error(
        `runPedagogyAudit: contractValidations contain non-null evidence refs (first hit: ${v5Hit.path}) but no repoRoot was passed in AuditExtras. Refs are repo-root-relative and cannot be existence-checked deterministically without it. Pass extras.repoRoot explicitly.`
      );
    }
  }
  const repoRoot = extras.repoRoot ?? process.cwd();
  const today = todayIsoDate();

  for (const entry of index.contractValidations) {
    if (
      !entry.validation &&
      entry.path.startsWith("docs/website/decisions/") &&
      !entry.path.endsWith("/template.md")
    ) {
      sink.errors.push({
        severity: "ERROR",
        code: "V1",
        message: `V1: ADR is missing a validation block: ${entry.path}`,
        location: { path: entry.path },
      });
    }

    if (!entry.validation && entry.path.startsWith("docs/website/reference/")) {
      sink.errors.push({
        severity: "ERROR",
        code: "V2",
        message: `V2: reference doc is missing a validation block: ${entry.path}`,
        location: { path: entry.path },
      });
    }

    if (!entry.validation) continue;
    const v = entry.validation;

    // V3 — defense-in-depth.
    if (
      (v.status === "validated" || v.status === "re-validation-needed") &&
      v.last_validated_date === null
    ) {
      sink.errors.push({
        severity: "ERROR",
        code: "V3",
        message: `V3: ${entry.path}: status is "${v.status}" but last_validated_date is null.`,
        location: { path: entry.path },
      });
    }

    if (
      v.status === "unvalidated" &&
      (v.evidence.length > 0 || v.last_validated_date !== null)
    ) {
      sink.errors.push({
        severity: "ERROR",
        code: "V4",
        message: `V4: ${entry.path}: status is "unvalidated" but evidence or last_validated_date is non-empty.`,
        location: { path: entry.path },
      });
    }

    for (const ev of v.evidence) {
      // V5 — null refs are deferred-evidence sentinels (intentional,
      // schema-permitted); only non-null refs are existence-checked.
      //
      // Path-escape guard: `path.resolve(repoRoot, ref)` discards
      // `repoRoot` when `ref` is absolute, and follows `..` segments
      // unbounded. Without this guard, `ref: "/etc/hosts"` or
      // `ref: "../../../etc/hosts"` would pass V5 silently against any
      // host with that file present — a correctness bug, even if not
      // a security risk under Sophie's trust model (refs are author-
      // controlled by maintainers, not untrusted contributors).
      if (ev.ref !== null) {
        const resolved = resolvePath(repoRoot, ev.ref);
        const rel = relativePath(repoRoot, resolved);
        const escapes =
          rel.startsWith("..") || rel === "" || resolvePath(rel) === resolved;
        if (escapes) {
          sink.errors.push({
            severity: "ERROR",
            code: "V5",
            message: `V5: ${entry.path}: evidence ref must be repo-root-relative (got an absolute or escaping path): ${ev.ref}`,
            location: { path: entry.path },
          });
        } else if (!existsSync(resolved)) {
          sink.errors.push({
            severity: "ERROR",
            code: "V5",
            message: `V5: ${entry.path}: evidence ref does not exist on disk: ${ev.ref}`,
            location: { path: entry.path },
          });
        }
      }

      // V6 — null dates are permitted (deferred evidence); only
      // non-null dates are format-checked.
      if (ev.date !== null && !isValidIsoDate(ev.date)) {
        sink.errors.push({
          severity: "ERROR",
          code: "V6",
          message: `V6: ${entry.path}: evidence date is not a valid ISO YYYY-MM-DD: ${ev.date}`,
          location: { path: entry.path },
        });
      }
    }

    // V7 — date-only string compare against today's ISO date is
    // timezone-stable (no Date.parse interpretation involved).
    if (v.last_validated_date !== null && v.last_validated_date > today) {
      sink.warnings.push({
        severity: "WARNING",
        code: "V7",
        message: `V7: ${entry.path}: last_validated_date is in the future: ${v.last_validated_date}`,
        location: { path: entry.path },
      });
    }
  }
}
