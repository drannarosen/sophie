// @vitest-environment node
//
// `enrichEquationsWithSpeech` awaits `speechFromMathml` (SRE), which reads
// its locale JSON from disk via Node `fs`. Under vitest's default jsdom
// environment SRE takes its browser (HTTP) loader branch and parses empty
// JSON. Pin to `node` to match the real `astro build` runtime — same
// rationale as speech-engine.test.ts.
import type { EquationEntry } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { enrichEquationsWithSpeech } from "./enrich-equations-speech.ts";

function entry(overrides: Partial<EquationEntry>): EquationEntry {
  return {
    id: "r-squared",
    title: "R squared",
    tex: "R^2",
    symbols: ["R"],
    ...overrides,
  } as EquationEntry;
}

describe("enrichEquationsWithSpeech", () => {
  it("populates non-empty ClearSpeak speech for an entry without it", async () => {
    const e = entry({});
    await enrichEquationsWithSpeech([e]);
    expect(e.speech).toBeDefined();
    expect(e.speech?.toLowerCase()).toContain("squared");
  });

  it("mutates the entry objects in place (same references)", async () => {
    const e = entry({});
    const list = [e];
    await enrichEquationsWithSpeech(list);
    // The caller's reference observes the mutation — the store, the audit,
    // and Pagefind all read the same accumulated entry objects.
    expect(list[0]).toBe(e);
    expect(e.speech).toBeDefined();
  });

  it("is idempotent: a second run does not overwrite existing speech", async () => {
    const e = entry({ speech: "author override" });
    await enrichEquationsWithSpeech([e]);
    expect(e.speech).toBe("author override");
  });

  it("does not re-derive on a repeat run of an already-enriched entry", async () => {
    const e = entry({});
    await enrichEquationsWithSpeech([e]);
    const first = e.speech;
    await enrichEquationsWithSpeech([e]);
    expect(e.speech).toBe(first);
  });

  it("leaves speech unset when the tex yields no MathML (parse failure)", async () => {
    // An empty-string tex round-trips to "" mathml → speechFromMathml "" →
    // we never assign a falsy speech (NonEmptyString schema constraint).
    const e = entry({ tex: "" });
    await enrichEquationsWithSpeech([e]);
    expect(e.speech).toBeUndefined();
  });
});
