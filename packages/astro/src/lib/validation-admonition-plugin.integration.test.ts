/**
 * Integration test: confirm the validation admonition appears in the
 * MyST-rendered docs site output (ADR 0056 per-contract surface).
 *
 * Runs against `docs/website/_build/site/content/*.json` — the JSON
 * artifact mystmd produces during `mystmd build`. The test is a
 * conditional smoke check: if the build artifact is absent (clean
 * checkout, CI without docs build run), the test is skipped with a
 * descriptive note rather than failing.
 *
 * Browser-level e2e (Playwright with axe-core against rendered HTML)
 * is a follow-up — the existing playwright.config.ts drives the
 * `examples/smoke` Astro target, not the MyST docs site. Wiring a
 * second webServer for `mystmd start` is the right shape for that
 * follow-up PR.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../../../..");
const ARTIFACT = resolve(
  REPO_ROOT,
  "docs/website/_build/site/content/persistence-indexeddb.json"
);

describe("validation admonition in mystmd build output", () => {
  it.runIf(existsSync(ARTIFACT))(
    "emits a validation admonition with a status-keyed class on ADR 0007",
    () => {
      const source = readFileSync(ARTIFACT, "utf8");
      const json = JSON.parse(source) as { mdast?: { children: unknown[] } };
      const admonition = findValidationAdmonition(json.mdast?.children ?? []);
      expect(admonition).not.toBeNull();
      expect(admonition?.class).toMatch(
        /^validation-(unvalidated|in-progress|validated|re-validation-needed)$/
      );
    }
  );
});

interface AdmonitionLike {
  type: string;
  class?: string;
  children?: unknown[];
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
