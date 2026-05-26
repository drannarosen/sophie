import type { CourseSpec } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetCourseSpecStoreForTesting,
  __setCourseSpec,
} from "../../runtime/course-spec-store.ts";
import { OfficeHoursChrome } from "./OfficeHoursChrome.tsx";

const FIXTURE_SPEC = {
  identity: { id: "test-101" },
  grading: { categories: [{ id: "hw", name: "HW", weight: 1.0 }] },
  office_hours: [
    {
      day: "Tuesday",
      start_time: "14:00",
      end_time: "15:30",
      location: "P-149",
      modality: "in-person",
      by_appointment: false,
    },
    {
      day: "Thursday",
      start_time: "10:00",
      end_time: "11:00",
      location: "Zoom",
      modality: "online",
      by_appointment: true,
    },
  ],
} as unknown as CourseSpec;

beforeEach(() => {
  __setCourseSpec(FIXTURE_SPEC);
});

afterEach(() => {
  __resetCourseSpecStoreForTesting();
});

describe("<OfficeHoursChrome>", () => {
  it("renders all office-hours slots from the spec", () => {
    render(<OfficeHoursChrome />);
    expect(screen.getByText(/Tuesday/)).toBeInTheDocument();
    expect(screen.getByText(/Thursday/)).toBeInTheDocument();
  });

  it("renders each slot's location", () => {
    render(<OfficeHoursChrome />);
    expect(screen.getByText(/P-149/)).toBeInTheDocument();
    expect(screen.getByText(/Zoom/)).toBeInTheDocument();
  });

  it("inline-element (no landmark)", () => {
    const { container } = render(<OfficeHoursChrome />);
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders a 'Office hours not set' notice when spec.office_hours is absent", () => {
    __setCourseSpec({
      ...FIXTURE_SPEC,
      office_hours: undefined,
    } as unknown as CourseSpec);
    render(<OfficeHoursChrome />);
    expect(screen.getByText(/not set|no office hours/i)).toBeInTheDocument();
  });

  it("has zero axe violations", async () => {
    const { container } = render(<OfficeHoursChrome />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
