import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AuditFinding } from "@sophie/core/schema";
import type { AuditReport } from "./types.ts";

/**
 * `dist/.sophie/pedagogy-audit.json` — the machine-readable build artifact
 * for the corpus-wide pedagogy audit (ADR 0088). Sibling of
 * `dist/.sophie/pedagogy-index.json` (ADR 0045 Artifact 2); emitted from the
 * integration's `astro:build:done` hook in production.
 *
 * Deterministic by design: NO `generatedAt` timestamp, so the artifact is
 * byte-identical for a given corpus (reproducible builds, diff-clean). "When"
 * is the build system's concern (CI time / file mtime), not the artifact's.
 */
export const PEDAGOGY_AUDIT_ARTIFACT_VERSION = "0.1";

export interface PedagogyAuditArtifact {
  artifact_version: string;
  summary: { errors: number; warnings: number; infos: number };
  errors: AuditFinding[];
  warnings: AuditFinding[];
  /** `AuditReport.info` is exposed as `infos` here for symmetry with the summary. */
  infos: AuditFinding[];
}

/** Map an in-memory `AuditReport` to the on-disk artifact envelope. Pure. */
export function toAuditArtifact(report: AuditReport): PedagogyAuditArtifact {
  return {
    artifact_version: PEDAGOGY_AUDIT_ARTIFACT_VERSION,
    summary: {
      errors: report.errors.length,
      warnings: report.warnings.length,
      infos: report.info.length,
    },
    errors: report.errors,
    warnings: report.warnings,
    infos: report.info,
  };
}

/**
 * Write the audit artifact to `<distPath>/.sophie/pedagogy-audit.json`.
 * 2-space indent + trailing newline match Sophie's formatting convention and
 * keep diffs readable. `mkdir({ recursive: true })` covers a fresh build (and
 * is a no-op when `pedagogy-index.json` already created `.sophie/`).
 */
export async function writePedagogyAuditJson(
  distPath: string,
  report: AuditReport
): Promise<void> {
  const sophieDir = join(distPath, ".sophie");
  await mkdir(sophieDir, { recursive: true });
  const outPath = join(sophieDir, "pedagogy-audit.json");
  await writeFile(
    outPath,
    `${JSON.stringify(toAuditArtifact(report), null, 2)}\n`,
    "utf-8"
  );
}
