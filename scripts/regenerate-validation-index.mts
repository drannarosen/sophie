#!/usr/bin/env -S pnpm tsx
/**
 * Regenerate `docs/website/status/validation.md` from the current
 * `validation:` frontmatter on every ADR + reference doc.
 *
 * Why this script exists: the smoke build's pagefind-postbuild pass
 * runs with `cwd=examples/smoke`, which has no `docs/website/`, so it
 * ENOENT-short-circuits without writing the dashboard. The production
 * Sophie docs build will fire the writer correctly once Sophie docs
 * ship their own consumer-app site (Phase 3 / ADR 0048). Until then,
 * this script is the canonical regeneration path — run it after
 * updating any `validation:` block, or before merging a PR that
 * touches frontmatter.
 *
 * Usage (from repo root):
 *   pnpm tsx scripts/regenerate-validation-index.mts
 *
 * Honors SOPHIE_DOCS_INCLUDE_VALIDATION=0 (returns early without
 * writing) for symmetry with the runtime build path.
 *
 * Builds the PedagogyIndex inline (I9 from comprehensive review) —
 * no longer goes through the global `indexAccumulator` singleton. The
 * regen script's snapshot is dependency-free: it constructs the
 * `PedagogyIndex` shape directly from the extractor's output and
 * empty placeholders for collections this script doesn't populate.
 * Removes a singleton-state coupling that wasn't load-bearing.
 */

import { resolve } from "node:path";
import type { PedagogyIndex } from "@sophie/core/schema";
import { extractContractValidations } from "../packages/astro/src/lib/validation-extractor.ts";
import { writeValidationIndexMarkdown } from "../packages/astro/src/lib/validation-index-writer.ts";

const repoRoot = resolve(import.meta.dirname, "..");

const { entries, findings } = await extractContractValidations(repoRoot);

// Build a one-shot PedagogyIndex with the contract data the dashboard
// generator needs; everything else stays empty since the dashboard
// doesn't surface non-contract collections.
const snapshot: PedagogyIndex = {
  definitions: [],
  equations: [],
  keyInsights: [],
  figureRegistry: [],
  figureUsages: [],
  misconceptions: [],
  chapters: [],
  modules: [],
  objectives: [],
  inlineRefUsages: [],
  contractValidations: entries,
  extractorFindings: findings,
};

await writeValidationIndexMarkdown(snapshot, repoRoot);

console.log(
  `Regenerated docs/website/status/validation.md from ${entries.length} contracts ` +
    `(${findings.length} extractor finding${findings.length === 1 ? "" : "s"}).`
);
