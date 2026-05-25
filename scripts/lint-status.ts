#!/usr/bin/env -S npx tsx
/**
 * Page-status linter for `docs/website/**\/*.md{,x}` (ADR 0062).
 *
 * Walks the docs tree and reports:
 *
 *   1. **Status distribution** — count of pages per `PageStatus` value
 *      across all docs. Mirrors the dashboard's lifecycle summary as
 *      CI-log observability.
 *
 *   2. **Pages with a `validation:` block but no `status:` field** —
 *      rollout-gap surface. Eventually every page should carry a
 *      `status:`; this list narrows the gap.
 *
 *   3. **Pages with an unknown `status:` value** — defensive check.
 *      The extractor's S0 finding catches these on contract pages,
 *      but this script also surfaces them for non-contract pages
 *      (decisions / vision / explanation pages outside the contract
 *      directories) where the extractor doesn't run.
 *
 * Informational only — always exits 0. Wired into CI as a non-blocking
 * signal per the E3b precedent for `pnpm lint:links` (the script's
 * sibling). When the rollout reaches every page, this can be promoted
 * to a blocking check by switching the exit-code branch.
 *
 * Run: `pnpm lint:status`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";

const REPO_ROOT = new URL("..", import.meta.url).pathname;
const DOCS_ROOT = join(REPO_ROOT, "docs/website");

const PAGE_STATUS_VALUES: ReadonlySet<string> = new Set([
  "shipped",
  "accepted-design",
  "mixed",
  "future-package-split",
]);

interface PageRecord {
  path: string;
  status: string | undefined;
  hasValidationBlock: boolean;
}

function listMarkdown(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "_build" || name === ".astro") {
      continue;
    }
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      listMarkdown(full, out);
      continue;
    }
    if (!/\.(md|mdx)$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

function scanFile(absPath: string): PageRecord {
  const source = readFileSync(absPath, "utf8");
  const parsed = matter(source);
  const data = parsed.data as Record<string, unknown>;
  const status = typeof data.status === "string" ? data.status : undefined;
  const hasValidationBlock =
    typeof data.validation === "object" && data.validation !== null;
  return {
    path: relative(REPO_ROOT, absPath),
    status,
    hasValidationBlock,
  };
}

/**
 * Pages where `status:` is REQUIRED to be present (and a valid
 * PageStatusSchema value). After PR #126's ADR rollout + PR #120's
 * E3b reference-page coverage, both directories are 100% tagged;
 * this set turns that into a CI gate.
 *
 * Other directories (explanation/ vision/ strategy/ how-to/ etc.)
 * remain optional today; `status:` is welcome but not required.
 * When their rollout is decided, add them here.
 */
const REQUIRED_DIRS: ReadonlyArray<string> = [
  "docs/website/decisions/",
  "docs/website/reference/",
];

function isRequiredPath(repoRelPath: string): boolean {
  // `decisions/template.md` is excluded — it's a scaffold, not a
  // contract. The pedagogy-index extractor also skips it.
  if (repoRelPath.endsWith("docs/website/decisions/template.md")) {
    return false;
  }
  return REQUIRED_DIRS.some((dir) => repoRelPath.includes(dir));
}

function main(): void {
  const files = listMarkdown(DOCS_ROOT);
  const records = files.map(scanFile);

  console.log("Page-status linter (ADR 0062 / Codex P2)");
  console.log(`Scanned: ${records.length} pages under docs/website/`);
  console.log("");

  // 1. Status distribution.
  const distribution = new Map<string, number>();
  for (const r of records) {
    const key = r.status ?? "(no status)";
    distribution.set(key, (distribution.get(key) ?? 0) + 1);
  }
  const distRows = Array.from(distribution.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  console.log("Status distribution:");
  for (const [value, count] of distRows) {
    console.log(`  ${count.toString().padStart(4)}  ${value}`);
  }
  console.log("");

  // 2. Pages with validation block but no status (BLOCKING since
  // A+ hardening Phase C — see plan
  // `docs/plans/2026-05-25-sophie-a-plus-hardening.md`). A page that
  // declares a `validation:` block has opted into the dashboard
  // contract; rendering one without a paired `status:` produces a
  // silently-undefined lifecycle column. Phase A's dashboard regen
  // brought the docs tree to zero such pages; this gate keeps it
  // that way going forward.
  const gapPages = records
    .filter((r) => r.hasValidationBlock && r.status === undefined)
    .map((r) => r.path)
    .sort();
  console.log(
    `Pages with a validation: block but no status: field (${gapPages.length}, expected 0):`
  );
  if (gapPages.length === 0) {
    console.log("  (none — rollout complete for pages with validation blocks)");
  } else {
    for (const p of gapPages.slice(0, 20)) {
      console.log(`  ${p}`);
    }
    if (gapPages.length > 20) {
      console.log(`  …and ${gapPages.length - 20} more.`);
    }
  }
  console.log("");

  // 3. Pages with unknown status value (BLOCKING — typos must not
  // silently render in the dashboard).
  const unknownPages = records
    .filter((r) => r.status !== undefined && !PAGE_STATUS_VALUES.has(r.status))
    .map((r) => ({ path: r.path, value: r.status as string }))
    .sort((a, b) => a.path.localeCompare(b.path));
  console.log(
    `Pages with unknown status: value (${unknownPages.length}, expected 0):`
  );
  if (unknownPages.length === 0) {
    console.log("  (none — all status values are in PageStatusSchema)");
  } else {
    for (const p of unknownPages) {
      console.log(`  ${p.path}: status: ${JSON.stringify(p.value)}`);
    }
  }
  console.log("");

  // 4. Required-directory pages missing `status:` (BLOCKING —
  // ADR + reference pages must carry a lifecycle status per the
  // ADR 0062 + PR #126 rollout discipline).
  const missingRequired = records
    .filter((r) => isRequiredPath(r.path) && r.status === undefined)
    .map((r) => r.path)
    .sort();
  console.log(
    `Required-directory pages without status: (${missingRequired.length}, expected 0):`
  );
  if (missingRequired.length === 0) {
    console.log("  (none — every ADR + reference page carries status)");
  } else {
    for (const p of missingRequired.slice(0, 20)) {
      console.log(`  ${p}`);
    }
    if (missingRequired.length > 20) {
      console.log(`  …and ${missingRequired.length - 20} more.`);
    }
  }
  console.log("");

  // Exit non-zero on hard failures: unknown values, missing-required,
  // and validation-block-without-status. The last category was
  // promoted from informational to blocking in A+ hardening Phase C
  // (see `docs/plans/2026-05-25-sophie-a-plus-hardening.md`): a
  // `validation:` block opts the page into the dashboard contract, so
  // rendering one without a paired `status:` is a silent-dashboard
  // bug, not a soft rollout signal.
  const hardFailures =
    unknownPages.length + missingRequired.length + gapPages.length;
  if (hardFailures > 0) {
    console.log(
      `FAIL: ${hardFailures} blocking issue${hardFailures === 1 ? "" : "s"} ` +
        `(${unknownPages.length} unknown-value, ${missingRequired.length} missing-required, ${gapPages.length} validation-without-status).`
    );
    process.exit(1);
  }
  console.log(
    "PASS: every ADR + reference page carries a valid status; every page with a validation: block carries status:; no unknown values across the docs tree."
  );
}

main();
