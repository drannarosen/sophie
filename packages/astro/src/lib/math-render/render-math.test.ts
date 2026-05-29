import katex from "katex";
import { describe, expect, it } from "vitest";
import { renderMath } from "./render-math.ts";

describe("renderMath", () => {
  it("produces KaTeX HTML markup for a display equation", () => {
    expect(renderMath("R^2", { displayMode: true }).html).toContain(
      'class="katex"'
    );
  });

  it("produces a <math> MathML element", () => {
    expect(renderMath("R^2").mathml).toContain("<math");
  });

  it("is byte-identical to the current display-equation KaTeX output", () => {
    const latex = "F = G \\frac{m_1 m_2}{r^2}";
    const current = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
    expect(renderMath(latex, { displayMode: true }).html).toBe(current);
  });

  it("is byte-identical to the current inline-equation KaTeX output", () => {
    const latex = "c";
    const current = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
      output: "html",
    });
    expect(renderMath(latex, { displayMode: false }).html).toBe(current);
  });

  it("defaults displayMode to false", () => {
    const latex = "x + y";
    const inline = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
      output: "html",
    });
    expect(renderMath(latex).html).toBe(inline);
  });

  it("does not throw on empty or whitespace latex (throwOnError:false)", () => {
    expect(() => renderMath("")).not.toThrow();
    expect(() => renderMath("   ")).not.toThrow();
    expect(typeof renderMath("").html).toBe("string");
    expect(typeof renderMath("").mathml).toBe("string");
  });

  it("memoizes by (latex, displayMode): same args return the same object", () => {
    const first = renderMath("E = mc^2", { displayMode: true });
    const second = renderMath("E = mc^2", { displayMode: true });
    expect(second).toBe(first);
  });

  it("keys the memo on displayMode (display and inline differ)", () => {
    const display = renderMath("a^2", { displayMode: true });
    const inline = renderMath("a^2", { displayMode: false });
    expect(display).not.toBe(inline);
    expect(display.html).not.toBe(inline.html);
  });
});
