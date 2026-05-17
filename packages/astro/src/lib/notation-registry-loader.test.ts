import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadConsumerRegistry,
  parseNotationRegistry,
  parsePedagogyContract,
} from "./notation-registry-loader.ts";

/**
 * Per ADR 0043 + 2026-05-17 design hardening §D7: the loader reads the
 * consumer repo's `notation-registry.yaml` and `pedagogy-contract.yaml`
 * at build time. Opt-in is gated by the contract's
 * `math_and_units_standards.notation_registry` field per ADR 0042.
 *
 * Pure parsers test text in isolation; the IO wrapper test exercises
 * a tmpdir fixture mirroring the smoke target's layout.
 */

describe("parsePedagogyContract", () => {
  it("returns optedIn=true when notation_registry is declared", () => {
    const text = `
course:
  slug: "smoke"
math_and_units_standards:
  notation_registry: "smoke"
`;
    expect(parsePedagogyContract(text)).toEqual({ optedIn: true });
  });

  it("returns optedIn=false when math_and_units_standards is absent", () => {
    const text = `
course:
  slug: "smoke"
`;
    expect(parsePedagogyContract(text)).toEqual({ optedIn: false });
  });

  it("returns optedIn=false when notation_registry sub-field is absent", () => {
    const text = `
course:
  slug: "smoke"
math_and_units_standards:
  require_units: true
`;
    expect(parsePedagogyContract(text)).toEqual({ optedIn: false });
  });

  it("returns optedIn=false when notation_registry is empty string", () => {
    // Per ADR 0042 the field is a course slug — empty means not opted in.
    const text = `
math_and_units_standards:
  notation_registry: ""
`;
    expect(parsePedagogyContract(text)).toEqual({ optedIn: false });
  });

  it("throws on invalid YAML", () => {
    expect(() =>
      parsePedagogyContract("course: smoke\n  bad-indent: x")
    ).toThrow();
  });
});

describe("parseNotationRegistry", () => {
  const minValid = `
version: "1"
course: "smoke"
last_updated: "2026-05-17"
concepts:
  - id: "orbital-radius"
    verbal_label: "orbital radius"
    canonical_symbol: "r"
    latex: "r"
`;

  it("parses a minimum-valid registry", () => {
    const registry = parseNotationRegistry(minValid);
    expect(registry.version).toBe("1");
    expect(registry.course).toBe("smoke");
    expect(registry.concepts).toHaveLength(1);
    expect(registry.concepts[0]).toMatchObject({
      id: "orbital-radius",
      verbal_label: "orbital radius",
      canonical_symbol: "r",
    });
  });

  it("parses optional epistemic_role (ADR 0058 binding via registry per design §D3)", () => {
    const text = `
version: "1"
course: "smoke"
last_updated: "2026-05-17"
concepts:
  - id: "apparent-magnitude"
    verbal_label: "apparent magnitude"
    canonical_symbol: "m"
    latex: "m"
    epistemic_role: "observable"
`;
    const registry = parseNotationRegistry(text);
    expect(registry.concepts[0]?.epistemic_role).toBe("observable");
  });

  it("parses common_confusions with nested concept_ref", () => {
    const text = `
version: "1"
course: "smoke"
last_updated: "2026-05-17"
concepts:
  - id: "apparent-magnitude"
    verbal_label: "apparent magnitude"
    canonical_symbol: "m"
    latex: "m"
    common_confusions:
      - symbol: "M"
        meaning: "absolute magnitude"
        concept_ref: "absolute-magnitude"
`;
    const registry = parseNotationRegistry(text);
    expect(registry.concepts[0]?.common_confusions?.[0]).toEqual({
      symbol: "M",
      meaning: "absolute magnitude",
      concept_ref: "absolute-magnitude",
    });
  });

  it("throws on invalid epistemic_role value", () => {
    const text = minValid.replace(
      'latex: "r"',
      `latex: "r"
    epistemic_role: "remediation"`
    );
    expect(() => parseNotationRegistry(text)).toThrow();
  });

  it("throws on missing required top-level fields", () => {
    const noVersion = minValid.replace(`version: "1"`, "");
    expect(() => parseNotationRegistry(noVersion)).toThrow();
  });

  it("throws on non-ISO last_updated", () => {
    const text = minValid.replace(
      `last_updated: "2026-05-17"`,
      `last_updated: "May 17, 2026"`
    );
    expect(() => parseNotationRegistry(text)).toThrow();
  });

  it("throws on non-kebab-case concept id", () => {
    const text = minValid.replace(
      `id: "orbital-radius"`,
      `id: "Orbital_Radius"`
    );
    expect(() => parseNotationRegistry(text)).toThrow();
  });
});

describe("loadConsumerRegistry (IO wrapper)", () => {
  let tmpRoot: string;
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "sophie-registry-loader-"));
  });
  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns registry=null + optedIn=false + contractFound=false when no contract file", () => {
    const result = loadConsumerRegistry(tmpRoot);
    expect(result).toEqual({
      registry: null,
      optedIn: false,
      contractFound: false,
    });
  });

  it("returns optedIn=false when contract present but doesn't declare notation_registry", () => {
    writeFileSync(
      join(tmpRoot, "pedagogy-contract.yaml"),
      `course:\n  slug: "x"\n`
    );
    const result = loadConsumerRegistry(tmpRoot);
    expect(result.optedIn).toBe(false);
    expect(result.contractFound).toBe(true);
    expect(result.registry).toBeNull();
  });

  it("returns parsed registry when contract opts in AND registry file exists", () => {
    writeFileSync(
      join(tmpRoot, "pedagogy-contract.yaml"),
      `math_and_units_standards:\n  notation_registry: "smoke"\n`
    );
    writeFileSync(
      join(tmpRoot, "notation-registry.yaml"),
      `version: "1"\ncourse: "smoke"\nlast_updated: "2026-05-17"\nconcepts:\n  - id: "x"\n    verbal_label: "x"\n    canonical_symbol: "X"\n    latex: "X"\n`
    );
    const result = loadConsumerRegistry(tmpRoot);
    expect(result.optedIn).toBe(true);
    expect(result.contractFound).toBe(true);
    expect(result.registry?.course).toBe("smoke");
    expect(result.registry?.concepts).toHaveLength(1);
  });

  it("throws when opted in but registry file is missing (loud failure per ADR 0043 §opt-in)", () => {
    writeFileSync(
      join(tmpRoot, "pedagogy-contract.yaml"),
      `math_and_units_standards:\n  notation_registry: "smoke"\n`
    );
    // No notation-registry.yaml written.
    expect(() => loadConsumerRegistry(tmpRoot)).toThrow(
      /notation-registry\.yaml/i
    );
  });

  it("returns registry=null + optedIn=true when registry parse fails — propagates the parse error", () => {
    writeFileSync(
      join(tmpRoot, "pedagogy-contract.yaml"),
      `math_and_units_standards:\n  notation_registry: "smoke"\n`
    );
    writeFileSync(
      join(tmpRoot, "notation-registry.yaml"),
      `version: "1"\n# missing required course + last_updated + concepts\n`
    );
    expect(() => loadConsumerRegistry(tmpRoot)).toThrow();
  });
});

// Suppress unused-import warning if mkdirSync ends up unused in this round.
void mkdirSync;
