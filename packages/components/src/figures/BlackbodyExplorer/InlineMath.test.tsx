import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { InlineMath } from "./InlineMath.tsx";

describe("<InlineMath>", () => {
  test("renders LaTeX source as KaTeX HTML in an inline span", () => {
    const { container } = render(
      <InlineMath>{String.raw`\lambda_\text{peak} = 502\,\mathrm{nm}`}</InlineMath>
    );
    const katexEl = container.querySelector(".katex");
    expect(katexEl).not.toBeNull();
    // Sanity: the rendered text contains the numeric value (KaTeX wraps each
    // digit in its own span, so the assertion is on textContent, not getByText).
    expect(container.textContent).toMatch(/502/);
  });

  test("renders in inline (not display) mode by default", () => {
    const { container } = render(<InlineMath>E = mc^2</InlineMath>);
    // KaTeX display mode emits .katex-display; inline mode does not.
    expect(container.querySelector(".katex-display")).toBeNull();
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  test("invalid LaTeX renders gracefully (throwOnError: false)", () => {
    const { container } = render(
      <InlineMath>{String.raw`\invalid{`}</InlineMath>
    );
    // KaTeX emits .katex-error spans for parse failures when throwOnError is
    // off; the component must not throw or unmount.
    expect(container.querySelector(".katex-error, .katex")).not.toBeNull();
  });

  test("emits KaTeX MathML annotation for screen readers (not aria-label)", () => {
    // KaTeX `output: "html"` emits both a visual `.katex-html` block and a
    // hidden `.katex-mathml` block consumed by AT. Per ADR 0004 + EquationRef
    // precedent, we let MathML do the screen-reader work — adding aria-label
    // on a bare <span> with no role is prohibited by WAI-ARIA (axe-core
    // aria-prohibited-attr) and would shadow the richer MathML structure.
    const tex = String.raw`B_\lambda(T)`;
    const { container } = render(<InlineMath>{tex}</InlineMath>);
    expect(container.querySelector(".katex-mathml")).not.toBeNull();
    expect(container.querySelector(".katex-mathml math")).not.toBeNull();
    // No aria-label on the wrapping span (would be aria-prohibited-attr).
    expect(container.querySelector("span[aria-label]")).toBeNull();
  });
});
