#!/usr/bin/env -S npx tsx
/**
 * Doc-drift detection for legacy component-name references after a hard
 * rename. Defends the 2026-05-18 EqRef class-of-issue: PR-A's batch 5a
 * hard-renamed `<EqRef>` → `<EquationRef>` in the React component layer
 * but left ~50 stale references in source docstrings, ADR prose, runtime
 * comments, and reference docs. The audit caught 12; the full sweep that
 * followed (commit 5d85c91, PR #102) cleaned the remaining ~38.
 *
 * Pre-launch + ADR 0061 Rule 5 ("docs land atomically with code") makes
 * this a class of issue worth defending against at CI time — every
 * future hard rename should add a registry entry here and the gate
 * forecloses the drift class.
 *
 * Scope: pedagogy-audit invariants D4/E4/F2/C1 cover MDX chapter call-
 * sites against the runtime registries (definitionSlugs, equationSlugs,
 * figureRegistryNames, chapterSlugs). They do NOT cover source-code
 * docstrings, runtime comments, or ADR prose — which is where the
 * 2026-05-18 incident actually landed. Pure grep with narrative-context
 * exclusion is the right tool for the doc-side problem.
 *
 * Registry shape: `LEGACY_NAMES` below lists each retired component
 * name + the current shape it was renamed to + a one-line PR/ADR
 * pointer. Adding a new rename is a 4-field append.
 *
 * Narrative exclusion: occurrences on lines containing any of the
 * `NARRATIVE_MARKERS` (e.g., "renamed", "replaces", "formerly",
 * "rejected", "superseded", "→") are *intentional* historical or
 * narrative mentions, NOT drift. The exclusion is line-local — false-
 * negative cost is one extra registry entry; false-positive cost is
 * red-CI on every PR. Calibrated for the latter.
 *
 * Scope (paths):
 *
 *   packages/  — source code docstrings + comments
 *   examples/  — smoke + packed-smoke consumer demos
 *   docs/website/  — ADR prose + reference + explanation
 *
 * Exit codes:
 *
 *   0  clean — no stale legacy-name references found
 *   1  drift found — CI red; output lists offending file:line + the
 *      legacy name + the current shape to migrate to
 *   2  internal grep failure (unexpected)
 *
 * Run: `pnpm lint:docs-drift` or `npx tsx scripts/lint-docs-drift.ts`.
 *
 * ADRs cited: 0061 (Rule 5 docs-atomic-with-code), 0001 (pre-launch).
 */

import { execSync } from "node:child_process";

interface LegacyRename {
  /** Retired component name (without angle brackets). */
  legacy: string;
  /** Current shape it was renamed to. */
  current: string;
  /** Short rationale / PR pointer for the migration record. */
  source: string;
}

/**
 * Active legacy-rename registry. Every hard rename in `@sophie/components`
 * or `@sophie/astro` that retired a component name in favor of a new
 * one earns an entry here. The gate stays green so long as no source
 * file or doc page references the legacy name outside a narrative
 * context (see NARRATIVE_MARKERS below).
 */
const LEGACY_NAMES: readonly LegacyRename[] = [
  {
    legacy: "EqRef",
    current: "EquationRef",
    source: "PR #102 (5d85c91) — ADR 0061 Rule 5",
  },
  {
    legacy: "CollapsibleCard",
    current: "Dropdown",
    source: "PR #168 (fb4bd30) — chrome primitives PR 5",
  },
];

/**
 * Line-local words that mark an occurrence as intentional narrative,
 * not drift. Order doesn't matter; matching is case-insensitive via the
 * pattern below. Keep this list conservative — false-positive cost
 * (red-CI on a legitimate historical mention) outweighs false-negative
 * cost (one more registry entry needed).
 *
 * The "→" arrow glyph catches rename-direction prose like
 * "<EqRef> → <EquationRef>" without requiring a verb.
 */
