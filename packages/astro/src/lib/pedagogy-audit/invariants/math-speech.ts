import type { MathSpeechCoverage } from "../math-speech-coverage.ts";
import type { FindingSink } from "../types.ts";

/**
 * Math-speech coverage audit invariants (ADR 0089, Phase B5).
 *
 * Reads the build-scoped coverage snapshot collected by the three
 * build-time math surfaces — MDX `$…$` (rehypeKatexSpeech),
 * formative math choices (rehypeChoiceSpeech), and the equation
 * registry prerender (enrichEquationsWithSpeech) — and reports:
 *
 *   MA-1 WARNING  one aggregate warning when ≥1 build-time math
 *                 expression produced empty SRE speech (a real coverage
 *                 gap). v1 is WARNING-only per resolved-decision 1; ADR
 *                 0089 documents graduation to ERROR once coverage is
 *                 stable. Per-kind counts + the failure details are
 *                 inlined so the warning is directly actionable (the full
 *                 failure list also lands in `pedagogy-audit.json`'s
 *                 `mathA11y` section).
 *   MA-2 INFO     coverage summary (`labeled/total`).
 *   MA-3 INFO     the runtime tail — MathText (`render-text-with-math.ts`)
 *                 and BlackbodyExplorer (`InlineMath.tsx`) compute speech
 *                 client-side and are NOT build-audited (resolved-
 *                 decision 4).
 *   MA-4 INFO     the deferred registry tail — `rearranged_forms` and
 *                 `constants` are labeled-deferred in v1 (only the PRIMARY
 *                 `tex` of each equation entry is build-spoken).
 *
 * Pure: takes the coverage snapshot as input (the runner reads it from
 * `getMathSpeechCoverage()` and threads it via AuditExtras), pushes
 * findings into the sink. No module-state reads here — fully testable
 * by constructing a snapshot inline.
 */
export function checkMathSpeech(
  coverage: MathSpeechCoverage,
  sink: FindingSink
): void {
  const { total, labeled, failures } = coverage;

  if (failures.length > 0) {
    const byKind = failures.reduce<Record<string, number>>((acc, f) => {
      acc[f.kind] = (acc[f.kind] ?? 0) + 1;
      return acc;
    }, {});
    const kindBreakdown = Object.entries(byKind)
      .map(([kind, n]) => `${kind}: ${n}`)
      .join(", ");
    const details = failures
      .map((f) => `${f.kind}:${f.detail ?? "(no detail)"}`)
      .join("; ");
    sink.warnings.push({
      severity: "WARNING",
      code: "MA-1",
      message: `MA-1: ${failures.length} of ${total} build-time math expressions produced empty SRE speech (${kindBreakdown}). These render without an accessible name. Misses: ${details}.`,
    });
  }

  sink.info.push({
    severity: "INFO",
    code: "MA-2",
    message: `MA-2: build-time math speech coverage ${labeled}/${total} (mdx + choice + registry surfaces).`,
  });

  sink.info.push({
    severity: "INFO",
    code: "MA-3",
    message:
      "MA-3: runtime tail — MathText (render-text-with-math.ts) and BlackbodyExplorer (InlineMath.tsx) compute speech client-side, not build-audited (ADR 0089 resolved-decision 4).",
  });

  sink.info.push({
    severity: "INFO",
    code: "MA-4",
    message:
      "MA-4: deferred registry tail — rearranged_forms and constants are labeled-deferred in v1 (only the primary equation tex is build-spoken).",
  });
}
