import { describe, expect, it } from "vitest";

import { formatAuditThrowMessage } from "./format.ts";
import type { AuditReport } from "./types.ts";

/**
 * Unit tests for the build-throw message builder (PR β.2). Lives in the
 * pedagogy-audit lib next to `formatAuditReport` so the `.astro` imports
 * it through `audit-cache` (the tsup module graph) rather than from a
 * sibling `.ts` that the raw-`.astro`-copy build step would not emit.
 */

function reportWith(errors: AuditReport["errors"]): AuditReport {
  return { errors, warnings: [], info: [] };
}

describe("formatAuditThrowMessage", () => {
  it("inlines each error's code + message, and renders chapter/anchor location", () => {
    const report = reportWith([
      {
        severity: "ERROR",
        code: "D4",
        message: "Unit is missing a learning-objectives block.",
        location: { unit: "stellar-spectra", anchor: "obj-1" },
      },
      {
        severity: "ERROR",
        code: "AS-1",
        message: "MCQ has no correct option.",
      },
    ]);

    const msg = formatAuditThrowMessage(report);

    expect(msg).toContain("Pedagogy audit found 2 errors:");
    expect(msg).toContain("[D4]");
    expect(msg).toContain("[AS-1]");
    expect(msg).toContain("chapter: stellar-spectra");
    expect(msg).toContain("anchor: obj-1");
    expect(msg).toContain("See preceding output for full details");
  });

  it("uses singular 'error' for a single finding", () => {
    const msg = formatAuditThrowMessage(
      reportWith([{ severity: "ERROR", code: "D4", message: "Solo." }])
    );
    expect(msg).toContain("Pedagogy audit found 1 error:");
  });

  it("truncates a long message to 120 chars + ellipsis", () => {
    const long = "x".repeat(200);
    const msg = formatAuditThrowMessage(
      reportWith([{ severity: "ERROR", code: "D4", message: long }])
    );
    expect(msg).toContain(`${"x".repeat(120)}…`);
    expect(msg).not.toContain("x".repeat(121));
  });

  it("caps the inline list at 10 and reports the overflow count", () => {
    const errors = Array.from({ length: 12 }, (_, i) => ({
      severity: "ERROR" as const,
      code: `E${i}`,
      message: `error ${i}`,
    }));
    const msg = formatAuditThrowMessage(reportWith(errors));

    expect(msg).toContain("Pedagogy audit found 12 errors:");
    expect(msg).toContain("…and 2 more — see preceding output");
    expect(msg).toContain("[E0]");
    expect(msg).toContain("[E9]");
    expect(msg).not.toContain("[E10]");
  });
});
