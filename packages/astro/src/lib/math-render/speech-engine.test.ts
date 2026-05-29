// @vitest-environment node
//
// SRE reads its locale JSON from disk via Node `fs`. Under vitest's default
// jsdom environment, jsdom provides `window`/`document`, so SRE's
// `SystemExternal.documentSupported` branch is true and it tries the
// browser (HTTP) loader instead of `fs` — the JSON comes back empty and
// `parseMaps` throws "Unexpected end of JSON input". This helper is a pure
// build-time Node module (it runs during `astro build`, never in a browser),
// so the test environment is pinned to `node` to match its real runtime.
import { describe, expect, it } from "vitest";
import { renderMath } from "./render-math.ts";
import { speechFromMathml } from "./speech-engine.ts";

describe("speechFromMathml", () => {
  it("speaks a superscript as 'squared' (ClearSpeak)", async () => {
    const { mathml } = renderMath("R^2", { displayMode: false });
    const speech = await speechFromMathml(mathml);
    expect(speech.toLowerCase()).toContain("squared");
  });

  it("uses ClearSpeak, not the MathSpeak fallback, for a fraction", async () => {
    // Discriminating assertion (the `json` mathmaps path exists to force
    // ClearSpeak): SRE 4.1.4 ClearSpeak renders \frac{a}{b} as exactly
    // "a over b", whereas the MathSpeak default — what a failed/auto
    // mathmaps load silently regresses to — renders
    // "StartFraction a Over b EndFraction". Asserting the ClearSpeak form
    // AND the absence of "startfraction" fails under that regression,
    // which a bare /fraction|over/ match would not (both contain "over").
    const { mathml } = renderMath("\\frac{a}{b}", { displayMode: false });
    const speech = (await speechFromMathml(mathml)).toLowerCase();
    expect(speech).toBe("a over b");
    expect(speech).not.toContain("startfraction");
  });

  it("returns '' for empty input", async () => {
    expect(await speechFromMathml("")).toBe("");
  });

  it("returns '' (never throws) for non-MathML / parse-failing input", async () => {
    await expect(speechFromMathml("<not-mathml>")).resolves.toBe("");
  });

  it("memoizes: same mathml resolves to equal speech", async () => {
    const { mathml } = renderMath("E = mc^2", { displayMode: true });
    const first = await speechFromMathml(mathml);
    const second = await speechFromMathml(mathml);
    expect(second).toBe(first);
    expect(first.length).toBeGreaterThan(0);
  });
});
