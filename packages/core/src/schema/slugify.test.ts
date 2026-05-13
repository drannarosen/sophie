import { describe, expect, test } from "vitest";
import { slugify, slugifyWithCollisions } from "./slugify.ts";

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

describe("slugifyWithCollisions", () => {
  test("first occurrence returns base slug", () => {
    const seen = new Map<string, number>();
    expect(slugifyWithCollisions("Parallax", seen)).toBe("parallax");
  });

  test("second occurrence appends -2", () => {
    const seen = new Map<string, number>();
    slugifyWithCollisions("Parallax", seen);
    expect(slugifyWithCollisions("Parallax", seen)).toBe("parallax-2");
  });

  test("third occurrence appends -3", () => {
    const seen = new Map<string, number>();
    slugifyWithCollisions("Parallax", seen);
    slugifyWithCollisions("Parallax", seen);
    expect(slugifyWithCollisions("Parallax", seen)).toBe("parallax-3");
  });

  test("distinct bases on the same map are tracked independently", () => {
    const seen = new Map<string, number>();
    expect(slugifyWithCollisions("Parallax", seen)).toBe("parallax");
    expect(slugifyWithCollisions("Standard candle", seen)).toBe(
      "standard-candle"
    );
    expect(slugifyWithCollisions("Parallax", seen)).toBe("parallax-2");
    expect(slugifyWithCollisions("Standard candle", seen)).toBe(
      "standard-candle-2"
    );
  });

  test("mutates the seen map with the current count", () => {
    const seen = new Map<string, number>();
    slugifyWithCollisions("Parallax", seen);
    expect(seen.get("parallax")).toBe(1);
    slugifyWithCollisions("Parallax", seen);
    expect(seen.get("parallax")).toBe(2);
  });

  test("agrees with `slugify` on the first occurrence's base", () => {
    const inputs = ["Standard candle", "Wavelength (λ)", "café"];
    for (const input of inputs) {
      const isolated = new Map<string, number>();
      expect(slugifyWithCollisions(input, isolated)).toBe(slugify(input));
    }
  });

  test("inherits the 'term' fallback for empty/non-alphanumeric input", () => {
    const seen = new Map<string, number>();
    expect(slugifyWithCollisions("", seen)).toBe("term");
    expect(slugifyWithCollisions("!!!", seen)).toBe("term-2");
  });
});
