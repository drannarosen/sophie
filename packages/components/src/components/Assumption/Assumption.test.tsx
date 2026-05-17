import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  ASSUMPTION_EPISTEMIC_ROLE,
  AssumptionPropsSchema,
} from "./Assumption.schema.ts";
import { Assumption } from "./Assumption.tsx";

describe("<Assumption> — schema", () => {
  it("accepts the minimum-valid props (children only)", () => {
    expect(
      AssumptionPropsSchema.safeParse({ children: "Body prose." }).success
    ).toBe(true);
  });

  it("accepts optional `type` slug (free-form at v1 per design §F1)", () => {
    expect(
      AssumptionPropsSchema.safeParse({
        type: "thermal-equilibrium",
        children: "x",
      }).success
    ).toBe(true);
  });

  it("rejects a non-Slug `type` (uppercase / spaces)", () => {
    expect(
      AssumptionPropsSchema.safeParse({
        type: "Thermal Equilibrium",
        children: "x",
      }).success
    ).toBe(false);
  });
});

describe("ASSUMPTION_EPISTEMIC_ROLE", () => {
  it("exports the canonical 'assumption' role string from ADR 0058's taxonomy", () => {
    expect(ASSUMPTION_EPISTEMIC_ROLE).toBe("assumption");
  });
});

describe("<Assumption> — render", () => {
  it("renders the 'Assumption' label", () => {
    render(<Assumption>Body prose</Assumption>);
    expect(screen.getByText("Assumption")).toBeInTheDocument();
  });

  it("renders the optional `type` slug next to the label when supplied", () => {
    render(<Assumption type='thermal-equilibrium'>Body</Assumption>);
    expect(screen.getByText("Assumption")).toBeInTheDocument();
    expect(screen.getByText("thermal-equilibrium")).toBeInTheDocument();
  });

  it("omits the `type` slug when not supplied", () => {
    render(<Assumption>Body</Assumption>);
    expect(screen.queryByText(/-/)).not.toBeInTheDocument();
  });

  it("renders the body children verbatim", () => {
    render(
      <Assumption type='blackbody'>
        <p>Source emits as an ideal blackbody.</p>
      </Assumption>
    );
    expect(
      screen.getByText("Source emits as an ideal blackbody.")
    ).toBeInTheDocument();
  });

  it("exposes data-epistemic-role='assumption' for E2E + extractor hooks", () => {
    const { container } = render(<Assumption>Body</Assumption>);
    expect(
      container.querySelector('[data-epistemic-role="assumption"]')
    ).not.toBeNull();
  });

  it("exposes data-assumption-type when `type` supplied (audit hook)", () => {
    const { container } = render(
      <Assumption type='thermal-equilibrium'>Body</Assumption>
    );
    expect(
      container.querySelector('[data-assumption-type="thermal-equilibrium"]')
    ).not.toBeNull();
  });

  it("does NOT emit data-assumption-type when `type` is absent (locked contract — React drops undefined props, but verify here so a refactor emitting '' slips loudly)", () => {
    const { container } = render(<Assumption>Body</Assumption>);
    expect(container.querySelector("[data-assumption-type]")).toBeNull();
  });

  it("uses <aside role='note'> as the landmark", () => {
    render(<Assumption>Body</Assumption>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("has no axe-core violations (untyped form)", async () => {
    const { container } = render(
      <Assumption>
        <p>Source is in local thermodynamic equilibrium.</p>
      </Assumption>
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("has no axe-core violations (typed form)", async () => {
    const { container } = render(
      <Assumption type='blackbody'>
        <p>Source emits as an ideal blackbody.</p>
      </Assumption>
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
