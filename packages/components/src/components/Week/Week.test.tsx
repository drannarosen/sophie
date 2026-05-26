import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Week } from "./Week.tsx";

describe("<Week>", () => {
  it("renders 'Week N' with the supplied n", () => {
    const { container } = render(<Week n={4} />);
    expect(container.textContent).toMatch(/Week\s*4/);
  });

  it("inline-element (no landmark)", () => {
    const { container } = render(<Week n={1} />);
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders data-week-n for styling/probes", () => {
    const { container } = render(<Week n={4} />);
    expect(
      container.querySelector("[data-week-n]")?.getAttribute("data-week-n")
    ).toBe("4");
  });

  it("throws curated error when n is not a positive integer", () => {
    expect(() => render(<Week n={0} />)).toThrow(/positive/);
    expect(() => render(<Week n={-1} />)).toThrow(/positive/);
    expect(() => render(<Week n={2.5} />)).toThrow(/integer/);
  });

  it("has zero axe violations", async () => {
    const { container } = render(<Week n={4} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
