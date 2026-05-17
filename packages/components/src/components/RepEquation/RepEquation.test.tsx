import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { RepEquationPropsSchema } from "./RepEquation.schema.ts";
import { RepEquation } from "./RepEquation.tsx";

describe("<RepEquation>", () => {
  it("renders the refKey + symbol with the equation role pill", () => {
    render(<RepEquation refKey='kepler-3rd-law' symbol='r' />);
    expect(screen.getByText("equation")).toBeInTheDocument();
    expect(screen.getByText("kepler-3rd-law")).toBeInTheDocument();
    expect(screen.getByText("r")).toBeInTheDocument();
  });

  it("does not render the equivalent-form footnote when equivalent_to is absent", () => {
    render(<RepEquation refKey='kepler-3rd-law' symbol='r' />);
    expect(screen.queryByText(/equivalent to/i)).not.toBeInTheDocument();
  });

  it("renders the equivalent_to footnote when declared", () => {
    render(
      <RepEquation
        refKey='wiens-law-frequency'
        symbol='\nu_{peak}'
        equivalent_to='wiens-law-wavelength'
      />
    );
    expect(screen.getByText(/equivalent to/i)).toBeInTheDocument();
    expect(screen.getByText("wiens-law-wavelength")).toBeInTheDocument();
  });

  it("renders the via slug when both equivalent_to and via are declared", () => {
    render(
      <RepEquation
        refKey='wiens-law-frequency'
        symbol='\nu_{peak}'
        equivalent_to='wiens-law-wavelength'
        via='planck-substitution'
      />
    );
    expect(screen.getByText("planck-substitution")).toBeInTheDocument();
  });

  it("does not render `via` text when equivalent_to is absent (via alone is meaningless)", () => {
    render(<RepEquation refKey='k' symbol='r' via='planck-substitution' />);
    // The component only surfaces `via` inside the equivalent_to footnote
    // block; in isolation it's silently ignored at render (schema still
    // accepts it as an independent optional field).
    expect(screen.queryByText("planck-substitution")).not.toBeInTheDocument();
  });

  it("carries data-rep-kind='equation' for extractor + audit lookups", () => {
    const { container } = render(<RepEquation refKey='k' symbol='r' />);
    expect(
      container.querySelector("[data-rep-kind='equation']")
    ).not.toBeNull();
  });

  it("passes axe accessibility checks", async () => {
    const { container } = render(
      <RepEquation
        refKey='kepler-3rd-law'
        symbol='r'
        equivalent_to='kepler-3rd-law-au-form'
        via='natural-units-substitution'
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("RepEquationPropsSchema", () => {
  it("accepts the minimum-valid props (refKey + symbol)", () => {
    const result = RepEquationPropsSchema.safeParse({
      refKey: "kepler-3rd-law",
      symbol: "r",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the full equivalent-form shape", () => {
    const result = RepEquationPropsSchema.safeParse({
      refKey: "wiens-law-frequency",
      symbol: "\\nu_{peak}",
      equivalent_to: "wiens-law-wavelength",
      via: "planck-substitution",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(RepEquationPropsSchema.safeParse({ refKey: "k" }).success).toBe(
      false
    );
    expect(RepEquationPropsSchema.safeParse({ symbol: "r" }).success).toBe(
      false
    );
  });

  it("rejects empty refKey or symbol", () => {
    expect(
      RepEquationPropsSchema.safeParse({ refKey: "", symbol: "r" }).success
    ).toBe(false);
    expect(
      RepEquationPropsSchema.safeParse({ refKey: "k", symbol: "" }).success
    ).toBe(false);
  });
});
