import {
  type Validation,
  type ValidationEvidence,
  ValidationSchema,
} from "@sophie/core/schema";

/**
 * Parse a raw frontmatter `validation:` block via `ValidationSchema.safeParse`,
 * returning the typed shape on success or `undefined` on failure. The MyST
 * plugin entry point calls this on every contract page so the admonition
 * renderer always sees a fully validated + date-coerced `Validation` (or
 * the missing-block fallback). Without this gate, raw frontmatter — with
 * `Date` objects for unquoted dates, or with typo'd `status` values — leaks
 * straight into `buildValidationAdmonitionNode` and produces ugly toString
 * output / silently broken CSS classes.
 *
 * Findings are NOT surfaced from this code path; that's the extractor's
 * job (V0 in `validation/extractor.ts`). When parse fails here, the
 * renderer emits the unvalidated-fallback admonition — matching the V1
 * "missing block" UI so authors get a visible signal something is wrong.
 */
export function parseValidationFrontmatter(
  raw: unknown
): Validation | undefined {
  if (raw === undefined || raw === null) return undefined;
  const parsed = ValidationSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Validation tracker — per-contract admonition renderer (ADR 0056).
 *
 * Two layers, mirroring the pedagogy-index-extractor split:
 *
 *   - `renderValidationAdmonition(input)` is the **pure function**
 *     that takes a parsed `validation:` block plus a derived
 *     `lastRevisedDate` and returns the markdown admonition string.
 *     Auto-flips `validated` → `re-validation-needed` when the doc
 *     has been revised after the last validation date (Decision 5).
 *     Returns `""` when `SOPHIE_DOCS_INCLUDE_VALIDATION=0` so the
 *     rendered surface respects the private-build gate (Decision 7).
 *
 *   - `extractLastRevisedDate(source)` is the **regex pass** over a
 *     contract's raw markdown looking for the most recent
 *     `**§N — YYYY-MM-DD —` Revisions header (the ADR-process
 *     canonical Revisions section shape).
 *
 * The MyST plugin entry point lives at
 * `docs/website/scripts/validation-admonition-plugin.mjs` (mystmd
 * loads JS plugins from a local file path). The mjs entry point
 * imports this module's compiled output and wires the result into
 * MyST's AST transform phase, only for files under
 * `decisions/` + `reference/`.
 */

interface RenderInput {
  validation: Validation | undefined;
  lastRevisedDate: string | null;
}

const RENDERED_STATUS_KEYS = [
  "unvalidated",
  "in-progress",
  "validated",
  "re-validation-needed",
] as const;

type RenderedStatus = (typeof RENDERED_STATUS_KEYS)[number];

/** Render the validation admonition as a MyST `:::{admonition}` block. */
export function renderValidationAdmonition({
  validation,
  lastRevisedDate,
}: RenderInput): string {
  if (process.env.SOPHIE_DOCS_INCLUDE_VALIDATION === "0") return "";

  if (validation === undefined) {
    return [
      ":::{admonition} Validation",
      ":class: validation-unvalidated",
      "- **Status:** unvalidated",
      "- **Last validated:** —",
      "- **Evidence:** —",
      ":::",
      "",
    ].join("\n");
  }

  const renderedStatus = computeRenderedStatus(validation, lastRevisedDate);
  const className = `validation-${renderedStatus}`;
  const lastValidatedLine = validation.last_validated_date
    ? `- **Last validated:** ${validation.last_validated_date}`
    : "- **Last validated:** —";
  const evidenceLine = formatEvidenceLine(validation.evidence);
  const staleLine =
    renderedStatus === "re-validation-needed" &&
    validation.status === "validated" &&
    lastRevisedDate !== null
      ? `- **Revised after validation:** ${lastRevisedDate}`
      : "";
  const notesLine = validation.notes ? `- **Notes:** ${validation.notes}` : "";

  return [
    ":::{admonition} Validation",
    `:class: ${className}`,
    `- **Status:** ${renderedStatus}`,
    lastValidatedLine,
    evidenceLine,
    staleLine,
    notesLine,
    ":::",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Extract the most recent Revisions-section date from a contract's
 * markdown source. Two shapes occur in the wild:
 *
 *   - `**§N — YYYY-MM-DD — <label>**` — adr-process canonical shape
 *     (see docs/website/contributing/adr-process.md).
 *   - `## Revisions (YYYY-MM-DD — <label>)` — the shape actually used
 *     by ADRs 0038/0041 today, with the date inline in the H2.
 *
 * Both patterns are matched; the most recent ISO date across all
 * matches wins. Returns `null` when no Revisions signal is present.
 *
 * Re-exported here for backward-compat with consumers that import
 * `extractLastRevisedDate` from this module; the canonical home is
 * `../last-revised-date.ts` so the extractor doesn't have to pull
 * in this whole admonition-plugin module.
 */
export { extractLastRevisedDate } from "../last-revised-date.ts";

function computeRenderedStatus(
  validation: Validation,
  lastRevisedDate: string | null
): RenderedStatus {
  if (validation.status !== "validated") return validation.status;
  if (lastRevisedDate === null || validation.last_validated_date === null) {
    return "validated";
  }
  if (lastRevisedDate > validation.last_validated_date) {
    return "re-validation-needed";
  }
  return "validated";
}

function formatEvidenceLine(evidence: readonly ValidationEvidence[]): string {
  if (evidence.length === 0) return "- **Evidence:** —";
  return `- **Evidence:** ${formatEvidenceItems(evidence)}`;
}

function formatEvidenceItems(evidence: readonly ValidationEvidence[]): string {
  return evidence.map(formatEvidenceItem).join(" · ");
}

function formatEvidenceItem(ev: ValidationEvidence): string {
  if (ev.ref === null && ev.date === null) {
    return `⏸ ${ev.kind} (deferred)`;
  }
  if (ev.date === null) return `? ${ev.kind}`;
  return `✓ ${ev.kind} (${ev.date})`;
}

/**
 * Build a mdast `admonition` node for the validation block. Used by
 * the MyST plugin entry point (validation-admonition-plugin.mjs) to
 * inject the admonition into the AST after the H1 (and after the
 * ADR-metadata admonition for ADRs).
 *
 * Loose return type (`MystAdmonitionNode`) avoids pulling in the full
 * mdast-util-from-markdown type surface; the structure matches MyST's
 * admonition node shape (kind/class/children).
 */
export interface MystAdmonitionNode {
  type: "admonition";
  kind: "note";
  class: string;
  children: Array<{
    type: "admonitionTitle" | "paragraph" | "list";
    ordered?: boolean;
    children: unknown[];
  }>;
}

interface ValidationRow {
  label: string;
  value: string;
}

/**
 * Build the admonition mdast node for an ADR/reference doc. Returns
 * `null` when the env-var gate is off (matches renderValidationAdmonition).
 */
export function buildValidationAdmonitionNode({
  validation,
  lastRevisedDate,
}: RenderInput): MystAdmonitionNode | null {
  if (process.env.SOPHIE_DOCS_INCLUDE_VALIDATION === "0") return null;

  const rows: ValidationRow[] = [];
  let className: string;

  if (validation === undefined) {
    className = "validation-unvalidated";
    rows.push({ label: "Status", value: "unvalidated" });
    rows.push({ label: "Last validated", value: "—" });
    rows.push({ label: "Evidence", value: "—" });
  } else {
    const renderedStatus = computeRenderedStatus(validation, lastRevisedDate);
    className = `validation-${renderedStatus}`;
    rows.push({ label: "Status", value: renderedStatus });
    rows.push({
      label: "Last validated",
      value: validation.last_validated_date ?? "—",
    });
    rows.push({
      label: "Evidence",
      value:
        validation.evidence.length === 0
          ? "—"
          : formatEvidenceItems(validation.evidence),
    });
    if (
      renderedStatus === "re-validation-needed" &&
      validation.status === "validated" &&
      lastRevisedDate !== null
    ) {
      rows.push({ label: "Revised after validation", value: lastRevisedDate });
    }
    if (validation.notes) {
      rows.push({ label: "Notes", value: validation.notes });
    }
  }

  return {
    type: "admonition",
    kind: "note",
    class: className,
    children: [
      {
        type: "admonitionTitle",
        children: [{ type: "text", value: "Validation" }],
      },
      {
        type: "list",
        ordered: false,
        children: rows.map((row) => ({
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "strong",
                  children: [{ type: "text", value: `${row.label}: ` }],
                },
                { type: "text", value: row.value },
              ],
            },
          ],
        })),
      },
    ],
  };
}

/**
 * Filename predicate: should the validation admonition be injected
 * into this file? Restricted to `decisions/` and `reference/` paths
 * (the doc surfaces that carry contract semantics).
 */
export function isContractFile(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/");
  return (
    /\/decisions\/[^/]+\.md$/.test(normalized) ||
    /\/reference\/[^/]+\.md$/.test(normalized)
  );
}
