import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { UnitsPropsSchema } from "./Units.schema.ts";
import { Units } from "./Units.tsx";

describe("<Units> — schema", () => {
  it("accepts the minimum-valid props (symbol + unit)", () => {
    expect(UnitsPropsSchema.safeParse({ symbol: "T", unit: "K" }).success).toBe(
      true
    );
  });

  it("accepts a TeX-form symbol", () => {
    expect(
      UnitsPropsSchema.safeParse({
        symbol: "\\lambda_{peak}",
        unit: "cm",
      }).success
    ).toBe(true);
  });

  it("rejects empty symbol or unit (NonEmptyString)", () => {
    expect(UnitsPropsSchema.safeParse({ symbol: "", unit: "K" }).success).toBe(
      false
    );
    expect(UnitsPropsSchema.safeParse({ symbol: "T", unit: "" }).success).toBe(
      false
    );
  });
});

describe("<Units> — render", () => {
  it("renders the symbol and unit as a `symbol [unit]` pair", () => {
    render(<Units symbol='T' unit='K' />);
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("exposes data-units-symbol and data-units-unit for audit hooks", () => {
    const { container } = render(<Units symbol='T' unit='K' />);
    expect(container.querySelector('[data-units-symbol="T"]')).not.toBeNull();
    expect(container.querySelector('[data-units-unit="K"]')).not.toBeNull();
  });

  it("does NOT carry a data-epistemic-role (chrome, not epistemic content per ADR 0058)", () => {
    // ADR 0058 §"chrome": <Units> is descriptive metadata. Surfacing a
    // data-epistemic-role attribute here would suggest otherwise to the
    // extractor and E2E hooks — locked-out structurally.
    const { container } = render(<Units symbol='T' unit='K' />);
    expect(container.querySelector("[data-epistemic-role]")).toBeNull();
  });

  it("renders bracket characters as aria-hidden (purely decorative)", () => {
    // The brackets exist for visual grouping (`T [K]`); screen readers
    // should hear "T K" not "T left bracket K right bracket."
    const { container } = render(<Units symbol='T' unit='K' />);
    const brackets = container.querySelectorAll('[aria-hidden="true"]');
    expect(brackets.length).toBe(2);
  });

  it("has no axe-core violations (inline element with structured pair)", async () => {
    const { container } = render(<Units symbol='T' unit='K' />);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("has no axe-core violations with a TeX symbol", async () => {
    const { container } = render(<Units symbol='\\lambda_{peak}' unit='cm' />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
