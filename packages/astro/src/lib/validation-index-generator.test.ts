import type { PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { generateValidationIndex } from "./validation-index-generator.ts";

/**
 * Tests for the validation-status index page generator (ADR 0056 PR 5).
 *
 * `generateValidationIndex(index)` is a pure function: same input →
 * same Markdown body. It consumes `index.contractValidations` (one
 * entry per ADR / reference doc) and `index.extractorFindings` (V0/V8
 * findings PR 3 surfaced) and emits the body for
 * `docs/website/status/validation.md`.
 *
 * Test fixtures construct minimal `PedagogyIndex` snapshots; the empty
 * collections satisfy the `PedagogyIndex` shape without needing
 * full chapter data. The generator itself only reads
 * `contractValidations` + `extractorFindings`, so this is sufficient.
 */

function makeIndex(partial: Partial<PedagogyIndex> = {}): PedagogyIndex {
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
    notationRegistry: null,
    ...partial,
  };
}

describe("generateValidationIndex", () => {
  test("emits a generated-source banner identifying SOPHIE_DOCS_INCLUDE_VALIDATION", () => {
    const md = generateValidationIndex(makeIndex());
    expect(md).toContain("<!-- GENERATED FILE");
    expect(md).toContain("SOPHIE_DOCS_INCLUDE_VALIDATION");
  });

  test("emits the page title + private-tag frontmatter", () => {
    const md = generateValidationIndex(makeIndex());
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toMatch(/title:\s*['"]?Validation status['"]?/);
    expect(md).toMatch(/tags:\s*\[private\]/);
  });

  test("summary table counts each status correctly", () => {
    const md = generateValidationIndex(
      makeIndex({
        contractValidations: [
          {
            path: "docs/website/decisions/0001.md",
            validation: {
              status: "validated",
              last_validated_date: "2026-05-15",
              evidence: [],
            },
            lastRevisedDate: null,
          },
          {
            path: "docs/website/decisions/0002.md",
            validation: {
              status: "validated",
              last_validated_date: "2026-05-15",
              evidence: [],
            },
            lastRevisedDate: null,
          },
          {
            path: "docs/website/decisions/0003.md",
            validation: {
              status: "in-progress",
              last_validated_date: null,
              evidence: [],
            },
            lastRevisedDate: null,
          },
          {
            path: "docs/website/decisions/0004.md",
            validation: {
              status: "unvalidated",
              last_validated_date: null,
              evidence: [],
            },
            lastRevisedDate: null,
          },
          {
            path: "docs/website/decisions/0005.md",
            validation: {
              status: "re-validation-needed",
              last_validated_date: "2025-01-01",
              evidence: [],
            },
            lastRevisedDate: null,
          },
          {
            path: "docs/website/decisions/0006.md",
            validation: undefined,
            lastRevisedDate: null,
          },
        ],
      })
    );
    expect(md).toMatch(/\|\s*Validated\s*\|\s*2\s*\|/);
    expect(md).toMatch(/\|\s*In progress\s*\|\s*1\s*\|/);
    expect(md).toMatch(/\|\s*Unvalidated\s*\|\s*1\s*\|/);
    expect(md).toMatch(/\|\s*Re-validation needed\s*\|\s*1\s*\|/);
    expect(md).toMatch(/\|\s*Missing block\s*\|\s*1\s*\|/);
    expect(md).toMatch(/\|\s*Total\s*\|\s*6\s*\|/);
  });

  test("cross-tabulates evidence kinds across all entries", () => {
    const md = generateValidationIndex(
      makeIndex({
        contractValidations: [
          {
            path: "docs/website/decisions/0001.md",
            validation: {
              status: "validated",
              last_validated_date: "2026-05-15",
              evidence: [
                { kind: "test", ref: "packages/x.test.ts", date: null },
                { kind: "chapter", ref: "ch/foo", date: null },
              ],
            },
            lastRevisedDate: null,
          },
          {
            path: "docs/website/decisions/0002.md",
            validation: {
              status: "validated",
              last_validated_date: "2026-05-15",
              evidence: [
                { kind: "test", ref: "packages/y.test.ts", date: null },
              ],
            },
            lastRevisedDate: null,
          },
        ],
      })
    );
    // Evidence-kinds section heading
    expect(md).toMatch(/##\s+Evidence kinds/);
    // test appears twice; chapter once
    expect(md).toMatch(/\|\s*test\s*\|\s*2\s*\|/);
    expect(md).toMatch(/\|\s*chapter\s*\|\s*1\s*\|/);
    // review/deployment/audit/manual rows still appear with 0
    expect(md).toMatch(/\|\s*review\s*\|\s*0\s*\|/);
    expect(md).toMatch(/\|\s*deployment\s*\|\s*0\s*\|/);
    expect(md).toMatch(/\|\s*audit\s*\|\s*0\s*\|/);
    expect(md).toMatch(/\|\s*manual\s*\|\s*0\s*\|/);
  });

  test("renders extractor-findings summary with V0 + V8 counts", () => {
    const md = generateValidationIndex(
      makeIndex({
        extractorFindings: [
          {
            severity: "ERROR",
            code: "V0",
            message: "ValidationSchema rejected the block",
            location: { chapter: "docs/website/decisions/0007.md" },
          },
          {
            severity: "INFO",
            code: "V8",
            message: "Unknown key 'last_validation_date'",
            location: { chapter: "docs/website/decisions/0008.md" },
          },
          {
            severity: "INFO",
            code: "V8",
            message: "Unknown key 'evidence_summary'",
            location: { chapter: "docs/website/decisions/0009.md" },
          },
        ],
      })
    );
    expect(md).toMatch(/##\s+Extractor findings/);
    expect(md).toMatch(/V0[^|\n]*\|\s*1\s*\|/);
    expect(md).toMatch(/V8[^|\n]*\|\s*2\s*\|/);
    // Per-finding listing references the file path
    expect(md).toContain("docs/website/decisions/0007.md");
    expect(md).toContain("docs/website/decisions/0008.md");
    expect(md).toContain("docs/website/decisions/0009.md");
  });

  test("notes when no extractor findings are present", () => {
    const md = generateValidationIndex(makeIndex());
    expect(md).toMatch(/##\s+Extractor findings/);
    // Some kind of "no findings" / zero-state copy
    expect(md.toLowerCase()).toMatch(/no .*findings|0 findings|none/);
  });

  test("lists every contract with link + status + last_validated_date", () => {
    const md = generateValidationIndex(
      makeIndex({
        contractValidations: [
          {
            path: "docs/website/decisions/0001-platform-not-monorepo.md",
            validation: {
              status: "validated",
              last_validated_date: "2026-05-15",
              evidence: [
                {
                  kind: "test",
                  ref: "packages/core/index.test.ts",
                  date: null,
                },
              ],
              notes: "Verified by Phase 0 closeout.",
            },
            lastRevisedDate: null,
          },
          {
            path: "docs/website/reference/cli.md",
            validation: undefined,
            lastRevisedDate: null,
          },
        ],
      })
    );
    // The per-contract section heading exists
    expect(md).toMatch(/##\s+Contracts/);
    // Each path appears (linked or plain)
    expect(md).toContain("0001-platform-not-monorepo.md");
    expect(md).toContain("reference/cli.md");
    // Status is rendered for the validated entry; date shown
    expect(md).toContain("validated");
    expect(md).toContain("2026-05-15");
    // Missing-block entry has a recognizable placeholder
    expect(md).toMatch(/missing|—|no validation block/i);
    // Contract links must match MyST's actual URL convention:
    // strip the directory + the leading NNNN- prefix from the filename.
    // Prior version emitted /decisions/0001-platform-not-monorepo/ which
    // 404'd against the rendered HTML — see contractHref() for the fix.
    expect(md).toContain("](/platform-not-monorepo/)");
    expect(md).toContain("](/cli/)");
    expect(md).not.toContain("](/docs/website/");
    expect(md).not.toContain("](/decisions/");
    expect(md).not.toContain("](/reference/");
  });

  test("groups ADRs and reference docs separately", () => {
    const md = generateValidationIndex(
      makeIndex({
        contractValidations: [
          {
            path: "docs/website/decisions/0001.md",
            validation: undefined,
            lastRevisedDate: null,
          },
          {
            path: "docs/website/reference/cli.md",
            validation: undefined,
            lastRevisedDate: null,
          },
        ],
      })
    );
    expect(md).toMatch(/###\s+ADRs/);
    expect(md).toMatch(/###\s+Reference docs/);
    // The ADR heading must appear BEFORE the reference-docs heading
    const adrIdx = md.search(/###\s+ADRs/);
    const refIdx = md.search(/###\s+Reference docs/);
    expect(adrIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeGreaterThan(adrIdx);
  });

  test("is deterministic — same input yields same output", () => {
    const index = makeIndex({
      contractValidations: [
        {
          path: "docs/website/decisions/0001.md",
          validation: {
            status: "validated",
            last_validated_date: "2026-05-15",
            evidence: [],
          },
          lastRevisedDate: null,
        },
      ],
    });
    expect(generateValidationIndex(index)).toBe(generateValidationIndex(index));
  });

  test("escapes Markdown special chars in notes-cell (I1 from comprehensive review)", () => {
    const md = generateValidationIndex(
      makeIndex({
        contractValidations: [
          {
            path: "docs/website/decisions/0099-fake.md",
            validation: {
              status: "validated",
              last_validated_date: "2026-05-14",
              evidence: [],
              notes:
                "Has **bold**, _emphasis_, `code`, [link](url), and a literal | pipe.",
            },
            lastRevisedDate: null,
          },
        ],
      })
    );
    // Each special char gets a leading backslash so MyST renders them
    // as literal cell text, not active Markdown.
    expect(md).toContain("\\*\\*bold\\*\\*");
    expect(md).toContain("\\_emphasis\\_");
    expect(md).toContain("\\`code\\`");
    expect(md).toContain("\\[link");
    expect(md).toContain("\\| pipe");
    // Parens / chars NOT in the escape list pass through.
    expect(md).toContain("(url)");
  });

  test("collapses newlines in notes to single spaces", () => {
    const md = generateValidationIndex(
      makeIndex({
        contractValidations: [
          {
            path: "docs/website/decisions/0099-fake.md",
            validation: {
              status: "validated",
              last_validated_date: "2026-05-14",
              evidence: [],
              notes: "First line.\nSecond line.\nThird line.",
            },
            lastRevisedDate: null,
          },
        ],
      })
    );
    expect(md).toContain("First line. Second line. Third line.");
    expect(md).not.toContain("First line.\nSecond");
  });
});
