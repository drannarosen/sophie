import type { CourseSpec, SectionEntry, UnitEntry } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SimpleList } from "./SimpleList.tsx";

/**
 * Minimal fixtures shaped to satisfy SectionEntry + UnitEntry without
 * pulling the full discriminated-union surface (the layout reads only
 * slug/title/order/section_id/status — the rest is downstream concern).
 */
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
      subtitle: "Quantitative intro to astrophysics",
      description: "Test description",
    },
  } as unknown as CourseSpec;
}

function fixtureSections(): SectionEntry[] {
  return [
    {
      type: "module",
      slug: "foundations",
      title: "Foundations",
      order: 1,
    },
    {
      type: "module",
      slug: "stars",
      title: "Stars",
      order: 2,
    },
  ] as unknown as SectionEntry[];
}

function fixtureUnits(): UnitEntry[] {
  return [
    {
      id: "spoiler-alerts",
      type: "lecture",
      title: "Spoiler Alerts",
      order: 1,
      prereqs: [],
      status: "stable",
      section_id: "foundations",
      chapter: "spoiler-alerts/reading",
    },
    {
      id: "measuring-the-sky",
      type: "lecture",
      title: "Measuring the Sky",
      order: 2,
      prereqs: [],
      status: "stable",
      section_id: "foundations",
      chapter: "measuring-the-sky/reading",
    },
    {
      id: "stellar-evolution",
      type: "lecture",
      title: "Stellar Evolution",
      order: 1,
      prereqs: [],
      status: "stable",
      section_id: "stars",
      chapter: "stellar-evolution/reading",
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

describe("<SimpleList>", () => {
  it("renders the course title in the h1", () => {
    render(
      <SimpleList
        spec={fixtureSpec()}
        sections={fixtureSections()}
        units={fixtureUnits()}
      />
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Astronomy for Science Majors/,
      })
    ).toBeInTheDocument();
  });

  it("renders the subtitle below the title when present", () => {
    render(
      <SimpleList
        spec={fixtureSpec()}
        sections={fixtureSections()}
        units={fixtureUnits()}
      />
    );
    expect(
      screen.getByText(/Quantitative intro to astrophysics/)
    ).toBeInTheDocument();
  });

  it("renders each section as an h2 in spec order", () => {
    render(
      <SimpleList
        spec={fixtureSpec()}
        sections={fixtureSections()}
        units={fixtureUnits()}
      />
    );
    const sectionHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(sectionHeadings.map((h) => h.textContent)).toEqual([
      "Foundations",
      "Stars",
    ]);
  });

  it("renders non-draft units under their section as links to /units/<id>/reading/", () => {
    render(
      <SimpleList
        spec={fixtureSpec()}
        sections={fixtureSections()}
        units={fixtureUnits()}
      />
    );
    const spoilerLink = screen.getByRole("link", { name: /Spoiler Alerts/ });
    expect(spoilerLink).toHaveAttribute(
      "href",
      "/units/spoiler-alerts/reading/"
    );
  });

  it("excludes draft-status units from the rendered list", () => {
    render(
      <SimpleList
        spec={fixtureSpec()}
        sections={fixtureSections()}
        units={fixtureUnits()}
      />
    );
    expect(screen.queryByRole("link", { name: /Draft Unit/ })).toBeNull();
  });

  it("uses <main> as the top-level landmark (R10: page-level shell, not nested)", () => {
    const { container } = render(
      <SimpleList
        spec={fixtureSpec()}
        sections={fixtureSections()}
        units={fixtureUnits()}
      />
    );
    expect(container.querySelector("main")).not.toBeNull();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <SimpleList
        spec={fixtureSpec()}
        sections={fixtureSections()}
        units={fixtureUnits()}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
