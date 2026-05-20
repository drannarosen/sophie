import type { PedagogyIndex } from "@sophie/core/schema";
import { afterEach, describe, expect, it } from "vitest";
import {
  __resetAuditCacheForTesting,
  runAuditOncePerProcess,
} from "./audit-cache.ts";

function emptyIndex(): PedagogyIndex {
  return {
    definitions: [],
    equations: [],
    equationCitations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    chapters: [],
    modules: [],
    objectives: [],
    inlineRefUsages: [],
    contractValidations: [],
    extractorFindings: [],
    multiReps: [],
    interventions: [],
    deepDives: [],
    omiFlows: [],
  };
}

afterEach(() => {
  __resetAuditCacheForTesting();
});

describe("runAuditOncePerProcess", () => {
  it("returns a report on the first call (dev or prod)", () => {
    const reportDev = runAuditOncePerProcess(emptyIndex(), {}, false);
    expect(reportDev).not.toBeNull();
    expect(reportDev?.errors).toEqual([]);
  });

  it("returns null on subsequent calls in PROD (cached)", () => {
    const first = runAuditOncePerProcess(emptyIndex(), {}, true);
    expect(first).not.toBeNull();
    const second = runAuditOncePerProcess(emptyIndex(), {}, true);
    expect(second).toBeNull();
  });

  it("re-runs on every call in DEV (no cache)", () => {
    const first = runAuditOncePerProcess(emptyIndex(), {}, false);
    expect(first).not.toBeNull();
    const second = runAuditOncePerProcess(emptyIndex(), {}, false);
    expect(second).not.toBeNull();
    const third = runAuditOncePerProcess(emptyIndex(), {}, false);
    expect(third).not.toBeNull();
  });

  it("the cache is process-global — PROD cached state survives across DEV-style calls", () => {
    // Edge case: if a process toggles between prod-style and dev-style
    // callers (e.g. a test harness misuses the API), a prior PROD cache
    // still returns null for subsequent PROD calls. DEV calls always
    // re-run regardless of cache state.
    runAuditOncePerProcess(emptyIndex(), {}, true);
    const devCallAfterProdCache = runAuditOncePerProcess(
      emptyIndex(),
      {},
      false
    );
    expect(devCallAfterProdCache).not.toBeNull();
    const prodCallAfterDevCall = runAuditOncePerProcess(emptyIndex(), {}, true);
    expect(prodCallAfterDevCall).toBeNull();
  });
});
