import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Reading } from "./Reading.tsx";

describe("<Reading>", () => {
  it("renders the source citation", () => {
    render(<Reading source='Carroll & Ostlie §6.3' />);
    expect(screen.getByText(/Carroll & Ostlie/)).toBeInTheDocument();
  });

  it("renders pages when supplied", () => {
    render(<Reading source='Carroll & Ostlie' pages='247-260' />);
    expect(screen.getByText(/247.*260/)).toBeInTheDocument();
  });

  it("does not render a separate pages span when pages is omitted", () => {
    const { container } = render(<Reading source='Carroll & Ostlie' />);
    expect(container.querySelector("[data-reading-pages]")).toBeNull();
  });

  it("inline-element (no landmark)", () => {
    const { container } = render(<Reading source='X' />);
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders data-reading-source for styling/probes", () => {
    const { container } = render(<Reading source='Test' />);
    expect(
      container
        .querySelector("[data-reading-source]")
        ?.getAttribute("data-reading-source")
    ).toBe("Test");
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <Reading source='Carroll & Ostlie §6.3' pages='247-260' />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
