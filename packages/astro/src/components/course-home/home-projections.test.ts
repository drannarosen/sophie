import type { SectionEntry, UnitEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  assembleEyebrow,
  courseCounts,
  infoPageLabel,
  lectureCountForSection,
  moduleRows,
  navGroups,
  quickLinks,
} from "./home-projections.ts";

/** A `module`-variant section fixture. */
function section(slug: string, order: number, title: string): SectionEntry {
  return { type: "module", slug, order, title };
}

/** A unit fixture bound to a section, defaulting to non-draft `stable`. */
function unit(
  id: string,
  sectionId: string,
  order: number,
  status: UnitEntry["status"] = "stable"
): UnitEntry {
  return {
    id,
    type: "lecture",
    title: `Unit ${id}`,
    order,
    prereqs: [],
    status,
    section_id: sectionId,
    chapter: `${id}-reading`,
  };
}

describe("lectureCountForSection", () => {
  test("counts only units in the section", () => {
    const sec = section("foundations", 0, "Foundations");
    const units = [
      unit("a", "foundations", 0),
      unit("b", "foundations", 1),
      unit("c", "other", 0),
    ];
    expect(lectureCountForSection(sec, units)).toBe(2);
  });

  test("excludes draft units (match the public link-filter)", () => {
    const sec = section("foundations", 0, "Foundations");
    const units = [
      unit("a", "foundations", 0),
      unit("b", "foundations", 1, "draft"),
    ];
    expect(lectureCountForSection(sec, units)).toBe(1);
  });
});

describe("moduleRows", () => {
  test("sorts by order and assigns 1-based numbers", () => {
    const sections = [section("b", 1, "Second"), section("a", 0, "First")];
    const rows = moduleRows(sections, []);
    expect(rows.map((r) => [r.number, r.slug])).toEqual([
      [1, "a"],
      [2, "b"],
    ]);
  });

  test("carries description and per-section non-draft lecture counts", () => {
    const sections: SectionEntry[] = [
      { type: "module", slug: "a", order: 0, title: "A", description: "Intro" },
    ];
    const units = [
      unit("u1", "a", 0),
      unit("u2", "a", 1),
      unit("u3", "a", 2, "draft"),
    ];
    const [row] = moduleRows(sections, units);
    expect(row).toMatchObject({
      slug: "a",
      number: 1,
      title: "A",
      description: "Intro",
      lectureCount: 2,
    });
  });

  test("does not mutate the input sections array", () => {
    const sections = [section("b", 1, "B"), section("a", 0, "A")];
    const before = sections.map((s) => s.slug);
    moduleRows(sections, []);
    expect(sections.map((s) => s.slug)).toEqual(before);
  });
});

describe("courseCounts", () => {
  test("modules = section count; lectures = non-draft unit count", () => {
    const sections = [section("a", 0, "A"), section("b", 1, "B")];
    const units = [
      unit("u1", "a", 0),
      unit("u2", "a", 1, "draft"),
      unit("u3", "b", 0),
    ];
    expect(courseCounts(sections, units)).toEqual({
      moduleCount: 2,
      lectureCount: 2,
    });
  });
});

describe("assembleEyebrow", () => {
  test("instructor first, then institution, then term", () => {
    expect(
      assembleEyebrow("Anna Rosen", "San Diego State University", "Spring 2027")
    ).toBe("Anna Rosen · San Diego State University · Spring 2027");
  });

  test("drops blank parts without a dangling separator", () => {
    expect(assembleEyebrow("Anna Rosen", "  ", "Spring 2027")).toBe(
      "Anna Rosen · Spring 2027"
    );
  });
});

describe("infoPageLabel", () => {
  test("title-cases a kebab slug", () => {
    expect(infoPageLabel("office-hours")).toBe("Office Hours");
    expect(infoPageLabel("syllabus")).toBe("Syllabus");
  });
});

