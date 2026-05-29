import { describe, expect, it } from "vitest";
import {
  EquationConstantSchema,
  EquationRegistryEntrySchema,
  RearrangedFormSchema,
  RelatedEquationKindSchema,
  RelatedEquationSchema,
} from "./equation-registry.ts";

const minValid = {
  id: "wiens-law",
  title: "Wien's Law",
  tex: "\\lambda_{peak} = b\\,T^{-1}",
  symbols: ["T", "\\lambda_{peak}"],
};

describe("EquationConstantSchema", () => {
  it("accepts the minimum-valid constant (symbol + value)", () => {
    expect(
      EquationConstantSchema.safeParse({ symbol: "b", value: "0.29" }).success
    ).toBe(true);
  });

  it("accepts optional unit and name", () => {
    expect(
      EquationConstantSchema.safeParse({
        symbol: "b",
        value: "0.29",
        unit: "cm·K",
        name: "Wien's displacement constant",
      }).success
    ).toBe(true);
  });

  it("accepts optional build-time prerendered html fields (ADR 0090)", () => {
    expect(
      EquationConstantSchema.safeParse({
        symbol: "b",
        value: "0.29",
        unit: "cm·K",
        symbol_html: '<span class="katex">b</span>',
        value_html: '<span class="katex">0.29</span>',
        unit_html: '<span class="katex">cm·K</span>',
      }).success
    ).toBe(true);
  });

  it("rejects empty prerendered html fields", () => {
    expect(
      EquationConstantSchema.safeParse({
        symbol: "b",
        value: "0.29",
        symbol_html: "",
      }).success
    ).toBe(false);
  });

  it("rejects missing symbol or value", () => {
    expect(EquationConstantSchema.safeParse({ symbol: "b" }).success).toBe(
      false
    );
    expect(EquationConstantSchema.safeParse({ value: "0.29" }).success).toBe(
      false
    );
  });

  it("rejects empty symbol or value", () => {
    expect(
      EquationConstantSchema.safeParse({ symbol: "", value: "0.29" }).success
    ).toBe(false);
    expect(
      EquationConstantSchema.safeParse({ symbol: "b", value: "" }).success
    ).toBe(false);
  });

  it("rejects unknown keys (.strict())", () => {
    expect(
      EquationConstantSchema.safeParse({
        symbol: "b",
        value: "0.29",
        units: "cm·K",
      }).success
    ).toBe(false);
  });
});

describe("RearrangedFormSchema", () => {
  it("accepts the minimum-valid rearranged form (tex + solves_for)", () => {
    expect(
      RearrangedFormSchema.safeParse({
        tex: "T = b\\,\\lambda_{peak}^{-1}",
        solves_for: "T",
      }).success
    ).toBe(true);
  });

  it("accepts optional label", () => {
    expect(
      RearrangedFormSchema.safeParse({
        tex: "T = b\\,\\lambda_{peak}^{-1}",
        solves_for: "T",
        label: "Temperature from peak wavelength",
      }).success
    ).toBe(true);
  });

  it("accepts optional build-time prerendered html (ADR 0090)", () => {
    expect(
      RearrangedFormSchema.safeParse({
        tex: "T = b\\,\\lambda_{peak}^{-1}",
        solves_for: "T",
        html: '<span class="katex">…</span>',
      }).success
    ).toBe(true);
  });

  it("rejects empty prerendered html", () => {
    expect(
      RearrangedFormSchema.safeParse({
        tex: "T = b\\,\\lambda_{peak}^{-1}",
        solves_for: "T",
        html: "",
      }).success
    ).toBe(false);
  });

  it("rejects missing tex or solves_for", () => {
    expect(RearrangedFormSchema.safeParse({ tex: "x = y" }).success).toBe(
      false
    );
    expect(RearrangedFormSchema.safeParse({ solves_for: "x" }).success).toBe(
      false
    );
  });
});

