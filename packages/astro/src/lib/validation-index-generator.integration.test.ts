/**
 * Integration test (I3 from PR #52 review, landed in PR 6 Workstream E):
 * pin the committed `docs/website/status/validation.md` against the
 * Markdown body `extractContractValidations(repoRoot)` +
 * `generateValidationIndex(snapshot)` would emit *today*.
 *
 * The test fails CI with a clear hint when the committed dashboard
 * drifts from the source-of-truth frontmatter — closing the loop
 * between per-contract frontmatter edits and the build-generated
 * dashboard. Authors who touch any `validation:` block on an ADR or
 * reference doc must re-run `pnpm tsx scripts/regenerate-validation-index.mts`
 * before opening their PR; this test enforces that contract.
 *
 * The test runs against the real repo files (not fixtures), so:
 *   - It's relatively slow (reads + parses every ADR + reference doc).
 *   - Test isolation: it never mutates the index accumulator —
 *     a fresh `extractContractValidations` call returns a fresh
 *     `{ entries, findings }` pair the test wraps in a one-off
 *     `PedagogyIndex` shape without going through `indexAccumulator`.
 *
 * Skip condition: the suite is skipped when the dashboard file or the
 * decisions/reference directories don't exist (running tests outside
 * a repo checkout, etc.).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { extractContractValidations } from "./validation-extractor.ts";
import { generateValidationIndex } from "./validation-index-generator.ts";

const REPO_ROOT = resolve(__dirname, "../../../..");
const DASHBOARD = resolve(REPO_ROOT, "docs/website/status/validation.md");
const DECISIONS_DIR = resolve(REPO_ROOT, "docs/website/decisions");

const REGEN_HINT =
  "docs/website/status/validation.md is stale vs the current `validation:` frontmatter. " +
  "Run `pnpm tsx scripts/regenerate-validation-index.mts` from the repo root and " +
  "commit the regenerated file.";

function emptyIndexShape(): PedagogyIndex {
  return {
    chapters: [],
    modules: [],
    objectives: [],
    keyInsights: [],
    definitions: [],
    equations: [],
    figureRegistry: [],
    figureUsages: [],
    inlineRefUsages: [],
    misconceptions: [],
    contractValidations: [],
    extractorFindings: [],
  };
}

describe("validation-index-generator integration (I3)", () => {
  it.runIf(existsSync(DASHBOARD) && existsSync(DECISIONS_DIR))(
    "committed docs/website/status/validation.md matches generator output",
    async () => {
      const { entries, findings } = await extractContractValidations(REPO_ROOT);
      const index: PedagogyIndex = {
        ...emptyIndexShape(),
        contractValidations: entries,
        extractorFindings: findings,
      };
      const expected = generateValidationIndex(index);
      const actual = readFileSync(DASHBOARD, "utf8");
      // Normalize trailing whitespace differences between
      // writer-produced output and any reader's editor auto-trim.
      const norm = (s: string): string => s.replace(/\s+$/g, "").concat("\n");
      expect(norm(actual), REGEN_HINT).toBe(norm(expected));
    }
  );
});
