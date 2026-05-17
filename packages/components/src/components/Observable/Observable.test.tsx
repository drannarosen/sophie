import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  OBSERVABLE_EPISTEMIC_ROLE,
  ObservablePropsSchema,
} from "./Observable.schema.ts";
import { Observable } from "./Observable.tsx";

describe("<Observable> — schema", () => {
  it("accepts the minimum-valid props (children only)", () => {
    expect(
      ObservablePropsSchema.safeParse({
        children: "Peak wavelength of thermal emission.",
      }).success
    ).toBe(true);
  });
});

describe("OBSERVABLE_EPISTEMIC_ROLE", () => {
  it("exports the canonical 'observable' role string from ADR 0058's taxonomy", () => {
    // `as const satisfies EpistemicRole` guarantees this matches the
    // canonical 8-role taxonomy at compile time; this runtime assertion
    // documents the contract for consumers that import the const.
    expect(OBSERVABLE_EPISTEMIC_ROLE).toBe("observable");
  });
});

describe("<Observable> — render", () => {
  it("renders the 'Observable' label as the aria-labelledby target", () => {
    render(<Observable>Body prose</Observable>);
    expect(screen.getByText("Observable")).toBeInTheDocument();
  });

  it("renders the body children verbatim", () => {
    render(
      <Observable>
        <p>Peak wavelength of thermal emission.</p>
      </Observable>
    );
    expect(
      screen.getByText("Peak wavelength of thermal emission.")
    ).toBeInTheDocument();
  });

  it("uses <aside role='note'> as the landmark (biography metadata is tangential to the equation body)", () => {
    render(<Observable>Body</Observable>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("exposes data-epistemic-role='observable' for E2E + extractor hooks (ADR 0058 §2 pattern 3)", () => {
    const { container } = render(<Observable>Body</Observable>);
    expect(
      container.querySelector('[data-epistemic-role="observable"]')
    ).not.toBeNull();
  });

  it("isolates aria-labelledby ids between two instances (no cross-talk)", () => {
    const { container } = render(
      <>
        <Observable>Alpha</Observable>
        <Observable>Beta</Observable>
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

  it("has no axe-core accessibility violations", async () => {
    const { container } = render(
      <Observable>
        <p>Peak wavelength of thermal emission as a function of temperature.</p>
      </Observable>
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
