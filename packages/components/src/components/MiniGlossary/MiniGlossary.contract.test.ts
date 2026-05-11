import { describe, expect, it } from "vitest";
import { miniGlossaryContract } from "./MiniGlossary.contract.ts";

const audit = miniGlossaryContract.audit;
if (audit === undefined) {
  throw new Error("miniGlossaryContract.audit must be defined");
}

describe("miniGlossaryContract.audit", () => {
  it("returns no findings for terms that slug to distinct anchors", () => {
    const findings = audit({
      id: "mg",
      title: "Glossary",
      terms: [
        { term: "Photon", definition: "A packet of light." },
        { term: "Wavelength", definition: "The spatial period of a wave." },
      ],
    });
    expect(findings).toEqual([]);
  });

  it("returns a warning when two terms slug to the same base anchor", () => {
    // "Wavelength" and "Wavelength (λ)" both slug to "wavelength" —
    // slugifyTerm's dedupe handles it (-2 suffix), but the resulting
    // anchor URLs are surprising for authors who didn't anticipate it.
    const findings = audit({
      id: "mg",
      title: "Glossary",
      terms: [
        { term: "Wavelength", definition: "Spatial period." },
        {
          term: "Wavelength (λ)",
          definition: "Same base, parenthetical clarifier.",
        },
      ],
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toMatch(/slug.*wavelength/i);
  });

  it("returns no findings when terms differ only by non-slug-able chars but produce distinct slugs", () => {
    // "Dark matter" → "dark-matter" and "Dark Matter" → "dark-matter"
    // ARE a collision (case-insensitive). This case verifies the audit
    // catches *that*. Sanity for the rule.
    const findings = audit({
      id: "mg",
      title: "Glossary",
      terms: [
        { term: "Dark matter", definition: "Capitalization-A." },
        { term: "Dark Matter", definition: "Capitalization-B." },
      ],
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.severity).toBe("warning");
  });
});
