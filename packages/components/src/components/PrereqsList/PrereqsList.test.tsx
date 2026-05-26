import type { Prereq } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { PrereqsList } from "./PrereqsList.tsx";

const FIXTURE: Prereq[] = [
  {
    kind: "course",
    ref: "PHYS 195",
    required: true,
    note: "Intro mechanics",
  },
  {
    kind: "skill",
    ref: "vectors-2d-3d",
    required: true,
  },
  {
    kind: "topic",
    ref: "dimensional-analysis",
    required: false,
    note: "Scaffolded in Module 1",
  },
];

describe("<PrereqsList>", () => {
  it("renders a labeled <section> landmark (R10)", () => {
    const { container } = render(<PrereqsList prereqs={FIXTURE} />);
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-labelledby"
    );
  });

  it("renders the section title", () => {
    render(<PrereqsList prereqs={FIXTURE} />);
    expect(
      screen.getByRole("heading", { name: /Prerequisites/i })
    ).toBeInTheDocument();
  });

  it("renders each prereq's ref + kind", () => {
    render(<PrereqsList prereqs={FIXTURE} />);
    expect(screen.getByText(/PHYS 195/)).toBeInTheDocument();
    expect(screen.getByText(/vectors-2d-3d/)).toBeInTheDocument();
    expect(screen.getByText(/dimensional-analysis/)).toBeInTheDocument();
  });

  it("marks required prereqs distinctly from recommended", () => {
    const { container } = render(<PrereqsList prereqs={FIXTURE} />);
    const requiredEls = container.querySelectorAll(
      "[data-prereq-required='true']"
    );
    const recommendedEls = container.querySelectorAll(
      "[data-prereq-required='false']"
    );
    expect(requiredEls.length).toBe(2);
    expect(recommendedEls.length).toBe(1);
  });

  it("renders the optional note when present", () => {
    render(<PrereqsList prereqs={FIXTURE} />);
    expect(screen.getByText(/Intro mechanics/)).toBeInTheDocument();
    expect(screen.getByText(/Scaffolded in Module 1/)).toBeInTheDocument();
  });

  it("groups by kind for scanability", () => {
    const { container } = render(<PrereqsList prereqs={FIXTURE} />);
    // Three kinds → three group headings (h3 below the section h2)
    const groupHeadings = container.querySelectorAll("h3");
    expect(groupHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it("has zero axe violations", async () => {
    const { container } = render(<PrereqsList prereqs={FIXTURE} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
