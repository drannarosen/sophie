import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import SRE from "speech-rule-engine";

/**
 * SRE (speech-rule-engine) emits screen-reader speech for MathML. We use
 * the ClearSpeak ruleset — the modern, learner-oriented English ruleset
 * (e.g. `R^2` → "R squared") rather than MathSpeak's verbose
 * "R superscript 2 baseline".
 *
 * `renderMath` (`./render-math.ts`) stays synchronous because the registry
 * prerender runs inside Astro's synchronous remark transformer; speech is a
 * *separate* async function that consumes the `mathml` renderMath already
 * returns.
 */

/**
 * SRE's locale/ruleset JSON lives at `<pkg>/lib/mathmaps`. Its automatic
 * Node resolution (`nodeRequire().resolve`) works in a bare process but
 * silently falls back to the default (MathSpeak-flavoured) ruleset under
 * Vite/Vitest — so `R^2` came out "r raised to the 2 power" instead of the
 * ClearSpeak "R squared". Resolving the path explicitly and passing it as
 * `json` makes ClearSpeak load deterministically in tests *and* in builds.
 */
const MATHMAPS_PATH = join(
  dirname(createRequire(import.meta.url).resolve("speech-rule-engine")),
  "mathmaps"
);

const ENGINE_FEATURE = {
  locale: "en",
  domain: "clearspeak",
  style: "default",
  json: MATHMAPS_PATH,
} as const;

/**
 * One-time engine setup, memoized as a promise so the engine initializes
 * exactly once per process, using the explicit `json` mathmaps path above
 * (auto-resolution silently regresses to MathSpeak under Vite/Vitest).
 *
 * A rejected setup promise is intentionally sticky for the process/build
 * lifetime: a one-shot `astro build` either has the mathmaps on disk or it
 * does not, so retrying per call cannot fix a missing/corrupt install — it
 * would only multiply identical failures. `speechFromMathml` degrades to ""
 * everywhere instead (mirrors KaTeX `throwOnError:false`). Dev/HMR resets
 * `enginePromise` on module reload, so a transient failure self-heals there.
 */
let enginePromise: Promise<void> | undefined;

function ensureEngine(): Promise<void> {
  if (enginePromise === undefined) {
    const setup = SRE.setupEngine(ENGINE_FEATURE).then(async () => {
      await SRE.engineReady();
    });
    enginePromise = setup;
    return setup;
  }
  return enginePromise;
}

/**
 * Module-level memo cache (R8). `speechFromMathml` is a pure async function
 * of its `mathml` argument — SRE produces deterministic speech for a fixed
 * engine configuration — so a per-mathml cache of the resolved string is
 * safe. The cache lives for the process/build lifetime (one-shot Node build
 * renders N static pages with a stable set of equations); in dev mode the
 * module reloads on HMR, which drops the cache and re-derives speech. There
 * is no companion Vite plugin or hook to invalidate — this is a pure helper,
 * not a transform that observes file changes.
 */
const cache = new Map<string, string>();

/**
 * Return SRE ClearSpeak speech for a `<math>…</math>` MathML string.
 *
 * Returns `""` on empty input or any SRE/parse failure — never throws,
 * mirroring `renderMath`'s `throwOnError: false` resilience so a single
 * malformed expression can't break a whole build.
 */
export async function speechFromMathml(mathml: string): Promise<string> {
  // SRE only produces meaningful speech from a `<math>` root. Under
  // Vite/Vitest its xmldom parser does NOT throw on malformed input — it
  // returns the parse error as "speech" text — so guard non-MathML input
  // here rather than relying on the try/catch below. `renderMath` always
  // emits either "" or a `<math>…</math>` string, so this rejects only the
  // garbage path.
  if (!mathml.includes("<math")) {
    return "";
  }
  const cached = cache.get(mathml);
  if (cached !== undefined) {
    return cached;
  }

  let speech: string;
  try {
    await ensureEngine();
    speech = SRE.toSpeech(mathml);
  } catch {
    speech = "";
  }

  cache.set(mathml, speech);
  return speech;
}
