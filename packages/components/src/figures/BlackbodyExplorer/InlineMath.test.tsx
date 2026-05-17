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
    const { container } = render(<InlineMath>{String.raw`E = mc^2`}</InlineMath>);
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

  test("sets aria-label to the LaTeX source for screen readers", () => {
    const tex = String.raw`B_\lambda(T)`;
    const { container } = render(<InlineMath>{tex}</InlineMath>);
    const span = container.querySelector("span[aria-label]");
    expect(span?.getAttribute("aria-label")).toBe(tex);
  });
});
