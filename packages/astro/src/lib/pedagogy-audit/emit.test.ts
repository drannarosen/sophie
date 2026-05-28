import type { AuditFinding } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { PEDAGOGY_AUDIT_ARTIFACT_VERSION, toAuditArtifact } from "./emit.ts";
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
    });
  });

  test("empty report → zero counts, empty arrays (the no-corpus / clean case)", () => {
    const artifact = toAuditArtifact({ errors: [], warnings: [], info: [] });
    expect(artifact.summary).toEqual({ errors: 0, warnings: 0, infos: 0 });
    expect(artifact.errors).toEqual([]);
    expect(artifact.infos).toEqual([]);
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
    ]);
  });
});
