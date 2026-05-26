import type { CourseSpec, SectionEntry, UnitEntry } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SectionLanding } from "./SectionLanding.tsx";

function fixtureSpec(): CourseSpec {
  return {
    identity: {
      id: "test-101",
      title: "Astronomy for Science Majors",
      code: "ASTR 201",
      term: "Spring 2027",
      institution: "SDSU",
      instructor: "Anna Rosen",
      voice: "anna-rosen",
      voice_register: "sophomore-quantitative",
      subtitle: "Test",
      description: "Test",
    },
  } as unknown as CourseSpec;
}

function fixtureSection(): SectionEntry {
  return {
    type: "module",
    slug: "stars",
    title: "Stars",
    order: 2,
    description: "Stellar structure, evolution, and end states.",
  } as unknown as SectionEntry;
}

function fixtureUnits(): UnitEntry[] {
  return [
    {
      id: "stellar-evolution",
      type: "lecture",
      title: "Stellar Evolution",
      order: 1,
      prereqs: [],
      status: "stable",
      section_id: "stars",
      chapter: "stellar-evolution/reading",
      estimated_duration_weeks: 1.5,
    },
    {
      id: "spectra-and-composition",
      type: "lecture",
      title: "Spectra & Composition",
      order: 2,
      prereqs: [],
      status: "review",
      section_id: "stars",
      chapter: "spectra-and-composition/reading",
    },
    {
      id: "draft-unit",
      type: "lecture",
      title: "Draft Unit",
      order: 99,
      prereqs: [],
      status: "draft",
      section_id: "stars",
      chapter: "draft-unit/reading",
    },
  ] as unknown as UnitEntry[];
}

describe("<SectionLanding>", () => {
  it("renders the section title as h1", () => {
    render(
      <SectionLanding
        spec={fixtureSpec()}
        section={fixtureSection()}
        units={fixtureUnits()}
      />
    );
    expect(
      screen.getByRole("heading", { level: 1, name: /Stars/ })
    ).toBeInTheDocument();
  });

  it("renders the section description when present", () => {
    render(
      <SectionLanding
        spec={fixtureSpec()}
        section={fixtureSection()}
        units={fixtureUnits()}
      />
    );
    expect(
      screen.getByText(/Stellar structure, evolution, and end states/)
    ).toBeInTheDocument();
  });

  it("renders non-draft units as links sorted by order", () => {
    render(
      <SectionLanding
        spec={fixtureSpec()}
        section={fixtureSection()}
        units={fixtureUnits()}
      />
    );
    // Filter to unit links only (the breadcrumb has a separate href).
    const allLinks = screen.getAllByRole("link");
    const unitLinks = allLinks.filter((l) =>
      l.getAttribute("href")?.startsWith("/units/")
    );
    expect(unitLinks.map((l) => l.textContent)).toEqual([
      expect.stringContaining("Stellar Evolution"),
      expect.stringContaining("Spectra & Composition"),
    ]);
  });

  it("uses <main> as the top-level landmark (R10)", () => {
    const { container } = render(
      <SectionLanding
        spec={fixtureSpec()}
        section={fixtureSection()}
        units={fixtureUnits()}
      />
    );
    expect(container.querySelector("main")).not.toBeNull();
  });

  it("excludes draft units", () => {
    render(
      <SectionLanding
        spec={fixtureSpec()}
        section={fixtureSection()}
        units={fixtureUnits()}
      />
    );
    expect(screen.queryByRole("link", { name: /Draft Unit/ })).toBeNull();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <SectionLanding
        spec={fixtureSpec()}
        section={fixtureSection()}
        units={fixtureUnits()}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
