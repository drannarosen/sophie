import type { Objective } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ObjectivesSection } from "./ObjectivesSection.tsx";

const FIXTURE: Objective[] = [
  {
    id: "lo-1",
    verb: "Infer",
    body: "physical properties from constrained observations.",
    assessed_by: ["midterm-1", "final-exam"],
  },
  {
    id: "lo-2",
    verb: "Pressure-test",
    body: "simplified models by naming their assumptions.",
  },
];

describe("<ObjectivesSection>", () => {
  it("renders a labeled <section> landmark (R10: nested under page <main>)", () => {
    const { container } = render(<ObjectivesSection objectives={FIXTURE} />);
    const region = container.querySelector("section");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-labelledby");
  });

  it("renders the section title as the labelled heading", () => {
    render(<ObjectivesSection objectives={FIXTURE} />);
    expect(
      screen.getByRole("heading", { name: /Course Objectives/i })
    ).toBeInTheDocument();
  });

  it("renders each objective's verb + body", () => {
    render(<ObjectivesSection objectives={FIXTURE} />);
    expect(screen.getByText(/Infer/)).toBeInTheDocument();
    expect(
      screen.getByText(/physical properties from constrained observations/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Pressure-test/)).toBeInTheDocument();
  });

  it("renders 'assessed by' badges when populated", () => {
    render(<ObjectivesSection objectives={FIXTURE} />);
    expect(screen.getByText(/midterm-1/)).toBeInTheDocument();
    expect(screen.getByText(/final-exam/)).toBeInTheDocument();
  });

  it("does not render an empty assessed_by row when the field is absent", () => {
    const { container } = render(
      <ObjectivesSection objectives={[FIXTURE[1] as Objective]} />
    );
    expect(container.textContent).not.toMatch(/assessed by/i);
  });

  it("has zero axe violations", async () => {
    const { container } = render(<ObjectivesSection objectives={FIXTURE} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
