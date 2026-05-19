/**
 * Extract the most recent Revisions-section date from an ADR / reference
 * doc's raw markdown source.
 *
 * Two patterns are recognized (matching the conventions in
 * `docs/website/contributing/adr-process.md` and the shapes actually used
 * by ADRs 0038 / 0041):
 *
 *   - `**§N — YYYY-MM-DD — <label>**` — adr-process canonical shape.
 *   - `## Revisions (YYYY-MM-DD — <label>)` — H2-inline shape (the section
 *     heading itself carries the most recent date).
 *
 * Both patterns are matched; the most recent ISO date across all
 * matches wins. Returns `null` when no Revisions section is present.
 *
 * Section-scoped (comprehensive-review I4 fix): the canonical `**§N —
 * date —**` shape ONLY counts inside the document's `## Revisions`
 * section (between the heading and the next `^## ` or EOF). Without
 * this scope, a code-fenced example or a paragraph reference to a
 * historical revision would be misread as a current Revisions entry
 * and incorrectly trigger the admonition's "re-validation-needed"
 * auto-flip. The H2-inline shape is intrinsically tied to the
 * `## Revisions` heading line itself, so it's safe to match at any
 * heading-line offset in the document.
 *
 * Lives in its own module so the validation admonition plugin
 * (`validation/admonition-plugin.ts`) and the contract validations
 * extractor (`validation/extractor.ts`) can both depend on it without
 * either depending on the other. Prevents the cross-module coupling
 * flagged in PR #51 review M2.
 */
export function extractLastRevisedDate(source: string): string | null {
  const dates: string[] = [];

  // Shape 2 (H2-inline) — matches anywhere; the heading itself is the
  // anchor. `## Revisions (YYYY-MM-DD …)` or any heading depth.
  for (const match of source.matchAll(
    /^#{1,6}\s+Revisions[^\n]*\((\d{4}-\d{2}-\d{2})/gm
  )) {
    if (match[1] !== undefined) dates.push(match[1]);
  }

  // Shape 1 (canonical `**§N — date —**`) — section-scoped. Find the
  // `## Revisions` heading; match only within that section's body.
  const revisionsSection = extractRevisionsSection(source);
  if (revisionsSection !== null) {
    for (const match of revisionsSection.matchAll(
      /\*\*§\d+\s*[—-]\s*(\d{4}-\d{2}-\d{2})\s*[—-]/g
    )) {
      if (match[1] !== undefined) dates.push(match[1]);
    }
  }

  if (dates.length === 0) return null;
  dates.sort();
  return dates[dates.length - 1] ?? null;
}

/**
 * Return the body of the document's `## Revisions` section — the text
 * between the heading and the next `^## ` (or EOF). Returns `null` if
 * no Revisions heading is present. Used to scope the canonical `**§N —
 * date —**` regex so quoted historical revisions in unrelated body
 * paragraphs don't trip the staleness detector.
 */
function extractRevisionsSection(source: string): string | null {
  // Locate the Revisions heading (## or deeper). Matches "## Revisions"
  // and variants like "## Revisions (2026-05-15 — …)".
  const headingRe = /^(##+)\s+Revisions\b[^\n]*$/m;
  const headingMatch = headingRe.exec(source);
  if (headingMatch === null || headingMatch.index === undefined) return null;
  const headingDepth = headingMatch[1]?.length ?? 2;
  const bodyStart = headingMatch.index + headingMatch[0].length;
  // Look for the next sibling-or-shallower heading after the Revisions
  // section. A `### Sub` heading INSIDE Revisions doesn't close it.
  const closeRe = new RegExp(String.raw`^#{1,${headingDepth}}(?!#)\s+\S`, "gm");
  closeRe.lastIndex = bodyStart;
  const closeMatch = closeRe.exec(source);
  const bodyEnd = closeMatch?.index ?? source.length;
  return source.slice(bodyStart, bodyEnd);
}
