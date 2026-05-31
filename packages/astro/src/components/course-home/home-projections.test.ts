import type { SectionEntry, UnitEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  assembleEyebrow,
  courseCounts,
  infoPageLabel,
  lectureCountForSection,
  moduleRows,
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