describe("quickLinks", () => {
  test("projects info_pages keys in declared order", () => {
    const links = quickLinks({
      syllabus: {},
      "office-hours": {},
      instructor: {},
    });
    expect(links).toEqual([
      { slug: "syllabus", label: "Syllabus" },
      { slug: "office-hours", label: "Office Hours" },
      { slug: "instructor", label: "Instructor" },
    ]);
  });

  test("absent info_pages → no links", () => {
    expect(quickLinks(undefined)).toEqual([]);
  });
});

describe("navGroups", () => {
  const SECTIONS = [
    section("foundations", 0, "Foundations"),
    section("hr", 1, "HR Diagram"),
  ];
  const UNITS = [
    unit("u1", "foundations", 0),
    unit("u2", "foundations", 1),
    unit("u3", "foundations", 2, "draft"),
    unit("u4", "hr", 0),
  ];
  const INFO_PAGES = {
    syllabus: { layout: "SyllabusPage" },
    instructor: { layout: "InstructorPage" },
    policies: { layout: "PoliciesPage" },
    accommodations: { layout: "AccommodationsPage" },
  };

  test("emits exactly the three ADR 0097 #6 groups in order", () => {
    const groups = navGroups(SECTIONS, UNITS, INFO_PAGES);
    expect(groups.map((g) => g.heading)).toEqual([
      "Course",
      "The Course",
      "Reference & Help",
    ]);
  });

  test("Course group: Home (current) + Syllabus/Instructor info-pages by layout", () => {
    const [course] = navGroups(SECTIONS, UNITS, INFO_PAGES);
    expect(course?.links).toEqual([
      { label: "Home", path: "/", key: "home", current: true },
      { label: "Syllabus", path: "/syllabus/", key: "syllabus" },
      { label: "Instructor", path: "/instructor/", key: "instructor" },
    ]);
  });

  test("The Course group: one link per section with non-draft lecture count", () => {
    const modules = navGroups(SECTIONS, UNITS, INFO_PAGES)[1];
    expect(modules?.links).toEqual([
      {
        label: "Foundations",
        path: "/sections/foundations/",
        key: "foundations",
        count: 2,
      },
      { label: "HR Diagram", path: "/sections/hr/", key: "hr", count: 1 },
    ]);
  });

  test("Reference group: Optional placeholder + Practice placeholder + Policies/Accommodations", () => {
    const reference = navGroups(SECTIONS, UNITS, INFO_PAGES)[2];
    expect(reference?.links).toEqual([
      {
        label: "Math & Physics Review",
        key: "math-physics-review",
        optional: true,
      },
      { label: "Practice Problems", key: "practice-problems" },
      { label: "Policies", path: "/policies/", key: "policies" },
      {
        label: "Accommodations",
        path: "/accommodations/",
        key: "accommodations",
      },
    ]);
  });

  test("placeholders carry no path (rendered as non-link spans)", () => {
    const reference = navGroups(SECTIONS, UNITS, INFO_PAGES)[2];
    const placeholders = reference?.links.filter((l) => l.path === undefined);
    expect(placeholders?.map((l) => l.key)).toEqual([
      "math-physics-review",
      "practice-problems",
    ]);
  });

  test("absent info_pages → Course has only Home; Reference has only placeholders", () => {
    const groups = navGroups(SECTIONS, UNITS, undefined);
    expect(groups[0]?.links).toEqual([
      { label: "Home", path: "/", key: "home", current: true },
    ]);
    expect(groups[2]?.links.map((l) => l.key)).toEqual([
      "math-physics-review",
      "practice-problems",
    ]);
  });

  test("ignores info-pages with an unknown/missing layout", () => {
    const groups = navGroups(SECTIONS, [], {
      mystery: { layout: "FutureLayout" },
      broken: {},
    });
    // Only Home survives in Course; no extra Reference links.
    expect(groups[0]?.links.map((l) => l.key)).toEqual(["home"]);
    expect(groups[2]?.links.map((l) => l.key)).toEqual([
      "math-physics-review",
      "practice-problems",
    ]);
  });
});
