import { beforeEach, describe, expect, it } from "vitest";
import {
  getMathSpeechCoverage,
  recordMathSurface,
  resetMathSpeechCoverage,
} from "./math-speech-coverage.ts";

describe("math-speech build-coverage collector", () => {
  beforeEach(() => {
    resetMathSpeechCoverage();
  });

  it("starts empty", () => {
    expect(getMathSpeechCoverage()).toEqual({
      total: 0,
      labeled: 0,
      failures: [],
    });
  });

  it("records a labeled mdx surface (total + labeled, no failure)", () => {
    recordMathSurface({ kind: "mdx", labeled: true });
    expect(getMathSpeechCoverage()).toEqual({
      total: 1,
      labeled: 1,
      failures: [],
    });
  });

  it("records an unlabeled surface as a failure with kind + detail", () => {
    recordMathSurface({
      kind: "mdx",
      labeled: false,
      detail: "<math>…</math>",
    });
    expect(getMathSpeechCoverage()).toEqual({
      total: 1,
      labeled: 0,
      failures: [{ kind: "mdx", detail: "<math>…</math>" }],
    });
  });

  it("records an unlabeled surface with no detail as undefined detail", () => {
    recordMathSurface({ kind: "choice", labeled: false });
    expect(getMathSpeechCoverage().failures).toEqual([
      { kind: "choice", detail: undefined },
    ]);
  });

  it("accumulates across mdx / choice / registry kinds", () => {
    recordMathSurface({ kind: "mdx", labeled: true });
    recordMathSurface({ kind: "choice", labeled: true });
    recordMathSurface({
      kind: "registry",
      labeled: false,
      detail: "wiens-law",
    });
    recordMathSurface({ kind: "registry", labeled: true });
    const snapshot = getMathSpeechCoverage();
    expect(snapshot.total).toBe(4);
    expect(snapshot.labeled).toBe(3);
    expect(snapshot.failures).toEqual([
      { kind: "registry", detail: "wiens-law" },
    ]);
  });

  it("reset clears all state", () => {
    recordMathSurface({ kind: "mdx", labeled: false, detail: "x" });
    resetMathSpeechCoverage();
    expect(getMathSpeechCoverage()).toEqual({
      total: 0,
      labeled: 0,
      failures: [],
    });
  });

  it("snapshot is a copy — mutating it does not affect collector state", () => {
    recordMathSurface({ kind: "mdx", labeled: false, detail: "x" });
    const snapshot = getMathSpeechCoverage();
    snapshot.failures.push({ kind: "choice", detail: "injected" });
    snapshot.total = 999;
    expect(getMathSpeechCoverage()).toEqual({
      total: 1,
      labeled: 0,
      failures: [{ kind: "mdx", detail: "x" }],
    });
  });
});