const NARRATIVE_MARKERS = [
  "renamed",
  "rename",
  "replaces",
  "replaced",
  "former",
  "formerly",
  "rejected",
  "superseded",
  "deprecated",
  "retired",
  "→",
  "->",
  "from phase",
  "from batch",
  // Migration-history phrasings. `moved from` catches in-source comments
  // narrating a component migration (e.g., the deep-dive-callout spec
  // documenting the smoke chapter's `<CollapsibleCard>` → `<Callout>`
  // swap in PR-A). Kept narrow to the exact phrase to avoid masking
  // real drift in unrelated contexts.
  "moved from",
];

const PATHS = ["packages", "examples", "docs/website"] as const;

const INCLUDES = ["*.ts", "*.tsx", "*.mts", "*.md", "*.mdx"] as const;

interface DriftHit {
  legacy: string;
  current: string;
  source: string;
  file: string;
  line: number;
  excerpt: string;
}

/**
 * Run grep for one legacy name across the configured paths + includes.
 * Returns matched lines in `path:line:content` form, or an empty array
 * when grep exits 1 (no matches).
 */
function grepLegacy(name: string): string[] {
  // POSIX `[[:space:]]` (not `\s`) — `grep -E` on macOS + GitHub-hosted
  // ubuntu runners doesn't recognise PCRE shorthand classes by default.
  // Pattern matches `<EqRef ` (with attrs) or `<EqRef>` (bare) or
  // `<EqRef ` followed by anything — the trailing alternation covers
  // the three observed authoring shapes.
  const pattern = `<${name}[[:space:]>/]`;
  const includes = INCLUDES.map((g) => `--include="${g}"`).join(" ");
  let output = "";
  try {
    output = execSync(
      `grep -rnE "${pattern}" ${PATHS.join(" ")} ${includes} || true`,
      { encoding: "utf8" }
    );
  } catch (err) {
    console.error(`lint-docs-drift: grep failed for <${name}>`);
    console.error(err);
    process.exit(2);
  }
  return output.split("\n").filter((line) => line.length > 0);
}

/**
 * Test whether a matched line is an intentional narrative mention.
 * Case-insensitive substring scan against NARRATIVE_MARKERS.
 */
function isNarrative(excerpt: string): boolean {
  const lower = excerpt.toLowerCase();
  for (const marker of NARRATIVE_MARKERS) {
    if (lower.includes(marker)) return true;
  }
  return false;
}

function parseGrepLine(raw: string, entry: LegacyRename): DriftHit | null {
  // grep -n output: `path:lineno:content`
  const match = raw.match(/^([^:]+):(\d+):(.*)$/);
  if (!match) return null;
  const [, file, lineStr, excerpt] = match;
  if (!file || !lineStr || excerpt === undefined) return null;
  if (isNarrative(excerpt)) return null;
  return {
    legacy: entry.legacy,
    current: entry.current,
    source: entry.source,
    file,
    line: Number(lineStr),
    excerpt: excerpt.trim(),
  };
}

function main(): void {
  const hits: DriftHit[] = [];
  for (const entry of LEGACY_NAMES) {
    for (const raw of grepLegacy(entry.legacy)) {
      const hit = parseGrepLine(raw, entry);
      if (hit) hits.push(hit);
    }
  }

  if (hits.length === 0) {
    console.log(
      `✓ no stale legacy component-name references across ${PATHS.join(
        ", "
      )} (registry: ${LEGACY_NAMES.map((e) => `<${e.legacy}>`).join(", ")})`
    );
    process.exit(0);
  }

  console.error(
    `Doc-drift: ${hits.length} stale legacy component-name reference${
      hits.length === 1 ? "" : "s"
    } found — defends the 2026-05-18 EqRef class-of-issue per ADR 0061 Rule 5:`
  );
  console.error("");
  for (const hit of hits) {
    console.error(
      `  ${hit.file}:${hit.line}: <${hit.legacy}> → migrate to <${hit.current}>`
    );
    console.error(`    ${hit.excerpt}`);
    console.error(`    (registry source: ${hit.source})`);
    console.error("");
  }
  console.error(
    "Action: migrate each occurrence to the current component name. " +
      "If a line is genuinely narrative (e.g., history table, rename log), " +
      "add an appropriate marker word (renamed/replaces/formerly/→) on " +
      "the same line; the gate's NARRATIVE_MARKERS list excludes those."
  );
  process.exit(1);
}

main();
