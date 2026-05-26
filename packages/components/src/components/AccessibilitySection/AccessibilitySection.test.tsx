import type { Accessibility } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { AccessibilitySection } from "./AccessibilitySection.tsx";

const FIXTURE: Accessibility = {
  drc_link: "https://sds.sdsu.edu",
  contact_email: "sds@sdsu.edu",
  request_deadline_weeks: 2,
  prose_ref: "prose/accommodations",
};

describe("<AccessibilitySection>", () => {
  it("renders a labeled <section> landmark (R10)", () => {
    const { container } = render(
      <AccessibilitySection accessibility={FIXTURE} />
    );
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-labelledby"
    );
  });

  it("renders the DRC link as an external link", () => {
    render(<AccessibilitySection accessibility={FIXTURE} />);
    const link = screen.getByRole("link", { name: /DRC|Disability/i });
    expect(link).toHaveAttribute("href", "https://sds.sdsu.edu");
  });

  it("renders the DRC contact email as a mailto link", () => {
    render(<AccessibilitySection accessibility={FIXTURE} />);
    const mailto = screen.getByRole("link", { name: /sds@sdsu.edu/ });
    expect(mailto).toHaveAttribute("href", "mailto:sds@sdsu.edu");
  });

  it("renders the request deadline as 'N weeks before'", () => {
    render(<AccessibilitySection accessibility={FIXTURE} />);
    expect(screen.getByText(/2.*week/i)).toBeInTheDocument();
  });

  it("renders a request deadline of 0 weeks without crashing", () => {
    const noWeeks = { ...FIXTURE, request_deadline_weeks: 0 };
    expect(() =>
      render(<AccessibilitySection accessibility={noWeeks} />)
    ).not.toThrow();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <AccessibilitySection accessibility={FIXTURE} />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
