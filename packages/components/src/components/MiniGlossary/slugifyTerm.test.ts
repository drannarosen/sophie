import { describe, expect, it } from "vitest";
import { slugifyTerm } from "./slugifyTerm.ts";

describe("slugifyTerm", () => {
  it("lowercases a single ASCII word", () => {
    const seen = new Map<string, number>();
    expect(slugifyTerm("Photon", seen)).toBe("photon");
  });

  it("strips non-ASCII characters via NFKD normalization and trim", () => {
    // "Wavelength (λ)" — λ normalizes under NFKD then is stripped as
    // non-alphanumeric; the trailing dash from "()" is trimmed.
    const seen = new Map<string, number>();
    expect(slugifyTerm("Wavelength (λ)", seen)).toBe("wavelength");
  });

  it("hyphenates internal whitespace and collapses runs", () => {
    const seen = new Map<string, number>();
    expect(slugifyTerm("Dark matter", seen)).toBe("dark-matter");
  });

  it("dedupes collisions by appending -2, -3, ... in call order", () => {
    const seen = new Map<string, number>();
    expect(slugifyTerm("Wavelength", seen)).toBe("wavelength");
    // Second term that slugs to the same base should get a -2 suffix.
    expect(slugifyTerm("Wavelength (λ)", seen)).toBe("wavelength-2");
  });

  it("falls back to 'term' when input contains no slug-able characters", () => {
    const seen = new Map<string, number>();
    expect(slugifyTerm("λ", seen)).toBe("term");
  });

  it("dedupes the 'term' fallback across multiple pathological inputs", () => {
    const seen = new Map<string, number>();
    expect(slugifyTerm("λ", seen)).toBe("term");
    expect(slugifyTerm("()", seen)).toBe("term-2");
  });
});
