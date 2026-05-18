import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  DERIVATION_STEP_EPISTEMIC_ROLE,
  DerivationStepPropsSchema,
} from "./DerivationStep.schema.ts";
import { DerivationStep } from "./DerivationStep.tsx";

describe("<DerivationStep> — schema", () => {
  it("accepts the minimum-valid props (children only)", () => {
    expect(
      DerivationStepPropsSchema.safeParse({
        children: "Differentiate with respect to wavelength.",
      }).success
    ).toBe(true);
  });

  it("accepts an optional label", () => {
    expect(
      DerivationStepPropsSchema.safeParse({
        children: "x",
        label: "Differentiate and set to zero",
      }).success
    ).toBe(true);
  });

  it("rejects an empty label string", () => {
    expect(
      DerivationStepPropsSchema.safeParse({
        children: "x",
        label: "",
      }).success
    ).toBe(false);
  });
});

describe("DERIVATION_STEP_EPISTEMIC_ROLE", () => {
  it("exports the canonical 'model' role string from ADR 0058's taxonomy (per ADR 0046 §R9)", () => {
    expect(DERIVATION_STEP_EPISTEMIC_ROLE).toBe("model");
  });
});

describe("<DerivationStep> — render", () => {
  it("renders 'Step' as the aria-labelledby target", () => {
    render(<DerivationStep>Body prose</DerivationStep>);
    expect(screen.getByText("Step")).toBeInTheDocument();
  });

  it("renders the body children verbatim", () => {
    render(
      <DerivationStep>
        <p>Solve the transcendental equation for the peak.</p>
      </DerivationStep>
    );
    expect(
      screen.getByText("Solve the transcendental equation for the peak.")
    ).toBeInTheDocument();
  });

  it("renders the optional label next to 'Step' with a separator when supplied", () => {
    render(
      <DerivationStep label='Differentiate and set to zero'>
        Body
      </DerivationStep>
    );
    expect(screen.getByText("Step")).toBeInTheDocument();
    expect(
      screen.getByText("Differentiate and set to zero")
    ).toBeInTheDocument();
  });

  it("omits the separator + label slot entirely when label is undefined", () => {
    const { container } = render(<DerivationStep>Body</DerivationStep>);
    // Only the 'Step' marker appears in the header — no separator
    // (· glyph is aria-hidden but renders in the DOM when label is set).
    expect(container.textContent).not.toContain("·");
  });

  it("uses <aside role='note'> as the landmark (biography metadata is tangential to the equation body)", () => {
    render(<DerivationStep>Body</DerivationStep>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("exposes data-epistemic-role='model' for E2E + extractor hooks (ADR 0058 §2 pattern 3)", () => {
    const { container } = render(<DerivationStep>Body</DerivationStep>);
    expect(
      container.querySelector('[data-epistemic-role="model"]')
    ).not.toBeNull();
  });

  it("exposes data-derivation-label when label is supplied (extractor hook)", () => {
    const { container } = render(
      <DerivationStep label="Start from Planck's law">Body</DerivationStep>
    );
    expect(
      container.querySelector(
        '[data-derivation-label="Start from Planck\'s law"]'
      )
    ).not.toBeNull();
  });

  it("isolates aria-labelledby ids between two instances (no cross-talk)", () => {
    const { container } = render(
      <>
        <DerivationStep>Alpha</DerivationStep>
        <DerivationStep>Beta</DerivationStep>
      </>
    );
    const asides = container.querySelectorAll('[role="note"]');
    expect(asides.length).toBe(2);
    const idA = asides[0]?.getAttribute("aria-labelledby");
    const idB = asides[1]?.getAttribute("aria-labelledby");
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });

  it("has no axe-core accessibility violations (without label)", async () => {
    const { container } = render(
      <DerivationStep>
        <p>Solve the transcendental equation.</p>
      </DerivationStep>
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("has no axe-core accessibility violations (with label)", async () => {
    const { container } = render(
      <DerivationStep label='Differentiate and set to zero'>
        <p>Solve the transcendental equation.</p>
      </DerivationStep>
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
