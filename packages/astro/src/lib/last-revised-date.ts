/**
 * Extract the most recent Revisions-section date from an ADR / reference
 * doc's raw markdown source.
 *
 * Two patterns are recognized (matching the conventions in
 * `docs/website/contributing/adr-process.md` and the shapes actually used
 * by ADRs 0038 / 0041):
 *
 *   - `**§N — YYYY-MM-DD — <label>**` — adr-process canonical shape.
 *   - `## Revisions (YYYY-MM-DD — <label>)` — H2-inline shape.
 *
 * Both patterns are matched; the most recent ISO date across all
 * matches wins. Returns `null` when no Revisions signal is present.
 *
 * Lives in its own module so the validation admonition plugin
 * (`validation-admonition-plugin.ts`) and the contract validations
 * extractor (`validation-extractor.ts`) can both depend on it without
 * either depending on the other. Prevents the cross-module coupling
 * flagged in PR #51 review M2.
 */
export function extractLastRevisedDate(source: string): string | null {
  const dates: string[] = [];
  // Shape 1: **§N — YYYY-MM-DD —**
  for (const match of source.matchAll(
    /\*\*§\d+\s*[—-]\s*(\d{4}-\d{2}-\d{2})\s*[—-]/g
  )) {
    if (match[1] !== undefined) dates.push(match[1]);
  }
  // Shape 2: ## Revisions (YYYY-MM-DD …)
  for (const match of source.matchAll(
    /^#{1,6}\s+Revisions[^\n]*\((\d{4}-\d{2}-\d{2})/gm
  )) {
    if (match[1] !== undefined) dates.push(match[1]);
  }
  if (dates.length === 0) return null;
  dates.sort();
  return dates[dates.length - 1] ?? null;
}
