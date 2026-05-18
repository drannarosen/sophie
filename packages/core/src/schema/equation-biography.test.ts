import { describe, expect, it } from "vitest";
import {
  AssumptionEntrySchema,
  BiographySchema,
  BreaksWhenEntrySchema,
  CommonMisuseEntrySchema,
  DerivationStepEntrySchema,
  ObservableEntrySchema,
  UnitsEntrySchema,
} from "./equation-biography.ts";

describe("ObservableEntrySchema", () => {
  it("accepts a minimum-valid observable (body + role literal)", () => {
    const result = ObservableEntrySchema.safeParse({
      body: "Peak wavelength of thermal emission as a function of temperature.",
      epistemicRole: "observable",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing body", () => {
    const result = ObservableEntrySchema.safeParse({
      epistemicRole: "observable",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty body (NonEmptyString)", () => {
    const result = ObservableEntrySchema.safeParse({
      body: "",
      epistemicRole: "observable",
    });
    expect(result.success).toBe(false);
  });

  it("rejects the wrong epistemicRole literal (e.g. 'model')", () => {
    // ADR 0058 binds <Observable> to the "observable" role specifically;
    // the schema literal locks it so the extractor can't drift.
    const result = ObservableEntrySchema.safeParse({
      body: "…",
      epistemicRole: "model",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing epistemicRole", () => {
    const result = ObservableEntrySchema.safeParse({ body: "…" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys (.strict() — guards against extractor drift)", () => {
    const result = ObservableEntrySchema.safeParse({
      body: "…",
      epistemicRole: "observable",
      somethingExtra: "drift",
    });
    expect(result.success).toBe(false);
  });
});

describe("AssumptionEntrySchema", () => {
  it("accepts a minimum-valid assumption (body + role literal)", () => {
    const result = AssumptionEntrySchema.safeParse({
      body: "Source is in local thermodynamic equilibrium.",
      epistemicRole: "assumption",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional type slug (free-form at v1 per F1 forward-compat)", () => {
    const result = AssumptionEntrySchema.safeParse({
      body: "…",
      type: "thermal-equilibrium",
      epistemicRole: "assumption",
    });
    expect(result.success).toBe(true);
  });

  it("accepts v2-reserved concept_ref slot (Slug array)", () => {
    const result = AssumptionEntrySchema.safeParse({
      body: "…",
      epistemicRole: "assumption",
      concept_ref: ["blackbody-temperature", "thermal-equilibrium"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-Slug type", () => {
    const result = AssumptionEntrySchema.safeParse({
      body: "…",
      type: "Thermal Equilibrium",
      epistemicRole: "assumption",
    });
    expect(result.success).toBe(false);
  });

  it("rejects the wrong epistemicRole literal (e.g. 'observable')", () => {
    const result = AssumptionEntrySchema.safeParse({
      body: "…",
      epistemicRole: "observable",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty concept_ref array (v2 forward-compat seam, populated state)", () => {
    const result = AssumptionEntrySchema.safeParse({
      body: "…",
      epistemicRole: "assumption",
      concept_ref: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown keys (.strict() — guards against extractor drift)", () => {
    const result = AssumptionEntrySchema.safeParse({
      body: "…",
      epistemicRole: "assumption",
      assumptions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("UnitsEntrySchema", () => {
  it("accepts a minimum-valid units entry (symbol + unit)", () => {
    const result = UnitsEntrySchema.safeParse({
      symbol: "T",
      unit: "K",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a TeX symbol", () => {
    const result = UnitsEntrySchema.safeParse({
      symbol: "\\lambda_{peak}",
      unit: "cm",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a compound unit with spaces and exponents", () => {
    const result = UnitsEntrySchema.safeParse({
      symbol: "F",
      unit: "erg s^-1 cm^-2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing symbol", () => {
    expect(UnitsEntrySchema.safeParse({ unit: "K" }).success).toBe(false);
  });

  it("rejects missing unit", () => {
    expect(UnitsEntrySchema.safeParse({ symbol: "T" }).success).toBe(false);
  });

  it("rejects empty symbol or unit (NonEmptyString)", () => {
    expect(UnitsEntrySchema.safeParse({ symbol: "", unit: "K" }).success).toBe(
      false
    );
    expect(UnitsEntrySchema.safeParse({ symbol: "T", unit: "" }).success).toBe(
      false
    );
  });

  it("does NOT carry an epistemicRole — passing one fails parse (.strict())", () => {
    // ADR 0058 §"chrome" — <Units> is descriptive metadata, not epistemic
    // content. `.strict()` makes this structural rather than descriptive: a
    // future extractor accidentally emitting `epistemicRole: "..."` on a
    // Units entry fails parse rather than silently shipping a drifted role.
    const result = UnitsEntrySchema.safeParse({
      symbol: "T",
      unit: "K",
      epistemicRole: "observable",
    });
    expect(result.success).toBe(false);
  });

  it("does not surface an epistemicRole field on a clean parse", () => {
    const result = UnitsEntrySchema.safeParse({ symbol: "T", unit: "K" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("epistemicRole" in result.data).toBe(false);
    }
  });
});

describe("BreaksWhenEntrySchema", () => {
  it("accepts a minimum-valid breaks-when (body + role literal 'approximation')", () => {
    const result = BreaksWhenEntrySchema.safeParse({
      body: "Non-thermal emission (synchrotron, masers, line emission).",
      epistemicRole: "approximation",
    });
    expect(result.success).toBe(true);
  });

  it("accepts v2-reserved concept_ref slot", () => {
    const result = BreaksWhenEntrySchema.safeParse({
      body: "…",
      epistemicRole: "approximation",
      concept_ref: ["thermal-emission"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects the wrong epistemicRole literal", () => {
    // <BreaksWhen> binds to "approximation" specifically — it marks a
    // validity-domain boundary, not an inference or assumption.
    const result = BreaksWhenEntrySchema.safeParse({
      body: "…",
      epistemicRole: "assumption",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys (.strict() — guards against extractor drift)", () => {
    const result = BreaksWhenEntrySchema.safeParse({
      body: "…",
      epistemicRole: "approximation",
      common_misuses: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("CommonMisuseEntrySchema", () => {
  it("accepts a minimum-valid misuse (body only)", () => {
    const result = CommonMisuseEntrySchema.safeParse({
      body: "Applying Wien's law to identify the temperature of an absorption-line spectrum.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional misconception cross-ref (Slug)", () => {
    const result = CommonMisuseEntrySchema.safeParse({
      body: "…",
      misconception: "wiens-law-absorption-spectra",
    });
    expect(result.success).toBe(true);
  });

  it("accepts v2-reserved citation slots", () => {
    const result = CommonMisuseEntrySchema.safeParse({
      body: "…",
      misconception: "wiens-law-absorption-spectra",
      citation_doi: "10.1234/example.doi",
      citation_bibtex: "@article{example2026,...}",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-Slug misconception ref", () => {
    const result = CommonMisuseEntrySchema.safeParse({
      body: "…",
      misconception: "Wien's Law Misuse",
    });
    expect(result.success).toBe(false);
  });

  it("does NOT carry an epistemicRole — passing one fails parse (.strict())", () => {
    // ADR 0058 — the linked misconception node carries "misconception"; the
    // cross-ref entry carries no role of its own. `.strict()` enforces this
    // structurally rather than descriptively.
    const result = CommonMisuseEntrySchema.safeParse({
      body: "…",
      misconception: "wiens-law-absorption-spectra",
      epistemicRole: "misconception",
    });
    expect(result.success).toBe(false);
  });

  it("does not surface an epistemicRole field on a clean parse", () => {
    const result = CommonMisuseEntrySchema.safeParse({
      body: "…",
      misconception: "wiens-law-absorption-spectra",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("epistemicRole" in result.data).toBe(false);
    }
  });
});

describe("DerivationStepEntrySchema (ADR 0046 §R9)", () => {
  it("accepts a minimum-valid step (body + role literal)", () => {
    const result = DerivationStepEntrySchema.safeParse({
      body: "Start from Planck's law and differentiate with respect to wavelength.",
      epistemicRole: "model",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional label", () => {
    const result = DerivationStepEntrySchema.safeParse({
      body: "Set ∂B/∂λ = 0 to find the peak.",
      label: "Differentiate and set to zero",
      epistemicRole: "model",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    expect(
      DerivationStepEntrySchema.safeParse({
        body: "",
        epistemicRole: "model",
      }).success
    ).toBe(false);
  });

  it("rejects wrong epistemicRole", () => {
    expect(
      DerivationStepEntrySchema.safeParse({
        body: "x",
        epistemicRole: "observable",
      }).success
    ).toBe(false);
  });

  it("rejects unknown keys (.strict())", () => {
    expect(
      DerivationStepEntrySchema.safeParse({
        body: "x",
        epistemicRole: "model",
        // typo
        labels: "Step 1",
      }).success
    ).toBe(false);
  });
});

describe("BiographySchema (aggregate)", () => {
  it("accepts an empty biography — all fields optional or defaulted (per-equation opt-in per ADR 0046)", () => {
    const result = BiographySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      // Array fields default to [] so consumers (audit, render) walk a
      // uniform shape without optional-chain noise.
      expect(result.data.assumptions).toEqual([]);
      expect(result.data.units).toEqual([]);
      expect(result.data.common_misuses).toEqual([]);
      expect(result.data.derivation_steps).toEqual([]);
      expect(result.data.observable).toBeUndefined();
      expect(result.data.breaks_when).toBeUndefined();
    }
  });

  it("accepts a full Wien's-law-shaped biography", () => {
    // Smoke fixture per design §D3 — exercises every biography child.
    const result = BiographySchema.safeParse({
      observable: {
        body: "Peak wavelength of thermal emission vs temperature.",
        epistemicRole: "observable",
      },
      assumptions: [
        {
          body: "Source is in local thermodynamic equilibrium.",
          type: "thermal-equilibrium",
          epistemicRole: "assumption",
        },
        {
          body: "Source emits as an ideal blackbody.",
          type: "blackbody",
          epistemicRole: "assumption",
        },
      ],
      units: [
        { symbol: "T", unit: "K" },
        { symbol: "\\lambda_{peak}", unit: "cm" },
      ],
      breaks_when: {
        body: "Non-thermal emission (synchrotron, masers, line emission).",
        epistemicRole: "approximation",
      },
      common_misuses: [
        {
          body: "Applying Wien's law to absorption-line spectra.",
          misconception: "wiens-law-absorption-spectra",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an observable with the wrong role (extractor drift guard)", () => {
    const result = BiographySchema.safeParse({
      observable: { body: "…", epistemicRole: "inference" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level keys (.strict() — catches singular-vs-plural typos)", () => {
    // A common authoring/extractor bug: writing singular `assumption` instead
    // of plural `assumptions`. Without .strict() the typo is silently dropped
    // and the equation ships with no assumptions in the index.
    const result = BiographySchema.safeParse({
      assumption: [{ body: "x", epistemicRole: "assumption" }],
    });
    expect(result.success).toBe(false);
  });

  it("modeling: Observable + BreaksWhen are singletons; Assumption/Units/CommonMisuse are arrays", () => {
    // Per design doc §"Pedagogy index entry shape" — Observable/BreaksWhen
    // are optional singletons because typically each equation has one of
    // each; Assumption/Units/CommonMisuse are arrays because equations
    // typically have multiple.
    const result = BiographySchema.safeParse({
      observable: { body: "x", epistemicRole: "observable" },
      breaks_when: { body: "y", epistemicRole: "approximation" },
      assumptions: [
        { body: "a1", epistemicRole: "assumption" },
        { body: "a2", epistemicRole: "assumption" },
      ],
      units: [
        { symbol: "T", unit: "K" },
        { symbol: "L", unit: "cm" },
      ],
      common_misuses: [{ body: "m1" }, { body: "m2" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assumptions).toHaveLength(2);
      expect(result.data.units).toHaveLength(2);
      expect(result.data.common_misuses).toHaveLength(2);
    }
  });
});
