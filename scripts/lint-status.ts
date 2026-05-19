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

  // 2. Pages with validation block but no status.
  const gapPages = records
    .filter((r) => r.hasValidationBlock && r.status === undefined)
    .map((r) => r.path)
    .sort();
  console.log(
    `Pages with a validation: block but no status: field (${gapPages.length}):`
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

  // 3. Pages with unknown status value.
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

  console.log(
    "Informational only — does not fail CI. Promote to blocking once every page carries a status: field."
  );
}

main();