describe("RelatedEquationKindSchema", () => {
  it("accepts canonical kinds", () => {
    expect(RelatedEquationKindSchema.safeParse("see-also").success).toBe(true);
    expect(RelatedEquationKindSchema.safeParse("prereq").success).toBe(true);
    expect(RelatedEquationKindSchema.safeParse("derives-from").success).toBe(
      true
    );
  });

  it("rejects unknown kinds", () => {
    expect(RelatedEquationKindSchema.safeParse("equivalent").success).toBe(
      false
    );
    expect(RelatedEquationKindSchema.safeParse("").success).toBe(false);
  });
});

describe("RelatedEquationSchema", () => {
  it("accepts the minimum-valid related entry (refId + kind)", () => {
    expect(
      RelatedEquationSchema.safeParse({
        refId: "stefan-boltzmann",
        kind: "see-also",
      }).success
    ).toBe(true);
  });

  it("accepts optional description", () => {
    expect(
      RelatedEquationSchema.safeParse({
        refId: "planck-distribution",
        kind: "derives-from",
        description:
          "Wien's law is the peak of the Planck blackbody distribution.",
      }).success
    ).toBe(true);
  });

  it("rejects bad refId (non-kebab-case)", () => {
    expect(
      RelatedEquationSchema.safeParse({
        refId: "Stefan_Boltzmann",
        kind: "see-also",
      }).success
    ).toBe(false);
  });
});

describe("EquationRegistryEntrySchema", () => {
  it("accepts the minimum-valid entry", () => {
    expect(EquationRegistryEntrySchema.safeParse(minValid).success).toBe(true);
  });

  it("rejects missing tex", () => {
    const { tex: _tex, ...rest } = minValid;
    expect(EquationRegistryEntrySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty tex", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({ ...minValid, tex: "" }).success
    ).toBe(false);
  });

  it("rejects empty symbols array", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({ ...minValid, symbols: [] })
        .success
    ).toBe(false);
  });

  it("rejects empty symbol entries", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({
        ...minValid,
        symbols: ["T", ""],
      }).success
    ).toBe(false);
  });

  it("accepts optional build-time prerendered html (ADR 0090)", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({
        ...minValid,
        html: '<span class="katex katex-display">…</span>',
      }).success
    ).toBe(true);
  });

  it("rejects empty prerendered html", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({ ...minValid, html: "" }).success
    ).toBe(false);
  });

  it("accepts optional build-time SRE speech (ADR 0089)", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({
        ...minValid,
        speech: "lambda sub peak equals b times T to the negative 1 power",
      }).success
    ).toBe(true);
  });

  it("rejects empty speech", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({ ...minValid, speech: "" }).success
    ).toBe(false);
  });

  it("inherits id/title/tags/version from RegistryBaseSchema", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({
        ...minValid,
        tags: ["thermal"],
        version: "1",
      }).success
    ).toBe(true);
  });

  it("accepts a full entry with all optional fields", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({
        ...minValid,
        constants: [
          {
            symbol: "b",
            value: "0.29",
            unit: "cm·K",
            name: "Wien's displacement constant",
          },
        ],
        rearranged_forms: [
          {
            tex: "T = b\\,\\lambda_{peak}^{-1}",
            solves_for: "T",
            label: "Temperature from peak wavelength",
          },
        ],
        related: [
          {
            refId: "stefan-boltzmann",
            kind: "see-also",
            description: "Both connect temperature to thermal emission.",
          },
          {
            refId: "planck-distribution",
            kind: "derives-from",
          },
        ],
        tags: ["thermal", "spectroscopy"],
        version: "1",
      }).success
    ).toBe(true);
  });

  it("rejects unknown keys (.strict())", () => {
    expect(
      EquationRegistryEntrySchema.safeParse({
        ...minValid,
        // typo: "constant" instead of "constants"
        constant: [{ symbol: "b", value: "0.29" }],
      }).success
    ).toBe(false);
  });
});
