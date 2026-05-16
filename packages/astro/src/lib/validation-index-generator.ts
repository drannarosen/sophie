import type {
  AuditFinding,
  ContractValidationEntry,
  PedagogyIndex,
  ValidationKind,
  ValidationStatus,
} from "@sophie/core/schema";

/**
 * Validation-status index generator (ADR 0056 PR 5).
 *
 * Pure function: `generateValidationIndex(index)` returns the
 * Markdown body for `docs/website/status/validation.md`. Consumes
 * only `index.contractValidations` (PR 3 of ADR 0056) and
 * `index.extractorFindings` (V0 + V8 surfaced by the extractor).
 *
 * The page is "build-generated source": checked into the repo
 * (so MyST picks it up at build time) but **never hand-edited** —
 * `writeValidationIndexMarkdown` overwrites it on every Pagefind
 * postbuild. The page is tagged `private` in `docs/website/myst.yml`
 * so the public build excludes it (gate matches PR #50's
 * `SOPHIE_DOCS_INCLUDE_VALIDATION` flag for symmetry).
 *
 * Why a pure function vs a file-writing helper: easy to unit-test
 * the Markdown shape with fixture inputs; the wrapper
 * `writeValidationIndexMarkdown` handles env-flag check + I/O.
 */

const STATUS_ORDER: readonly ValidationStatus[] = [
  "validated",
  "in-progress",
  "unvalidated",
  "re-validation-needed",
] as const;

const STATUS_LABELS: Record<ValidationStatus, string> = {
  validated: "Validated",
  "in-progress": "In progress",
  unvalidated: "Unvalidated",
  "re-validation-needed": "Re-validation needed",
};

const EVIDENCE_KIND_ORDER: readonly ValidationKind[] = [
  "test",
  "chapter",
  "review",
  "deployment",
  "audit",
  "manual",
] as const;

const GENERATED_BANNER = [
  "<!-- GENERATED FILE — DO NOT EDIT BY HAND.",
  "     Produced by @sophie/astro's pagefind-postbuild hook",
  "     (packages/astro/src/lib/validation-index-generator.ts).",
  "     Re-run `pnpm turbo run build --filter=@sophie/astro --filter=smoke`",
  "     to regenerate. Suppressed when SOPHIE_DOCS_INCLUDE_VALIDATION=0. -->",
].join("\n");

const FRONTMATTER = [
  "---",
  "title: Validation status",
  "short_title: Validation",
  "description: Build-generated dashboard of every ADR + reference doc's validation status (ADR 0056).",
  "tags: [private]",
  "---",
].join("\n");

function categorizeContracts(contracts: readonly ContractValidationEntry[]): {
  byStatus: Record<ValidationStatus, ContractValidationEntry[]>;
  missing: ContractValidationEntry[];
} {
  const byStatus: Record<ValidationStatus, ContractValidationEntry[]> = {
    validated: [],
    "in-progress": [],
    unvalidated: [],
    "re-validation-needed": [],
  };
  const missing: ContractValidationEntry[] = [];
  for (const entry of contracts) {
    if (entry.validation === undefined) {
      missing.push(entry);
    } else {
      byStatus[entry.validation.status].push(entry);
    }
  }
  return { byStatus, missing };
}

function renderStatusSummary(
  byStatus: Record<ValidationStatus, ContractValidationEntry[]>,
  missingCount: number,
  totalCount: number
): string {
  const rows: string[] = [
    "| Status | Count |",
    "|---|---|",
    ...STATUS_ORDER.map(
      (s) => `| ${STATUS_LABELS[s]} | ${byStatus[s].length} |`
    ),
    `| Missing block | ${missingCount} |`,
    `| Total | ${totalCount} |`,
  ];
  return ["## Status summary", "", ...rows].join("\n");
}

function renderEvidenceKindsTable(
  contracts: readonly ContractValidationEntry[]
): string {
  const counts: Record<ValidationKind, number> = {
    test: 0,
    chapter: 0,
    review: 0,
    deployment: 0,
    audit: 0,
    manual: 0,
  };
  for (const entry of contracts) {
    if (entry.validation === undefined) continue;
    for (const ev of entry.validation.evidence) {
      counts[ev.kind] += 1;
    }
  }
  const rows: string[] = [
    "| Kind | Count |",
    "|---|---|",
    ...EVIDENCE_KIND_ORDER.map((k) => `| ${k} | ${counts[k]} |`),
  ];
  return ["## Evidence kinds", "", ...rows].join("\n");
}

