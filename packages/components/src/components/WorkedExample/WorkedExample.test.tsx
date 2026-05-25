import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  WORKED_EXAMPLE_EPISTEMIC_ROLE,
  WorkedExamplePropsSchema,
  WorkedExampleStepPropsSchema,
} from "./WorkedExample.schema.ts";
import { WorkedExample } from "./WorkedExample.tsx";

const full = (
  <WorkedExample title='How Many Earths Fit in the Sun?' number={1}>
    <WorkedExample.Problem>
      The Sun's radius is 109× Earth's. How many fit inside?
    </WorkedExample.Problem>
    <WorkedExample.Step label='Volume scales as R-cubed'>
      The ratio is 109 cubed.
    </WorkedExample.Step>
    <WorkedExample.DimCheck>
      A ratio of two volumes is dimensionless.
    </WorkedExample.DimCheck>
    <WorkedExample.Result>About 1.3 million Earths.</WorkedExample.Result>
  </WorkedExample>
);

describe("<WorkedExample> — schema", () => {
  it("accepts minimum-valid root props (title + children)", () => {
    expect(
      WorkedExamplePropsSchema.safeParse({ title: "Earths", children: "x" })
        .success
    ).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(
      WorkedExamplePropsSchema.safeParse({ title: "", children: "x" }).success
    ).toBe(false);
  });

  it("accepts an optional positive-integer number", () => {
    expect(
      WorkedExamplePropsSchema.safeParse({
        title: "t",
        number: 1,
        children: "x",
      }).success
    ).toBe(true);
  });

  it("rejects a zero / non-integer number", () => {
    expect(
      WorkedExamplePropsSchema.safeParse({
        title: "t",
        number: 0,
        children: "x",
      }).success
    ).toBe(false);
    expect(
      WorkedExamplePropsSchema.safeParse({
        title: "t",
        number: 1.5,
        children: "x",
      }).success
    ).toBe(false);
  });

  it("Step accepts an optional label and rejects an empty one", () => {
    expect(
      WorkedExampleStepPropsSchema.safeParse({ children: "x" }).success
    ).toBe(true);
    expect(
      WorkedExampleStepPropsSchema.safeParse({ children: "x", label: "" })
        .success
    ).toBe(false);
  });
});

describe("WORKED_EXAMPLE_EPISTEMIC_ROLE", () => {
  it("is the canonical 'numerical' role (ADR 0058 / 0081)", () => {
    expect(WORKED_EXAMPLE_EPISTEMIC_ROLE).toBe("numerical");
  });
});

describe("<WorkedExample> — render", () => {
  it("renders as a region landmark named by its title (R10)", () => {
    render(full);
    expect(
      screen.getByRole("region", {
        name: /How Many Earths Fit in the Sun\?/,
      })
    ).toBeInTheDocument();
  });

  it("renders the kicker with the number", () => {
    render(full);
    expect(screen.getByText("Worked Example 1")).toBeInTheDocument();
  });

  it("omits the number from the kicker when absent", () => {
    render(
      <WorkedExample title='Untitled'>
        <WorkedExample.Result>r</WorkedExample.Result>
      </WorkedExample>
    );
    expect(screen.getByText("Worked Example")).toBeInTheDocument();
  });

  it("renders all four slot labels", () => {
    render(full);
    expect(screen.getByText("Problem")).toBeInTheDocument();
    expect(screen.getByText("Step")).toBeInTheDocument();
    expect(screen.getByText("Dimensional check")).toBeInTheDocument();
    expect(screen.getByText("Result")).toBeInTheDocument();
  });

  it("exposes data-epistemic-role='numerical' on the root", () => {
    const { container } = render(full);
    expect(
      container.querySelector('[data-epistemic-role="numerical"]')
    ).not.toBeNull();
  });

  it("exposes data-dim-check on the DimCheck slot (QB6 audit hook)", () => {
    const { container } = render(full);
    expect(container.querySelector('[data-dim-check="true"]')).not.toBeNull();
  });

  it("exposes data-step-label when a Step label is supplied", () => {
    const { container } = render(full);
    expect(
      container.querySelector('[data-step-label="Volume scales as R-cubed"]')
    ).not.toBeNull();
  });

  it("isolates aria-labelledby ids between two instances", () => {
    const { container } = render(
      <>
        <WorkedExample title='A'>
          <WorkedExample.Result>a</WorkedExample.Result>
        </WorkedExample>
        <WorkedExample title='B'>
          <WorkedExample.Result>b</WorkedExample.Result>
        </WorkedExample>
      </>
    );
    const regions = container.querySelectorAll("[aria-labelledby]");
    expect(regions.length).toBe(2);
    expect(regions[0]?.getAttribute("aria-labelledby")).not.toBe(
      regions[1]?.getAttribute("aria-labelledby")
    );
  });

  it("has no axe-core accessibility violations", async () => {
    const { container } = render(full);
    expect((await axe(container)).violations).toEqual([]);
  });
});
