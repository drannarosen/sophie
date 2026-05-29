import type { AuditFinding } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { PEDAGOGY_AUDIT_ARTIFACT_VERSION, toAuditArtifact } from "./emit.ts";
import { resetMathSpeechCoverage } from "./math-speech-coverage.ts";
import type { AuditReport } from "./types.ts";

const err: AuditFinding = {
  severity: "ERROR",
  code: "D4",
  message: "term used but never defined",
  location: { unit: "chapter-02", anchor: "def-x" },
};
const warn: AuditFinding = {
  severity: "WARNING",
  code: "O2",
  message: "chapter has zero learning objectives",
  location: { unit: "chapter-02" },
};
const info: AuditFinding = {
  severity: "INFO",
  code: "K1",
  message: "chapter has zero key insights",
};

describe("toAuditArtifact", () => {
  beforeEach(() => {
    resetMathSpeechCoverage();
  });

  test("maps report → versioned envelope with summary counts + arrays", () => {
    const report: AuditReport = {
      errors: [err],
      warnings: [warn, warn],
      info: [info, info, info],
    };
    expect(toAuditArtifact(report)).toEqual({
      artifact_version: PEDAGOGY_AUDIT_ARTIFACT_VERSION,
      summary: { errors: 1, warnings: 2, infos: 3 },
      errors: [err],
      warnings: [warn, warn],
      infos: [info, info, info],
      mathA11y: { total: 0, labeled: 0, failures: [] },
    });
  });

  test("empty report → zero counts, empty arrays (the no-corpus / clean case)", () => {
    const artifact = toAuditArtifact({ errors: [], warnings: [], info: [] });
    expect(artifact.summary).toEqual({ errors: 0, warnings: 0, infos: 0 });
    expect(artifact.errors).toEqual([]);
    expect(artifact.infos).toEqual([]);
  });

  test("populates mathA11y from the supplied coverage snapshot", () => {
    const artifact = toAuditArtifact(
      { errors: [], warnings: [], info: [] },
      {
        total: 5,
        labeled: 4,
        failures: [{ kind: "registry", detail: "wiens-law" }],
      }
    );
    expect(artifact.mathA11y).toEqual({
      total: 5,
      labeled: 4,
      failures: [{ kind: "registry", detail: "wiens-law" }],
    });
  });

  test("mathA11y defaults to an empty snapshot when none supplied", () => {
    const artifact = toAuditArtifact({ errors: [], warnings: [], info: [] });
    expect(artifact.mathA11y).toEqual({ total: 0, labeled: 0, failures: [] });
  });

  test("is deterministic — no timestamp / non-content fields (reproducible artifact)", () => {
    const report: AuditReport = { errors: [], warnings: [], info: [] };
    // Same input → byte-identical serialization (no Date.now()-style fields).
    expect(JSON.stringify(toAuditArtifact(report))).toBe(
      JSON.stringify(toAuditArtifact(report))
    );
    expect(Object.keys(toAuditArtifact(report))).toEqual([
      "artifact_version",
      "summary",
      "errors",
      "warnings",
      "infos",
      "mathA11y",
    ]);
  });
});
