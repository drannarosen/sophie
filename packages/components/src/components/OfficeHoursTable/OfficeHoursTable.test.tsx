import type { OfficeHour } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { OfficeHoursTable } from "./OfficeHoursTable.tsx";

const FIXTURE: OfficeHour[] = [
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
    note: "Sign up via Calendly",
  },
];

describe("<OfficeHoursTable>", () => {
  it("renders a labeled <section> landmark (R10)", () => {
    const { container } = render(<OfficeHoursTable hours={FIXTURE} />);
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-labelledby"
    );
  });

  it("renders each office-hours slot's day + time range + location", () => {
    render(<OfficeHoursTable hours={FIXTURE} />);
    expect(screen.getByText(/Tuesday/)).toBeInTheDocument();
    expect(screen.getByText(/14:00.*15:30/)).toBeInTheDocument();
    expect(screen.getByText(/P-149/)).toBeInTheDocument();
    expect(screen.getByText(/Thursday/)).toBeInTheDocument();
    expect(screen.getByText(/Zoom/)).toBeInTheDocument();
  });

  it("shows the modality (in-person / online / hybrid)", () => {
    render(<OfficeHoursTable hours={FIXTURE} />);
    expect(screen.getByText(/in-person/i)).toBeInTheDocument();
    expect(screen.getByText(/online/i)).toBeInTheDocument();
  });

  it("flags by_appointment slots", () => {
    render(<OfficeHoursTable hours={FIXTURE} />);
    expect(screen.getByText(/by appointment/i)).toBeInTheDocument();
  });

  it("renders the per-slot note when present", () => {
    render(<OfficeHoursTable hours={FIXTURE} />);
    expect(screen.getByText(/Sign up via Calendly/)).toBeInTheDocument();
  });

  it("has zero axe violations", async () => {
    const { container } = render(<OfficeHoursTable hours={FIXTURE} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
