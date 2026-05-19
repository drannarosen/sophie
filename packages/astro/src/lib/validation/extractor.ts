import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type {
  AuditFinding,
  ContractValidationEntry,
} from "@sophie/core/schema";
import { PageStatusSchema, ValidationSchema } from "@sophie/core/schema";
import matter from "gray-matter";
import { extractLastRevisedDate } from "../last-revised-date.ts";

/**
 * Contract-validations extractor (ADR 0056 PR 3) — the build-time
 * walk that produces every ADR's and reference doc's
 * `ContractValidationEntry`, plus the V0 + V8 findings that ride on
 * `PedagogyIndex.extractorFindings`.
 *
 * Three responsibilities:
 *
 *   1. Walk `docs/website/decisions/*.md` and `docs/website/reference/*.md`,
 *      parse each file's frontmatter, and build `ContractValidationEntry[]`.
 *      The `template.md` ADR file is excluded (it's a scaffold, not a real
 *      ADR).
 *
 *   2. **V0 — schema parse failure (ERROR).** When the `validation:`
 *      block exists but `ValidationSchema.safeParse` rejects it, emit
 *      one V0 ERROR finding per failing file. Without V0 the entry's
 *      `validation` would silently fall through to `undefined`, which
 *      would then fire V1/V2 (missing block) at the audit layer
 *      instead of the real cause — making V3/V5/V6 dead code.
 *
 *   3. **V8 — unknown key (INFO).** Zod 4's `z.object()` defaults to
 *      `.strip()`, which silently drops unknown keys. The extractor
 *      diffs `Object.keys(rawBlock)` against `KNOWN_VALIDATION_KEYS`
 *      and emits one INFO finding per stray key. Catches typos like
 *      `last_validation_date` (missing "ed") or `evidence_summary`.
 *      Severity is INFO so it never breaks CI (auditExitCode treats
 *      only ERROR as failure).
 *
 *   4. **S0 — page-status parse failure (INFO).** When the page-level
 *      `status:` frontmatter (ADR 0062) is present but
 *      `PageStatusSchema.safeParse` rejects it, emit one S0 INFO
 *      finding per failing file. Severity is INFO (not ERROR) because
 *      the field is optional during rollout and a typo's blast radius
 *      is limited to silently rendering the bad value in the dashboard
 *      — observability beats blocking until every page has been
 *      audited. Pages with no `status:` field produce no S0 finding.
 *
 * Layer split (per the PR 3 hardening review): V0 + V8 + S0 live HERE
 * because they need raw `Record<string, unknown>` access to detect
 * schema rejection and stripped keys. V1–V7 — which operate on
 * already-typed `Validation` blocks — live in `pedagogy-audit.ts`.
 * The split eliminates every `as unknown as Validation` cast.
 */

const KNOWN_VALIDATION_KEYS = new Set<string>([
  "status",
  "last_validated_date",
  "evidence",
  "notes",
]);

const CONTRACT_DIRS = [
  "docs/website/decisions",
  "docs/website/reference",
] as const;

/** Files inside `decisions/` that are not real ADRs and should be skipped. */
const DECISIONS_SKIPLIST = new Set<string>(["template.md"]);

export interface ContractValidationsExtractionResult {
  /** One entry per discovered contract file. */
  entries: ContractValidationEntry[];
  /** V0 + V8 findings surfaced by the extractor; flow into `index.extractorFindings`. */
  findings: AuditFinding[];
}

/**
 * Walk the contract directories under `rootDir` (repo root) and
 * produce `ContractValidationEntry[]` + extractor findings.
 *
 * Returns an empty result for directories that don't exist on disk
 * — consumer repos without `docs/website/decisions/` keep working
 * unchanged. Async I/O via `node:fs/promises` to match the rest of
 * the extractor pipeline.
 */
