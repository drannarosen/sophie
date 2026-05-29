/**
 * Build-scoped math-speech coverage collector (ADR 0089, Phase B5).
 *
 * The three build-time math surfaces — MDX `$…$` (rehypeKatexSpeech, B2),
 * formative math choices (rehypeChoiceSpeech, B3), and the equation
 * registry prerender (enrichEquationsWithSpeech, B4) — each call
 * `recordMathSurface` once per expression they process. The math-speech
 * audit invariant (`invariants/math-speech.ts`) and `emit.ts` read the
 * accumulated snapshot to report coverage + flag empty-speech gaps.
 *
 * Why a module-scoped collector rather than the artifact-scoped
 * accumulator (ADR 0038 A3): rehype transforms receive only `(tree)` —
 * no artifact id, no accumulator handle — so they cannot write into the
 * per-artifact accumulator. The full-build coverage model (Anna,
 * 2026-05-28) only needs build-wide totals + the failure list, which a
 * single module-level singleton captures correctly.
 *
 * R8 — module-scoped cache HMR strategy. This is a build-scoped collector
 * that accumulates across the build process. A production build is a fresh
 * Node process, so it starts empty and the `astro:build:done` artifact is
 * accurate. Dev-mode HMR re-runs the transforms and re-accumulates into the
 * same singleton, but dev never emits the artifact (only `build:done`
 * does — see integration.ts), so the dev drift is unobservable.
 * `resetMathSpeechCoverage()` exists solely for test isolation
 * (`beforeEach`). No companion plugin invalidates it; the process boundary
 * is the invalidation boundary.
 *
 * State lives on `globalThis`, NOT a module-level binding (mirrors the
 * pedagogy-index accumulator's rationale): with tsup `splitting: false`
 * this module is inlined into multiple entry chunks — `dist/index.js`
 * (the integration, where the mdx/choice rehype transforms record and
 * where `getMathSpeechCoverage()` reads at build:done) AND
 * `dist/lib/math-render/enrich-equations-speech.js` (imported by
 * TextbookLayout, where the registry seam records per page). A module-
 * level `state` would give each chunk its OWN collector, so registry
 * records would land in an orphan instance the audit never reads. The
 * `globalThis` singleton is genuinely per-process and bridges the chunks
 * so all three surfaces feed the one snapshot build:done reads.
 */

export type MathSurfaceKind = "mdx" | "choice" | "registry";

export interface MathSpeechFailure {
  kind: MathSurfaceKind;
  /** Snippet identifying the miss (MathML/LaTeX snippet, or equation id). */
  detail: string | undefined;
}

export interface MathSpeechCoverage {
  total: number;
  labeled: number;
  failures: MathSpeechFailure[];
}

interface RecordInput {
  kind: MathSurfaceKind;
  labeled: boolean;
  detail?: string;
}

const GLOBAL_KEY = "__sophieMathSpeechCoverage";

function getState(): MathSpeechCoverage {
  const g = globalThis as { [GLOBAL_KEY]?: MathSpeechCoverage };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { total: 0, labeled: 0, failures: [] };
  }
  return g[GLOBAL_KEY];
}

/**
 * Record one build-time math surface. Increments `total` always,
 * `labeled` when `labeled` is true, and pushes a failure record (kind +
 * detail) when `labeled` is false.
 */
export function recordMathSurface({
  kind,
  labeled,
  detail,
}: RecordInput): void {
  const state = getState();
  state.total += 1;
  if (labeled) {
    state.labeled += 1;
    return;
  }
  state.failures.push({ kind, detail });
}

/** Return a defensive copy of the current coverage snapshot. */
export function getMathSpeechCoverage(): MathSpeechCoverage {
  const state = getState();
  return {
    total: state.total,
    labeled: state.labeled,
    failures: state.failures.map((f) => ({ ...f })),
  };
}

/** Reset all coverage state. For test isolation only. */
export function resetMathSpeechCoverage(): void {
  const state = getState();
  state.total = 0;
  state.labeled = 0;
  state.failures = [];
}
