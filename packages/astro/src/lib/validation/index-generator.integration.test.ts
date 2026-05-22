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
 * Fail-loud preconditions (PR 6 review I7 → comprehensive-review I7 fix):
 * the test asserts the dashboard and contract directories exist before
 * doing anything else. Earlier versions wrapped the assertion in
 * `it.runIf(existsSync(...))` which **silently skipped** the entire I3
 * test in CI if either path was missing — defeating the test's purpose
 * (CI is exactly where we need this gate to fire). If either precondition
 * fails, the test fails with a specific message naming the missing path
 * rather than producing a confusing zero-test pass.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { buildPedagogyIndex } from "../pedagogy-audit/test-helpers.ts";
import { extractContractValidations } from "./extractor.ts";
import { generateValidationIndex } from "./index-generator.ts";

const REPO_ROOT = resolve(__dirname, "../../../../..");
const DASHBOARD = resolve(REPO_ROOT, "docs/website/status/validation.md");
const DECISIONS_DIR = resolve(REPO_ROOT, "docs/website/decisions");

const REGEN_HINT =
  "docs/website/status/validation.md is stale vs the current `validation:` frontmatter. " +
  "Run `pnpm tsx scripts/regenerate-validation-index.mts` from the repo root and " +
  "commit the regenerated file.";

function emptyIndexShape(): PedagogyIndex {
  return buildPedagogyIndex();
}

describe("validation/index-generator integration (I3)", () => {
  it("fails loudly when the dashboard or decisions directory is missing", () => {
    // Fail-loud guard: if the test fixture is wrong (sparse checkout,
    // moved file, etc.), surface a specific error rather than letting
    // the actual pin assertion below get silently skipped.
    expect(
      existsSync(DASHBOARD),
      `Expected ${DASHBOARD} to exist; if you moved or deleted the dashboard, update DASHBOARD in this test.`
    ).toBe(true);
    expect(
      existsSync(DECISIONS_DIR),
      `Expected ${DECISIONS_DIR} to exist; if the decisions directory moved, update DECISIONS_DIR in this test.`
    ).toBe(true);
  });

  it("committed docs/website/status/validation.md matches generator output", async () => {
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
  });
});

/**
 * I5 — Dashboard hrefs must resolve to actual MyST build artifacts.
 *
 * The dashboard's per-contract table emits links like
 * `/platform-not-monorepo/`. MyST's URL convention strips the directory
 * prefix + leading `NNNN-` from the filename, so the rendered HTML lives
 * at `<build-root>/<slug>/index.html`. If `contractHref()` ever diverges
 * from MyST's actual routing (the original PR #52 C1 fix mistakenly
 * emitted `/decisions/0001-…/` and every link 404'd), this test catches
 * it before a reader hits a broken link.
 *
 * CI wiring landed in the squash-guard + I5 PR: the `unit` job in
 * `.github/workflows/ci.yml` now runs `pnpm exec turbo run build
 * --filter=@sophie/docs` before vitest, so `docs/website/_build/html/`
 * is always populated in CI. The soft-skip that previously hid this
 * test in CI is gone — per I7 fail-loud, the missing build is now an
 * ERROR, not a silent pass.
 *
 * Local development: run `pnpm exec turbo run build --filter=@sophie/docs`
 * once (turbo caches subsequent runs to ~0s). Then I5 resolves hrefs
 * against the rendered artifacts.
 */
const HTML_BUILD = resolve(REPO_ROOT, "docs/website/_build/html");

describe("validation/index-generator integration (I5 — href resolution)", () => {
  it("sampled dashboard hrefs resolve to rendered HTML artifacts", async () => {
    // Fail-loud guard (I7): the MyST HTML build is a hard precondition.
    // CI builds it in the `unit` job before vitest; local devs run
    // `pnpm exec turbo run build --filter=@sophie/docs` once. Missing
    // build = ERROR, not silent skip — matches the I3 fail-loud pattern
    // above and matches every other fail-loud guard in the file.
    expect(
      existsSync(HTML_BUILD),
      `Expected ${HTML_BUILD} to exist. Run \`pnpm exec turbo run build --filter=@sophie/docs\` first ` +
        "(CI does this in the `unit` job before vitest)."
    ).toBe(true);

    const { entries, findings } = await extractContractValidations(REPO_ROOT);
    const index: PedagogyIndex = {
      ...emptyIndexShape(),
      contractValidations: entries,
      extractorFindings: findings,
    };
    const markdown = generateValidationIndex(index);

    // Extract all dashboard hrefs from the generator output.
    // Pattern: `](/some-slug/)`. Filter to contract links (skip
    // anchor links + relative refs the dashboard might add later).
    const hrefs = new Set<string>();
    const hrefRe = /\]\((\/[^\s)]+\/)\)/g;
    for (const match of markdown.matchAll(hrefRe)) {
      if (match[1] !== undefined) hrefs.add(match[1]);
    }
    expect(hrefs.size).toBeGreaterThanOrEqual(10);

    // Resolve each href against the MyST HTML build.
    const unresolved: string[] = [];
    for (const href of hrefs) {
      // href is `/<slug>/`; rendered HTML lives at HTML_BUILD/<slug>/index.html.
      const slug = href.replace(/^\//, "").replace(/\/$/, "");
      const renderedPath = resolve(HTML_BUILD, slug, "index.html");
      if (!existsSync(renderedPath)) {
        unresolved.push(`${href} → ${renderedPath}`);
      }
    }
    expect(
      unresolved,
      `Dashboard hrefs that don't resolve to a MyST-rendered HTML artifact:\n` +
        unresolved.join("\n")
    ).toEqual([]);
  });
});
