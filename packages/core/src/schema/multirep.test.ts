import { describe, expect, it } from "vitest";
import {
  MultiRepIndexEntrySchema,
  MultiRepSchema,
  SerializedRepSchema,
} from "./multirep.ts";

describe("SerializedRepSchema (discriminated union)", () => {
  it("accepts a verbal rep", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "verbal",
      body: "The distance from the central mass to the orbiting body.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a minimal equation rep", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "equation",
      refKey: "kepler-3rd-law",
      symbol: "r",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an equation rep with equivalent_to + via", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "equation",
      refKey: "wiens-law-frequency",
      symbol: "\\nu_{peak}",
      equivalent_to: "wiens-law-wavelength",
      via: "planck-substitution",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a minimal figure rep", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "figure",
      refName: "orbit-geometry",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a figure rep with symbolLabel", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "figure",
      refName: "orbit-geometry",
      symbolLabel: "r",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown kinds at v1 (RepCode deferred — kind: 'code' lands with the RepCode sprint)", () => {
    // The 2026-05-17 design hardening §D1 + §F1 defers RepCode. The schema is
    // strict at v1; adding kind: "code" later is a non-breaking schema bump
    // because discriminatedUnion narrows on the literal.
    const result = SerializedRepSchema.safeParse({
      kind: "code",
      refName: "orbit-simulation",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nonsense discriminator values", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "audio",
      body: "narration",
    });
    expect(result.success).toBe(false);
  });

  it("rejects equation rep without required refKey or symbol", () => {
    expect(
      SerializedRepSchema.safeParse({ kind: "equation", refKey: "k" }).success
    ).toBe(false);
    expect(
      SerializedRepSchema.safeParse({ kind: "equation", symbol: "r" }).success
    ).toBe(false);
  });

  it("rejects figure rep without required refName", () => {
    const result = SerializedRepSchema.safeParse({ kind: "figure" });
    expect(result.success).toBe(false);
  });

  it("rejects verbal rep without required body", () => {
    const result = SerializedRepSchema.safeParse({ kind: "verbal" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys on a verbal rep (.strict() — extractor drift guard)", () => {
    // Mirror the EquationBiography schema-discipline posture: unknown keys
    // fail parse rather than being silently stripped. A future extractor
    // accidentally emitting `kind: "verbal", body: "...", refKey: "..."`
    // (a copy-paste typo from RepEquation) must surface as a parse error.
    const result = SerializedRepSchema.safeParse({
      kind: "verbal",
      body: "The orbital radius is…",
      refKey: "kepler-3rd-law",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys on an equation rep (.strict() — extractor drift guard)", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "equation",
      refKey: "kepler-3rd-law",
      symbol: "r",
      body: "duplicate-verbal-field-by-mistake",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys on a figure rep (.strict() — extractor drift guard)", () => {
    const result = SerializedRepSchema.safeParse({
      kind: "figure",
      refName: "orbit-geometry",
      caption: "extra prop should not silently pass",
    });
    expect(result.success).toBe(false);
  });
});

describe("MultiRepSchema (component props)", () => {
  it("accepts the minimum-valid props (concept only)", () => {
    const result = MultiRepSchema.safeParse({ concept: "orbital-radius" });
    expect(result.success).toBe(true);
  });

  it("accepts optional id + layout + display reserved props", () => {
    const result = MultiRepSchema.safeParse({
      concept: "orbital-radius",
      id: "mr-orbital-radius",
      layout: "grid",
      display: "default",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-Slug concept", () => {
    for (const bad of ["UPPER", "with space", "trailing-", "a--b", ""]) {
      const result = MultiRepSchema.safeParse({ concept: bad });
      expect(result.success, `expected concept "${bad}" to be rejected`).toBe(
        false
      );
    }
  });

  it("accepts layout values 'grid' or 'stack' (v1 reserved enum)", () => {
    expect(
      MultiRepSchema.safeParse({ concept: "x", layout: "grid" }).success
    ).toBe(true);
    expect(
      MultiRepSchema.safeParse({ concept: "x", layout: "stack" }).success
    ).toBe(true);
    expect(
      MultiRepSchema.safeParse({ concept: "x", layout: "tabbed" }).success
    ).toBe(false);
  });

  it("rejects unknown component props (.strict() — guards typoed prop names)", () => {
    // A common authoring bug: typoing `concept` as `concepts`, or passing a
    // v2-shaped prop that v1 doesn't accept yet. Without .strict() the typo
    // is silently dropped and the MultiRep ships unbound.
    const result = MultiRepSchema.safeParse({
      concept: "orbital-radius",
      conceptId: "alt-key-by-mistake",
    });
    expect(result.success).toBe(false);
  });
});

describe("MultiRepIndexEntrySchema (pedagogy-index entry)", () => {
  const minValid = {
    concept: "orbital-radius",
    id: "mr-orbital-radius",
    chapter: "module-02/lecture-04",
    reps: [
      { kind: "verbal", body: "The orbital radius is…" },
      { kind: "equation", refKey: "kepler-3rd-law", symbol: "r" },
      { kind: "figure", refName: "orbit-geometry", symbolLabel: "r" },
    ],
  };

  it("accepts the minimum-valid entry (concept + id + chapter + reps[])", () => {
    const result = MultiRepIndexEntrySchema.safeParse(minValid);
    expect(result.success).toBe(true);
  });

  it("accepts the v2-reserved forward-compat slots (unused at v1)", () => {
    // Per 2026-05-17 design hardening §F5 — these slots are declared at v1
    // so v2 (AI authoring ledger per ADR 0042, cross-chapter equivalents)
    // lands non-breakingly.
    const result = MultiRepIndexEntrySchema.safeParse({
      ...minValid,
      layout: "grid",
      display: "default",
      bindingNotes: "Authoring note about this binding.",
      crossChapterEquivalents: ["module-01/lecture-02#mr-orbital-radius"],
      aiAuthoredBy: "sophie-chapter-author",
      lastReviewedDate: "2026-05-17",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an entry with only one rep (binding-of-one is meaningful)", () => {
    // Per ADR 0043 §Artifact 2: a <MultiRep> declares the forms actually
    // present. A chapter introducing only the verbal handle of a concept
    // can author a one-rep binding (e.g., before the equation lands).
    const result = MultiRepIndexEntrySchema.safeParse({
      ...minValid,
      reps: [{ kind: "verbal", body: "Just the verbal handle for now." }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects entries with empty reps array (audit invariant MR1's prerequisite)", () => {
    // A MultiRep that declares no reps has nothing to bind; the schema
    // catches this before the audit even runs.
    const result = MultiRepIndexEntrySchema.safeParse({
      ...minValid,
      reps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects entries with a v1-unknown rep kind (e.g., 'code' before RepCode ships)", () => {
    const result = MultiRepIndexEntrySchema.safeParse({
      ...minValid,
      reps: [
        ...minValid.reps,
        { kind: "code", refName: "orbit-simulation", symbol: "r_au" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required top-level fields", () => {
    for (const field of ["concept", "id", "chapter", "reps"] as const) {
      const { [field]: _omitted, ...rest } = minValid;
      const result = MultiRepIndexEntrySchema.safeParse(rest);
      expect(result.success, `expected missing "${field}" to be rejected`).toBe(
        false
      );
    }
  });

  it("rejects unknown top-level keys (.strict() — catches v2-slot typos)", () => {
    // The v2-reserved slots (bindingNotes, crossChapterEquivalents,
    // aiAuthoredBy, lastReviewedDate) are explicitly named on the schema.
    // .strict() ensures a typo like `binding_notes` or `crossChapterEquivalent`
    // (singular) fails parse instead of being silently dropped.
    const result = MultiRepIndexEntrySchema.safeParse({
      ...minValid,
      binding_notes: "snake_case typo of bindingNotes",
    });
    expect(result.success).toBe(false);
  });
});
