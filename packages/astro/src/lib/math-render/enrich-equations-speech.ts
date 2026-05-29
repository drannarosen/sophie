import type { EquationEntry } from "@sophie/core/schema";
import { recordMathSurface } from "../pedagogy-audit/math-speech-coverage.ts";
import { renderMath } from "./render-math.ts";
import { speechFromMathml } from "./speech-engine.ts";

/**
 * Compute SRE ClearSpeak speech for the PRIMARY `tex` of each registry
 * equation entry and write it to `entry.speech` in place (ADR 0089).
 *
 * Why in-place mutation rather than returning copies: the accumulator
 * (`pedagogy-index/accumulator.ts`) stores one `EquationEntry` object per
 * equation id in a `globalThis` Map, and `asPedagogyIndex()` returns those
 * same object references. `TextbookLayout`'s `__setEquations`, the
 * `astro:build:done` audit, and the Pagefind converter all read that one
 * snapshot — mutating the shared objects means every consumer observes the
 * enriched data without re-threading it through three call sites.
 *
 * Why a separate async helper rather than baking speech in the registry
 * prerender: the prerender runs inside Astro's SYNCHRONOUS remark
 * transformer (`renderMath` is sync), so speech — which is async (SRE) —
 * cannot be computed there. This helper is awaited at the async seams
 * instead: `TextbookLayout` frontmatter (so the client store payload
 * carries speech) and the `build:done` hook before `buildPagefindIndex`.
 *
 * Idempotent: entries that already carry non-empty `speech` are skipped, so
 * running it at both seams in one build is harmless. `speechFromMathml` is
 * itself memoized, so repeat derivations are cheap. PRIMARY equation only —
 * `rearranged_forms` / `constants` speech is the deferred tail reported by
 * the math-speech audit (B5), not populated here.
 *
 * Never throws: `speechFromMathml` degrades to `""` on parse/engine failure
 * (mirroring KaTeX `throwOnError: false`). An empty result is not assigned —
 * `EquationEntry.speech` is a `NonEmptyString`, so a failed derivation leaves
 * the field absent and the audit reports the gap.
 */
export async function enrichEquationsWithSpeech(
  entries: ReadonlyArray<EquationEntry>
): Promise<void> {
  await Promise.all(
    entries.map(async (entry) => {
      // Idempotent + double-count guard: an entry that already carries
      // speech (already enriched at the earlier build seam) is skipped
      // here, so the per-page + build:done double-run records each entry
      // into the coverage collector exactly once.
      if (entry.speech) return;
      const { mathml } = renderMath(entry.tex, { displayMode: true });
      const speech = await speechFromMathml(mathml);
      recordMathSurface({
        kind: "registry",
        labeled: speech.length > 0,
        detail: speech.length > 0 ? undefined : entry.id,
      });
      if (speech) entry.speech = speech;
    })
  );
}
