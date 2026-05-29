import { beforeEach, describe, expect, it } from "vitest";
import { resetMathSpeechCoverage } from "../math-speech-coverage.ts";
import type { FindingSink } from "../types.ts";
import { checkMathSpeech } from "./math-speech.ts";

function emptySink(): FindingSink {
  return { errors: [], warnings: [], info: [] };
}

describe("checkMathSpeech — MA-* math-speech coverage invariant", () => {
  beforeEach(() => {
    resetMathSpeechCoverage();
  });

  it("never emits ERRORs (v1 is WARNING-only per decision 1)", () => {
    const sink = emptySink();
    checkMathSpeech(
      { total: 3, labeled: 1, failures: [{ kind: "mdx", detail: "x" }] },
      sink
    );
    expect(sink.errors).toHaveLength(0);
  });

  describe("MA-1 WARNING — build-time math with empty speech", () => {
    it("fires an aggregate WARNING when there are failures", () => {
      const sink = emptySink();
      checkMathSpeech(
        {
          total: 5,
          labeled: 3,
          failures: [
            { kind: "mdx", detail: "<math>a</math>" },
            { kind: "registry", detail: "wiens-law" },
          ],
        },
        sink
      );
      const ma1 = sink.warnings.filter((f) => f.code === "MA-1");
      expect(ma1).toHaveLength(1);
      expect(ma1[0]?.message).toContain("2 of 5");
      // per-kind detail surfaced for actionability
      expect(ma1[0]?.message).toContain("mdx");
      expect(ma1[0]?.message).toContain("registry");
      expect(ma1[0]?.message).toContain("wiens-law");
    });

    it("does NOT fire when there are zero failures", () => {
      const sink = emptySink();
      checkMathSpeech({ total: 4, labeled: 4, failures: [] }, sink);
      expect(sink.warnings.filter((f) => f.code === "MA-1")).toHaveLength(0);
    });
  });

  describe("INFO findings — always present", () => {
    it("emits a coverage-summary INFO (labeled/total)", () => {
      const sink = emptySink();
      checkMathSpeech({ total: 4, labeled: 4, failures: [] }, sink);
      const summary = sink.info.find((f) => f.code === "MA-2");
      expect(summary).toBeDefined();
      expect(summary?.message).toContain("4/4");
    });

    it("emits a runtime-tail INFO (MathText + BlackbodyExplorer)", () => {
      const sink = emptySink();
      checkMathSpeech({ total: 0, labeled: 0, failures: [] }, sink);
      const runtime = sink.info.find((f) => f.code === "MA-3");
      expect(runtime).toBeDefined();
      expect(runtime?.message).toContain("MathText");
      expect(runtime?.message).toContain("BlackbodyExplorer");
    });

    it("emits a deferred-registry-tail INFO (rearranged_forms + constants)", () => {
      const sink = emptySink();
      checkMathSpeech({ total: 0, labeled: 0, failures: [] }, sink);
      const deferred = sink.info.find((f) => f.code === "MA-4");
      expect(deferred).toBeDefined();
      expect(deferred?.message).toContain("rearranged_forms");
      expect(deferred?.message).toContain("constants");
    });

    it("emits all three INFOs even when there are failures", () => {
      const sink = emptySink();
      checkMathSpeech(
        { total: 2, labeled: 1, failures: [{ kind: "mdx", detail: "x" }] },
        sink
      );
      expect(sink.info.map((f) => f.code).sort()).toEqual([
        "MA-2",
        "MA-3",
        "MA-4",
      ]);
    });
  });
});
