import type {
  AuditFinding,
  ContractValidationEntry,
  PageStatus,
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

const PAGE_STATUS_ORDER: readonly PageStatus[] = [
  "shipped",
  "accepted-design",
  "mixed",
  "future-package-split",
] as const;

const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  shipped: "Shipped",
  "accepted-design": "Accepted design",
  mixed: "Mixed",
  "future-package-split": "Future package split",
};

const GENERATED_BANNER = [
  "<!-- GENERATED FILE — DO NOT EDIT BY HAND.",
  "     Produced by @sophie/astro's pagefind-postbuild hook",
  "     (packages/astro/src/lib/validation/index-generator.ts).",
  "     Re-run `pnpm tsx scripts/regenerate-validation-index.mts` from the",
  "     repo root to regenerate. Suppressed when SOPHIE_DOCS_INCLUDE_VALIDATION=0.",
  "     (The smoke build's cwd has no docs/website/, so its pagefind-postbuild",
  "     pass is a no-op; the explicit script is the canonical regeneration path.) -->",
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

/**
 * Page-status summary (ADR 0062): counts per `PageStatus` value
 * across all contracts. Separate axis from the validation-status
 * summary above — see ADR 0062 for the orthogonality argument.
 * "No status" tracks rollout incompleteness; eventually every page
 * should carry one.
 */
function renderPageStatusSummary(
  contracts: readonly ContractValidationEntry[]
): string {
  const counts: Record<PageStatus, number> = {
    shipped: 0,
    "accepted-design": 0,
    mixed: 0,
    "future-package-split": 0,
  };
  let noStatus = 0;
  for (const entry of contracts) {
    if (entry.status === undefined) {
      noStatus += 1;
    } else {
      counts[entry.status] += 1;
    }
  }
  const rows: string[] = [
    "| Lifecycle | Count |",
    "|---|---|",
    ...PAGE_STATUS_ORDER.map(
      (s) => `| ${PAGE_STATUS_LABELS[s]} | ${counts[s]} |`
    ),
    `| No status | ${noStatus} |`,
    `| Total | ${contracts.length} |`,
  ];
  return ["## Lifecycle summary", "", ...rows].join("\n");
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
    // Two distinct address shapes per audit.ts (ADR 0056): chapter-scoped
    // findings carry location.unit; contract-scoped findings (V0/V8/S0)
    // carry location.path. Prefer the more-specific present field; fall
    // back to em-dash when the finding is global (no location at all,
    // e.g. F4 "registry figure with zero usages anywhere"). Issue #121.
    const location = f.location?.unit ?? f.location?.path ?? "—";
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

function formatLifecycleCell(entry: ContractValidationEntry): string {
  if (entry.status === undefined) return "—";
  return PAGE_STATUS_LABELS[entry.status].toLowerCase();
}

function formatDateCell(entry: ContractValidationEntry): string {
  if (entry.validation === undefined) return "—";
  return entry.validation.last_validated_date ?? "—";
}

function formatNotesCell(entry: ContractValidationEntry): string {
  if (entry.validation === undefined) return "no validation block";
  const notes = entry.validation.notes ?? "";
  // Escape only the characters that genuinely break Markdown tables:
  //   - `\` first (so subsequent escapes don't double up).
  //   - `|`        — table-column separator.
  //   - `\n`       — collapse to single spaces.
  //
  // Backticks / asterisks / brackets are NOT escaped: post-W4c PR 3
  // surfaced that author-written notes legitimately use inline
  // code spans (`` `@sophie/*` ``), bold (`**text**`), and link
  // syntax (`[text](url)`) — escaping them turned valid code spans
  // into `\`@sophie/\*\`` which MyST then mis-parses as a citation
  // reference (`@sophie/core` was flagged "citation not found"
  // because the surrounding backticks were escaped away). Markdown
  // tables can render inline-code / bold / links inside cells as
  // long as `|` and `\n` are escaped; the previous I1 over-escape
  // (which motivated the wider escape list) is mitigated by the
  // narrower table-breaker set without sacrificing inline markup.
  return notes
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function renderContractsTable(
  contracts: readonly ContractValidationEntry[]
): string {
  if (contracts.length === 0) {
    return "_No contracts in this group._";
  }
  const sorted = [...contracts].sort((a, b) => a.path.localeCompare(b.path));
  const rows: string[] = [
    "| Contract | Status | Lifecycle | Last validated | Evidence | Notes |",
    "|---|---|---|---|---|---|",
  ];
  for (const entry of sorted) {
    rows.push(
      `| [${entry.path}](${contractHref(entry.path)}) ` +
        `| ${formatStatusCell(entry)} ` +
        `| ${formatLifecycleCell(entry)} ` +
        `| ${formatDateCell(entry)} ` +
        `| ${formatEvidenceCell(entry)} ` +
        `| ${formatNotesCell(entry)} |`
    );
  }
  return rows.join("\n");
}

/**
 * Map a contract source path to its MyST-rendered URL.
 *
 * MyST flattens routes: the rendered URL is `/<slug>/` where `<slug>` is
 * the filename's basename with `.md` stripped and any leading `NNNN-`
 * numeric prefix removed. The source directory (decisions/ vs reference/)
 * does NOT appear in the URL. Verified against the rendered HTML build:
 *
 *   - `docs/website/decisions/0001-platform-not-monorepo.md`
 *       → `/platform-not-monorepo/`
 *   - `docs/website/decisions/0007-persistence-indexeddb.md`
 *       → `/persistence-indexeddb/`
 *   - `docs/website/reference/validation-tracker.md`
 *       → `/validation-tracker/`
 *
 * Prior incarnation (`/decisions/0001-…/`) was based on a wrong
 * assumption about MyST routing and every contract link 404'd; the I5
 * integration test in `validation/index-generator.integration.test.ts`
 * exists to lock this contract by resolving links against the rendered
 * HTML build artifacts.
 */
export function contractHref(sourcePath: string): string {
  const filename = sourcePath.replace(/^.*\//, "");
  const stem = filename.replace(/\.md$/, "");
  const slug = stem.replace(/^\d{4}-/, "");
  return `/${slug}/`;
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
 *   3. Lifecycle summary table (counts per PageStatus — ADR 0062)
 *   4. Evidence-kinds cross-tab (counts per ValidationKind)
 *   5. Extractor findings (V0 + V8 + S0 counts + per-finding listing)
 *   6. Per-contract listing grouped by ADRs / reference docs (with Lifecycle column)
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
    "block (ADR 0056) and page-level `status:` field (ADR 0062). Regenerated",
    "on every build; suppressed when `SOPHIE_DOCS_INCLUDE_VALIDATION=0`.",
    "",
    renderStatusSummary(byStatus, missing.length, contracts.length),
    "",
    renderPageStatusSummary(contracts),
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
