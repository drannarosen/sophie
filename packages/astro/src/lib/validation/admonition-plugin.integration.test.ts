/**
 * Unit-level coverage of the validation admonition's "every contract gets
 * a validation-* class" invariant (ADR 0056 I2 from PR #50 review,
 * converted to AST-build level in the follow-ups PR).
 *
 * Previous incarnation read `docs/website/_build/site/content/*.json` —
 * the MyST build artifact — which meant CI silently skipped the entire
 * suite (CI doesn't run `mystmd build` before vitest). This rewrite
 * walks the contract source files directly, parses each one's
 * frontmatter via gray-matter, builds the admonition AST node, and
 * asserts the per-contract `validation-*` class invariant — entirely
 * in-memory and dependency-free, so CI actually runs it.
 *
 * Browser-level e2e (Playwright with axe-core against rendered HTML)
 * is still a follow-up — the existing playwright.config.ts drives the
 * `examples/smoke` Astro target, not the MyST docs site.
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { extractLastRevisedDate } from "../last-revised-date.ts";
import {
  buildValidationAdmonitionNode,
  type MystAdmonitionNode,
} from "./admonition-plugin.ts";

const REPO_ROOT = resolve(__dirname, "../../../../..");
const DECISIONS_DIR = resolve(REPO_ROOT, "docs/website/decisions");
const REFERENCE_DIR = resolve(REPO_ROOT, "docs/website/reference");
const VALIDATION_CLASS_RE =
  /^validation-(unvalidated|in-progress|validated|re-validation-needed)$/;

function listContractSources(): Array<{ source: string; absPath: string }> {
  const entries: Array<{ source: string; absPath: string }> = [];
  for (const [dir, rel] of [
    [DECISIONS_DIR, "docs/website/decisions"],
    [REFERENCE_DIR, "docs/website/reference"],
  ] as const) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      if (name === "template.md") continue;
      entries.push({ source: `${rel}/${name}`, absPath: resolve(dir, name) });
    }
  }
  return entries;
}

function findValidationClass(node: MystAdmonitionNode | null): string | null {
  if (node === null) return null;
  if (typeof node.class === "string") return node.class;
  return null;
}

describe("validation admonition AST builder — every-contract invariant (I2)", () => {
  const contracts = listContractSources();

  // Sanity guard: PR 6 curated 79 contracts. If the contract count drops
  // suddenly, something is wrong (file got renamed/deleted/moved).
  it("locates a realistic set of contract source files", () => {
    expect(contracts.length).toBeGreaterThanOrEqual(70);
  });

  it.each(
    contracts
  )("$source → buildValidationAdmonitionNode emits a validation-* class", ({
    absPath,
  }) => {
    const source = readFileSync(absPath, "utf8");
    const { data } = matter(source);
    const validation = data.validation as unknown;
    const lastRevisedDate = extractLastRevisedDate(source);
    const node = buildValidationAdmonitionNode({
      // The builder accepts unknown shapes — non-block input becomes
      // the unvalidated default. Every contract goes through this
      // identical code path in the real MyST build.
      validation: validation as never,
      lastRevisedDate,
    });
    const className = findValidationClass(node);
    expect(className).not.toBeNull();
    expect(className).toMatch(VALIDATION_CLASS_RE);
  });

  it("honors SOPHIE_DOCS_INCLUDE_VALIDATION=0 across the contract set", () => {
    const prior = process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
    process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = "0";
    try {
      // Single representative — the flag is a binary global gate, so
      // exhaustively iterating all 79 contracts would just be 79× the
      // same null-return check.
      const sample = contracts[0];
      if (!sample) throw new Error("no contracts to sample");
      const source = readFileSync(sample.absPath, "utf8");
      const { data } = matter(source);
      const node = buildValidationAdmonitionNode({
        validation: data.validation as never,
        lastRevisedDate: extractLastRevisedDate(source),
      });
      expect(node).toBeNull();
    } finally {
      if (prior === undefined) {
        delete process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
      } else {
        process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = prior;
      }
    }
  });
});