export async function extractContractValidations(
  rootDir: string
): Promise<ContractValidationsExtractionResult> {
  const entries: ContractValidationEntry[] = [];
  const findings: AuditFinding[] = [];

  for (const subdir of CONTRACT_DIRS) {
    const absDir = join(rootDir, subdir);
    let dirents: string[];
    try {
      dirents = await readdir(absDir);
    } catch (err) {
      // ENOENT (directory absent) is the expected shape for consumer
      // repos that don't carry a `docs/website/decisions/` tree.
      // Surface anything else (permission errors, etc.) so build
      // misconfigurations don't fail silently.
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "ENOENT"
      ) {
        continue;
      }
      throw err;
    }

    const isDecisions = subdir === "docs/website/decisions";
    const mdFiles = dirents.filter(
      (name) =>
        name.endsWith(".md") && !(isDecisions && DECISIONS_SKIPLIST.has(name))
    );
    mdFiles.sort();

    for (const name of mdFiles) {
      const filepath = join(absDir, name);
      const source = await readFile(filepath, "utf8");
      const relPath = relative(rootDir, filepath).split("\\").join("/");

      const parsed = matter(source);
      const data = parsed.data as Record<string, unknown>;
      const rawBlock = data.validation as Record<string, unknown> | undefined;
      const rawStatus = data.status;

      let validation: ContractValidationEntry["validation"];
      let status: ContractValidationEntry["status"];

      if (rawStatus !== undefined && rawStatus !== null) {
        // S0 — page-status parse failure (ADR 0062). Severity INFO
        // matches V8's "observability not gatekeeping" stance during
        // rollout. The field is documented in
        // docs/website/decisions/0062-page-status-frontmatter-enum.md.
        const statusResult = PageStatusSchema.safeParse(rawStatus);
        if (statusResult.success) {
          status = statusResult.data;
        } else {
          findings.push({
            severity: "INFO",
            code: "S0",
            message: `S0: ${relPath}: page-level 'status:' field has unknown value (got: ${JSON.stringify(rawStatus)}; expected one of: shipped, accepted-design, mixed, future-package-split).`,
            location: { path: relPath },
          });
          status = undefined;
        }
      }

      if (rawBlock !== undefined && rawBlock !== null) {
        const result = ValidationSchema.safeParse(rawBlock);
        if (result.success) {
          validation = result.data;
        } else {
          // V0 — schema parse failure. One ERROR finding per failing
          // file; the issue list is folded into the message so the
          // audit report carries actionable detail.
          const issueText = result.error.issues
            .map((issue) => {
              const path = issue.path.join(".");
              return path ? `${path}: ${issue.message}` : issue.message;
            })
            .join("; ");
          findings.push({
            severity: "ERROR",
            code: "V0",
            message: `V0: ${relPath}: validation block failed schema parse: ${issueText}`,
            location: { path: relPath },
          });
          validation = undefined;
        }

        // V8 — unknown keys. Zod 4's z.object() defaults to .strip()
        // which silently drops them, so the schema parse alone cannot
        // see them. We diff against KNOWN_VALIDATION_KEYS and emit one
        // INFO finding per stray key. Sorted for stable output.
        //
        // Guard: V8 only runs on real object shapes. If `rawBlock` is a
        // string / array / scalar (already caught by V0's schema parse
        // failure), `Object.keys` would synthesize integer-string keys
        // ["0", "1", …] for strings/arrays — meaningless V8 noise that
        // duplicates V0's message. Skip the diff in those cases.
        const isPlainObject =
          typeof rawBlock === "object" &&
          rawBlock !== null &&
          !Array.isArray(rawBlock);
        if (isPlainObject) {
          const unknownKeys = Object.keys(rawBlock)
            .filter((k) => !KNOWN_VALIDATION_KEYS.has(k))
            .sort();
          for (const key of unknownKeys) {
            findings.push({
              severity: "INFO",
              code: "V8",
              message: `V8: ${relPath}: validation block has unknown key '${key}' (known keys: status, last_validated_date, evidence, notes).`,
              location: { path: relPath },
            });
          }
        }
      }

      entries.push({
        path: relPath,
        validation,
        status,
        lastRevisedDate: extractLastRevisedDate(source),
      });
    }
  }

  return { entries, findings };
}
