import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Due } from "./Due.tsx";

describe("<Due>", () => {
  it("renders a formatted date when the date prop is supplied", () => {
    render(<Due date='2026-09-15' />);
    // Format is locale-aware; the year + month + day should all appear.
    const el = screen.getByText(/2026|Sep|9\/15/);
    expect(el).toBeInTheDocument();
  });

  it("renders the of-label when supplied (e.g. 'reading')", () => {
    render(<Due date='2026-09-15' of='reading' />);
    expect(screen.getByText(/reading/i)).toBeInTheDocument();
  });

  it("uses <time datetime> for semantic date markup", () => {
    const { container } = render(<Due date='2026-09-15' />);
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("datetime", "2026-09-15");
  });

  it("inline-element (no landmark)", () => {
    const { container } = render(<Due date='2026-09-15' />);
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders data-due-date for styling/probes", () => {
    const { container } = render(<Due date='2026-09-15' />);
    expect(
      container.querySelector("[data-due-date]")?.getAttribute("data-due-date")
    ).toBe("2026-09-15");
  });

  it("throws curated error on malformed date prop", () => {
    expect(() => render(<Due date='not-a-date' />)).toThrow(/date/i);
  });

  it("renders the same date string in <time datetime> regardless of host TZ (UTC-parse defense)", () => {
    // 2026-12-31 is the canonical hostile date — in US-eastern (UTC-5)
    // a naive `new Date('2026-12-31')` parses to UTC then localizes to
    // 2026-12-30 evening. The UTC-parse path in <Due> must round-trip
    // the same ISO string into the <time datetime> attribute.
    const { container } = render(<Due date='2026-12-31' />);
    const time = container.querySelector("time");
    expect(time?.getAttribute("datetime")).toBe("2026-12-31");
    // Formatted text should reflect Dec 31, not Dec 30.
    expect(time?.textContent ?? "").toMatch(/Dec.*31|31.*Dec/);
  });

  it("has zero axe violations", async () => {
    const { container } = render(<Due date='2026-09-15' of='homework' />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
