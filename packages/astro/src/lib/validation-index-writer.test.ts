import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PedagogyIndex } from "@sophie/core/schema";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { writeValidationIndexMarkdown } from "./validation-index-writer.ts";

/**
 * Tests for the side-effecting wrapper around `generateValidationIndex`.
 *
 * `writeValidationIndexMarkdown(snapshot, sophieRoot)`:
 *   - returns early when `SOPHIE_DOCS_INCLUDE_VALIDATION=0`
 *   - returns early when `docs/website/status/` is absent
 *     (consumer repos that don't ship the docs tree keep working)
 *   - otherwise writes `docs/website/status/validation.md` with the
 *     generator's output
 *
 * The pure-function generator is exhaustively covered by
 * `validation-index-generator.test.ts`; these tests only assert the
 * wrapper's I/O and env-flag semantics.
 */

function makeEmptyIndex(): PedagogyIndex {
  return {
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
    contractValidations: [],
    extractorFindings: [],
    multiReps: [],
    interventions: [],
  };
}

describe("writeValidationIndexMarkdown", () => {
  const savedEnv = process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;

  beforeEach(() => {
    delete process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
  });

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
    } else {
      process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = savedEnv;
    }
  });

  test("writes docs/website/status/validation.md when the directory exists", async () => {
    const root = mkdtempSync(join(tmpdir(), "sophie-valindex-"));
    mkdirSync(join(root, "docs", "website", "status"), { recursive: true });

    await writeValidationIndexMarkdown(makeEmptyIndex(), root);

    const outPath = join(root, "docs", "website", "status", "validation.md");
    expect(existsSync(outPath)).toBe(true);
    const body = readFileSync(outPath, "utf8");
    expect(body).toMatch(/title:\s*Validation status/);
    expect(body).toMatch(/##\s+Status summary/);
  });

  test("returns early without writing when SOPHIE_DOCS_INCLUDE_VALIDATION=0", async () => {
    const root = mkdtempSync(join(tmpdir(), "sophie-valindex-"));
    mkdirSync(join(root, "docs", "website", "status"), { recursive: true });
    process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = "0";

    await writeValidationIndexMarkdown(makeEmptyIndex(), root);

    expect(
      existsSync(join(root, "docs", "website", "status", "validation.md"))
    ).toBe(false);
  });

  test("does NOT overwrite an existing file when SOPHIE_DOCS_INCLUDE_VALIDATION=0", async () => {
    const root = mkdtempSync(join(tmpdir(), "sophie-valindex-"));
    const statusDir = join(root, "docs", "website", "status");
    mkdirSync(statusDir, { recursive: true });
    const sentinel = "PREEXISTING CONTENT\n";
    writeFileSync(join(statusDir, "validation.md"), sentinel, "utf8");
    process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = "0";

    await writeValidationIndexMarkdown(makeEmptyIndex(), root);

    expect(readFileSync(join(statusDir, "validation.md"), "utf8")).toBe(
      sentinel
    );
  });

  test("returns silently when docs/website/status/ is absent", async () => {
    const root = mkdtempSync(join(tmpdir(), "sophie-valindex-"));
    // No docs/website/status/ created — should not throw, should not create.

    await expect(
      writeValidationIndexMarkdown(makeEmptyIndex(), root)
    ).resolves.toBeUndefined();

    expect(
      existsSync(join(root, "docs", "website", "status", "validation.md"))
    ).toBe(false);
  });
});
