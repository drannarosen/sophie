import type { Grading } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { GradingTable } from "./GradingTable.tsx";

const FIXTURE: Grading = {
  categories: [
    { id: "homework", name: "Problem sets", weight: 0.3, drop_lowest: 1 },
    { id: "growth-memos", name: "Growth memos", weight: 0.1 },
    { id: "final-exam", name: "Final exam", weight: 0.2 },
  ],
  letter_scale: [
    { grade: "A", min: 93 },
    { grade: "B", min: 83 },
    { grade: "C", min: 73 },
    { grade: "F", min: 0 },
  ],
};

describe("<GradingTable>", () => {
  it("renders a labeled <section> landmark (R10)", () => {
    const { container } = render(<GradingTable grading={FIXTURE} />);
    const region = container.querySelector("section");
    expect(region).toHaveAttribute("aria-labelledby");
  });

  it("renders each category with name + percent weight", () => {
    render(<GradingTable grading={FIXTURE} />);
    expect(screen.getByText(/Problem sets/)).toBeInTheDocument();
    expect(screen.getByText(/30%/)).toBeInTheDocument();
    expect(screen.getByText(/Growth memos/)).toBeInTheDocument();
    expect(screen.getByText(/10%/)).toBeInTheDocument();
  });

  it("shows drop_lowest annotation when present", () => {
    render(<GradingTable grading={FIXTURE} />);
    expect(screen.getByText(/drop.*lowest/i)).toBeInTheDocument();
  });

  it("renders the letter-grade scale as a table", () => {
    const { container } = render(<GradingTable grading={FIXTURE} />);
    const tables = container.querySelectorAll("table");
    // One table for categories, one for letter scale (could be combined; assert ≥1)
    expect(tables.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/93/)).toBeInTheDocument();
    expect(screen.getByText(/83/)).toBeInTheDocument();
  });

  it("has zero axe violations", async () => {
    const { container } = render(<GradingTable grading={FIXTURE} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
