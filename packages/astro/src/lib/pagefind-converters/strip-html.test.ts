import { describe, expect, test } from "vitest";
import { stripHtml } from "./strip-html.ts";

describe("stripHtml", () => {
  test("strips simple paragraph tags", () => {
    expect(stripHtml("<p>hello world</p>")).toBe("hello world");
  });

  test("strips KaTeX nested spans without merging words", () => {
    expect(
      stripHtml(
        '<span class="katex"><span class="katex-mathml">L</span><span class="base">L</span></span>'
      )
    ).toBe("L L");
  });

  test("collapses runs of whitespace from removed tags", () => {
    expect(stripHtml("<p>foo</p>  <p>bar</p>")).toBe("foo bar");
  });

  test("handles plain text unchanged", () => {
    expect(stripHtml("Total radiant power.")).toBe("Total radiant power.");
  });

  test("trims leading and trailing whitespace", () => {
    expect(stripHtml("   <p>x</p>   ")).toBe("x");
  });
});
