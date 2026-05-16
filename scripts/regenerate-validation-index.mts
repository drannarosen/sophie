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
 */

import { resolve } from "node:path";
import { indexAccumulator } from "../packages/astro/src/lib/pedagogy-index-extractor.ts";
import { extractContractValidations } from "../packages/astro/src/lib/validation-extractor.ts";
import { writeValidationIndexMarkdown } from "../packages/astro/src/lib/validation-index-writer.ts";

const repoRoot = resolve(import.meta.dirname, "..");

const { entries, findings } = await extractContractValidations(repoRoot);
indexAccumulator.setContractValidations(entries, findings);
const snapshot = indexAccumulator.asPedagogyIndex();

await writeValidationIndexMarkdown(snapshot, repoRoot);

console.log(
  `Regenerated docs/website/status/validation.md from ${entries.length} contracts ` +
    `(${findings.length} extractor finding${findings.length === 1 ? "" : "s"}).`
);