function renderExtractorFindings(findings: readonly AuditFinding[]): string {
  const parts: string[] = ["## Extractor findings", ""];
  if (findings.length === 0) {
    parts.push("_No extractor findings (V0 + V8) surfaced during this build._");
    return parts.join("\n");
  }

  const codeCounts = new Map<string, number>();
  for (const f of findings) {
    codeCounts.set(f.code, (codeCounts.get(f.code) ?? 0) + 1);
  }
  const sortedCodes = Array.from(codeCounts.keys()).sort();

  parts.push("| Code | Count |", "|---|---|");
  for (const code of sortedCodes) {
    parts.push(`| ${code} | ${codeCounts.get(code) ?? 0} |`);
  }

  parts.push("", "### Findings list", "");
  for (const f of findings) {
    const location = f.location?.chapter ?? "—";
    parts.push(`- **${f.severity} ${f.code}** — ${f.message} (${location})`);
  }
  return parts.join("\n");
}

function formatEvidenceCell(entry: ContractValidationEntry): string {
  if (entry.validation === undefined) return "—";
  const kinds = new Set<string>();
  for (const ev of entry.validation.evidence) {
    kinds.add(ev.kind);
  }
  if (kinds.size === 0) return "—";
  return Array.from(kinds).sort().join(", ");
}

function formatStatusCell(entry: ContractValidationEntry): string {
  if (entry.validation === undefined) return "_missing_";
  return STATUS_LABELS[entry.validation.status].toLowerCase();
}

function formatDateCell(entry: ContractValidationEntry): string {
  if (entry.validation === undefined) return "—";
  return entry.validation.last_validated_date ?? "—";
}

function formatNotesCell(entry: ContractValidationEntry): string {
  if (entry.validation === undefined) return "no validation block";
  const notes = entry.validation.notes ?? "";
  // Escape pipes so they don't break the Markdown table; collapse newlines.
  return notes.replaceAll("\n", " ").replaceAll("|", "\\|");
}

function renderContractsTable(
  contracts: readonly ContractValidationEntry[]
): string {
  if (contracts.length === 0) {
    return "_No contracts in this group._";
  }
  const sorted = [...contracts].sort((a, b) => a.path.localeCompare(b.path));
  const rows: string[] = [
    "| Contract | Status | Last validated | Evidence | Notes |",
    "|---|---|---|---|---|",
  ];
  for (const entry of sorted) {
    rows.push(
      `| [${entry.path}](/${entry.path.replace(/\.md$/, "/")}) ` +
        `| ${formatStatusCell(entry)} ` +
        `| ${formatDateCell(entry)} ` +
        `| ${formatEvidenceCell(entry)} ` +
        `| ${formatNotesCell(entry)} |`
    );
  }
  return rows.join("\n");
}

function renderContractsSection(
  contracts: readonly ContractValidationEntry[]
): string {
  const adrs: ContractValidationEntry[] = [];
  const refs: ContractValidationEntry[] = [];
  for (const entry of contracts) {
    if (entry.path.startsWith("docs/website/decisions/")) {
      adrs.push(entry);
    } else if (entry.path.startsWith("docs/website/reference/")) {
      refs.push(entry);
    }
  }
  return [
    "## Contracts",
    "",
    "### ADRs",
    "",
    renderContractsTable(adrs),
    "",
    "### Reference docs",
    "",
    renderContractsTable(refs),
  ].join("\n");
}

/**
 * Render the validation-status index Markdown body.
 *
 * Sections, in order:
 *   1. Generated-source banner (HTML comment) + frontmatter
 *   2. Status summary table (counts per ValidationStatus + missing-block + total)
 *   3. Evidence-kinds cross-tab (counts per ValidationKind)
 *   4. Extractor findings (V0 + V8 counts + per-finding listing)
 *   5. Per-contract listing grouped by ADRs / reference docs
 */
export function generateValidationIndex(index: PedagogyIndex): string {
  const contracts = index.contractValidations;
  const { byStatus, missing } = categorizeContracts(contracts);

  const sections: string[] = [
    FRONTMATTER,
    "",
    GENERATED_BANNER,
    "",
    "# Validation status",
    "",
    "Snapshot of every ADR and reference doc's `validation:` frontmatter",
    "block (ADR 0056). Regenerated on every build; suppressed when",
    "`SOPHIE_DOCS_INCLUDE_VALIDATION=0`.",
    "",
    renderStatusSummary(byStatus, missing.length, contracts.length),
    "",
    renderEvidenceKindsTable(contracts),
    "",
    renderExtractorFindings(index.extractorFindings),
    "",
    renderContractsSection(contracts),
    "",
  ];
  return sections.join("\n");
}
