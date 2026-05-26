import type { CourseSpec } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetCourseSpecStoreForTesting,
  __setCourseSpec,
} from "../../runtime/course-spec-store.ts";
import { Points } from "./Points.tsx";

const FIXTURE_SPEC = {
  identity: { id: "test-101" },
  grading: {
    categories: [
      { id: "homework", name: "Problem sets", weight: 0.3 },
      { id: "final-exam", name: "Final exam", weight: 0.2 },
    ],
    letter_scale: [{ grade: "A", min: 93 }],
  },
} as unknown as CourseSpec;

beforeEach(() => {
  __setCourseSpec(FIXTURE_SPEC);
});

afterEach(() => {
  __resetCourseSpecStoreForTesting();
});

describe("<Points>", () => {
  it("renders the category name from the spec", () => {
    render(<Points category='homework' />);
    expect(screen.getByText(/Problem sets/)).toBeInTheDocument();
  });

  it("renders the weight as a percent", () => {
    render(<Points category='homework' />);
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  it("renders the explicit value when supplied", () => {
    render(<Points category='homework' value={20} />);
    expect(screen.getByText(/20.*pts|points/i)).toBeInTheDocument();
  });

  it("renders without crashing when value is omitted", () => {
    expect(() => render(<Points category='homework' />)).not.toThrow();
  });

  it("throws a curated error when category does not exist in the spec", () => {
    expect(() => render(<Points category='nonexistent' />)).toThrow(
      /nonexistent/
    );
  });

  it("inline-element by default (not a block-level region)", () => {
    const { container } = render(<Points category='homework' />);
    // Component is inline chrome — no <section> landmark needed.
    expect(container.querySelector("section")).toBeNull();
  });

  it("has zero axe violations", async () => {
    const { container } = render(<Points category='homework' value={20} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("renders a data-points-category attribute for styling/probes", () => {
    const { container } = render(<Points category='homework' />);
    const el = container.querySelector("[data-points-category]");
    expect(el?.getAttribute("data-points-category")).toBe("homework");
  });
});
