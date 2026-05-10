import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { KeyEquation } from "./KeyEquation.tsx";

describe("<KeyEquation>", () => {
  it("renders the title as visible text and as an aria-labelledby region", () => {
    render(
      <KeyEquation id='wiens-law' title="Wien's Law">
        Body content
      </KeyEquation>
    );
    const region = screen.getByRole("region", { name: "Wien's Law" });
    expect(region).toBeInTheDocument();
    // The title is visible (not hidden inside aria-label only).
    expect(screen.getByText("Wien's Law")).toBeInTheDocument();
  });

  it("sets the outer DOM id to the prop value (hash-anchor support)", () => {
    const { container } = render(
      <KeyEquation id='inverse-square-law' title='Inverse-Square Law'>
        Body
      </KeyEquation>
    );
    // The outer element carries the author-supplied id so `#inverse-square-law`
    // hash navigation lands on this block.
    expect(container.querySelector("#inverse-square-law")).not.toBeNull();
  });

  it("renders children verbatim, including math-block markup", () => {
    render(
      <KeyEquation id='wiens-law' title="Wien's Law">
        <p>Framing prose</p>
        <span className='katex-display' data-testid='math'>
          λ_peak = b T⁻¹
        </span>
        <p>
          where <strong>b</strong> = 0.29 cm·K
        </p>
      </KeyEquation>
    );
    expect(screen.getByText("Framing prose")).toBeInTheDocument();
    expect(screen.getByTestId("math")).toHaveTextContent("λ_peak");
    expect(screen.getByText("b")).toBeInTheDocument();
  });

  it("uses <section role='region'>, not role='note' (substantive content landmark)", () => {
    render(
      <KeyEquation id='kep' title="Kepler's Third Law">
        Body
      </KeyEquation>
    );
    // role=region is asserted by the getByRole above (cycle 1), but make
    // the no-role-note assertion explicit so future refactors can't
    // silently downgrade the landmark.
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("isolates DOM ids between two instances (no cross-talk)", () => {
    const { container } = render(
      <>
        <KeyEquation id='alpha' title='Equation Alpha'>
          A
        </KeyEquation>
        <KeyEquation id='beta' title='Equation Beta'>
          B
        </KeyEquation>
      </>
    );
    expect(container.querySelector("#alpha")).not.toBeNull();
    expect(container.querySelector("#beta")).not.toBeNull();
    // The aria-labelledby ids are stable per-instance (useId) and do
    // NOT collide with each other.
    const alpha = container.querySelector("#alpha");
    const beta = container.querySelector("#beta");
    const alphaLabelId = alpha?.getAttribute("aria-labelledby");
    const betaLabelId = beta?.getAttribute("aria-labelledby");
    expect(alphaLabelId).toBeTruthy();
    expect(betaLabelId).toBeTruthy();
    expect(alphaLabelId).not.toBe(betaLabelId);
  });

  it("has no axe-core accessibility violations", async () => {
    const { container } = render(
      <KeyEquation id='axe-check' title='Axe Check'>
        <p>Body content</p>
        <p>
          where <strong>X</strong> is something
        </p>
      </KeyEquation>
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
