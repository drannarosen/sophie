import { describe, expect, test } from "vitest";
import { slugify } from "./slugify.ts";

describe("slugify (pure)", () => {
  test("converts a single ASCII word to lowercase", () => {
    expect(slugify("Parallax")).toBe("parallax");
  });

  test("converts a phrase with spaces to hyphenated slug", () => {
    expect(slugify("Standard candle")).toBe("standard-candle");
  });

  test("strips trailing punctuation", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  test("collapses internal whitespace + punctuation into single hyphens", () => {
    expect(slugify("Wavelength (λ)")).toBe("wavelength");
  });

  test("normalizes accented characters via NFKD", () => {
    expect(slugify("café")).toBe("cafe");
  });

  test("trims leading + trailing whitespace and hyphens", () => {
    expect(slugify("  foo  bar  ")).toBe("foo-bar");
    expect(slugify("--leading--")).toBe("leading");
  });

  test("preserves digits", () => {
    expect(slugify("Spoiler 10")).toBe("spoiler-10");
  });

  test("returns the fallback 'term' for empty input", () => {
    expect(slugify("")).toBe("term");
  });

  test("returns 'term' when input has no alphanumeric content", () => {
    expect(slugify("!!!")).toBe("term");
    expect(slugify("---")).toBe("term");
  });

  test("is deterministic — same input always returns same slug", () => {
    const inputs = ["Parallax", "Standard candle", "café", "Spoiler 10"];
    for (const input of inputs) {
      expect(slugify(input)).toBe(slugify(input));
    }
  });
});
