/**
 * Integration test: confirm the validation admonition appears in the
 * MyST-rendered docs site output (ADR 0056 per-contract surface).
 *
 * Runs against `docs/website/_build/site/content/*.json` — the JSON
 * artifact mystmd produces during `mystmd build`. The test is a
 * conditional smoke check: if the build artifact directory is absent
 * (clean checkout, CI without docs build run), the suite is skipped
 * with a descriptive note rather than failing.
 *
 * Browser-level e2e (Playwright with axe-core against rendered HTML)
 * is a follow-up — the existing playwright.config.ts drives the
 * `examples/smoke` Astro target, not the MyST docs site. Wiring a
 * second webServer for `mystmd start` is the right shape for that
 * follow-up PR.
 *
 * PR 6 I2 extension: in addition to the ADR-0007 single-contract spot
 * check, this suite walks every ADR + reference doc build artifact and
 * asserts each one carries a `validation-*` CSS-classed admonition. The
 * mapping from `docs/website/decisions/0007-persistence-indexeddb.md` →
 * `_build/site/content/persistence-indexeddb.json` is preserved by MyST
 * — it strips the leading number + path and slugifies the filename.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CONTENT_DIR = resolve(REPO_ROOT, "docs/website/_build/site/content");
const ADR_0007_ARTIFACT = resolve(CONTENT_DIR, "persistence-indexeddb.json");
const VALIDATION_CLASS_RE =
  /^validation-(unvalidated|in-progress|validated|re-validation-needed)$/;

interface AdmonitionLike {
  type: string;
  class?: string;
  children?: unknown[];
}

interface MystArtifact {
  mdast?: { children: unknown[] };
  frontmatter?: { title?: string; [k: string]: unknown };
}

function findValidationAdmonition(children: unknown[]): AdmonitionLike | null {
  for (const child of children) {
    if (typeof child !== "object" || child === null) continue;
    const node = child as AdmonitionLike;
    if (
      node.type === "admonition" &&
      typeof node.class === "string" &&
      node.class.startsWith("validation-")
    ) {
      return node;
    }
    if (Array.isArray(node.children)) {
      const found = findValidationAdmonition(node.children);
      if (found !== null) return found;
    }
  }
  return null;
}

/**
 * Map ADR / reference-doc source path → MyST build artifact basename.
 * MyST strips the leading NNNN- numeric prefix and the docs/website/
 * directory, leaving the slugified filename. E.g.:
 *   docs/website/decisions/0007-persistence-indexeddb.md
 *     → _build/site/content/persistence-indexeddb.json
 *   docs/website/reference/content-schema.md
 *     → _build/site/content/content-schema.json
 */
function adrArtifactBasename(sourcePath: string): string {
  const stem = basename(sourcePath, ".md");
  // Strip NNNN- prefix when present (decisions/) — reference docs don't have it.
  const stripped = stem.replace(/^\d{4}-/, "");
  return `${stripped}.json`;
}

function listContractArtifacts(): Array<{ source: string; artifact: string }> {
  const decisionsDir = resolve(REPO_ROOT, "docs/website/decisions");
  const referenceDir = resolve(REPO_ROOT, "docs/website/reference");
  const results: Array<{ source: string; artifact: string }> = [];
  for (const dir of [decisionsDir, referenceDir]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(".md")) continue;
      if (entry === "template.md") continue;
      const sourceRel = `${dir === decisionsDir ? "docs/website/decisions" : "docs/website/reference"}/${entry}`;
      const artifactPath = resolve(CONTENT_DIR, adrArtifactBasename(entry));
      results.push({ source: sourceRel, artifact: artifactPath });
    }
  }
  return results;
}

describe("validation admonition in mystmd build output", () => {
  it.runIf(existsSync(ADR_0007_ARTIFACT))(
    "emits a validation admonition with a status-keyed class on ADR 0007",
    () => {
      const source = readFileSync(ADR_0007_ARTIFACT, "utf8");
      const json = JSON.parse(source) as MystArtifact;
      const admonition = findValidationAdmonition(json.mdast?.children ?? []);
      expect(admonition).not.toBeNull();
      expect(admonition?.class).toMatch(VALIDATION_CLASS_RE);
    }
  );

  describe.runIf(existsSync(CONTENT_DIR))(
    "every ADR + reference doc artifact carries a validation-* CSS class (I2)",
    () => {
      const artifacts = listContractArtifacts().filter((entry) =>
        existsSync(entry.artifact)
      );

      // Sanity guard: the CONTENT_DIR exists but if NO contract artifacts
      // matched (e.g. partial build), we don't want a silently-passing
      // empty `it.each`. Require at least one match.
      it("locates at least one contract artifact in the build output", () => {
        expect(artifacts.length).toBeGreaterThan(0);
      });

      it.each(
        artifacts
      )("$source → $artifact carries a validation-* admonition", ({
        artifact,
      }) => {
        const source = readFileSync(artifact, "utf8");
        const json = JSON.parse(source) as MystArtifact;
        const admonition = findValidationAdmonition(json.mdast?.children ?? []);
        expect(admonition).not.toBeNull();
        expect(admonition?.class).toMatch(VALIDATION_CLASS_RE);
      });
    }
  );
});
