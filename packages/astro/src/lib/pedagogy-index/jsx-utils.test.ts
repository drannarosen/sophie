import { describe, expect, it } from "vitest";
import { choiceSlug, extractPlainText, extractSlugText } from "./jsx-utils.ts";

/**
 * `extractSlugText` is the math-aware sibling of `extractPlainText`
 * (which stays math-blind per ADR 0038 for searchable prompt
 * summaries). The live bug it fixes: two math-only MCQ choices
 * (`$n=2\to n=1$`, `$n=3\to n=2$`) both slug to `""` under
 * `extractPlainText` → `slugify("") = "term"` collision in
 * `collectChoices`. `extractSlugText` concatenates the LaTeX source so
 * the slugs are distinct.
 */

const text = (value: string) => ({ type: "text", value });
const inlineMath = (value: string) => ({ type: "inlineMath", value });
const displayMath = (value: string) => ({ type: "math", value });

const choice = (children: ReadonlyArray<unknown>, id?: string) => ({
  type: "mdxJsxFlowElement",
  name: "MCQ.Choice",
  attributes: id ? [{ type: "mdxJsxAttribute", name: "id", value: id }] : [],
  children,
});

describe("extractSlugText", () => {
  it("concatenates text + inlineMath + math leaf values", () => {
    const node = {
      type: "paragraph",
      children: [text("decay "), inlineMath("n=2\\to n=1"), displayMath("E")],
    };
    expect(extractSlugText(node)).toBe("decay n=2\\to n=1E");
  });

  it("returns LaTeX source for a math-only subtree (extractPlainText returns empty)", () => {
    const node = {
      type: "paragraph",
      children: [inlineMath("n=2\\to n=1")],
    };
    expect(extractPlainText(node)).toBe("");
    expect(extractSlugText(node)).toBe("n=2\\to n=1");
  });
});

describe("choiceSlug — math-only choices get distinct slugs", () => {
  it("slugs two math-only choices distinctly (the live duplicate-slug bug)", () => {
    const a = choice([inlineMath("n=2\\to n=1")]);
    const b = choice([inlineMath("n=3\\to n=2")]);
    const slugA = choiceSlug(a);
    const slugB = choiceSlug(b);
    expect(slugA).toBe("n-2-to-n-1");
    expect(slugB).toBe("n-3-to-n-2");
    expect(slugA).not.toBe(slugB);
    expect(slugA).not.toBe("");
    expect(slugB).not.toBe("");
  });

  it("an explicit id attr wins over slugified text", () => {
    const node = choice([text("Gravity")], "g");
    expect(choiceSlug(node)).toBe("g");
  });

  it("falls back to slugified text when no id", () => {
    const node = choice([text("Pressure gradient")]);
    expect(choiceSlug(node)).toBe("pressure-gradient");
  });
});
