import type { SectionEntry, UnitEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  assembleEyebrow,
  courseCounts,
  howBand,
  howFlow,
  lectureCountForSection,
  moduleRows,
  navGroups,
  quickLinks,
  titleCaseSlug,
  toolkitPillarBody,
  trackNote,
  whyBand,
  whyLead,
  whyPillars,
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

describe("titleCaseSlug", () => {
  test("title-cases a kebab slug", () => {
    expect(titleCaseSlug("office-hours")).toBe("Office Hours");
    expect(titleCaseSlug("syllabus")).toBe("Syllabus");
    expect(titleCaseSlug("growth-memo")).toBe("Growth Memo");
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

// ─── Descriptive-band projections (ADR 0097 #3) ─────────────────────

/** The real astr201 named_tools shape (id + tagline). */
const ASTR201_TOOLS = [
  { id: "dimensional-analysis", tagline: "The smoke detector for physics." },
  { id: "ratio-method", tagline: "Escape the paralysis of giant numbers." },
  {
    id: "order-of-magnitude-estimation",
    tagline: "One sig fig keeps you grounded.",
  },
  {
    id: "unit-conversions",
    tagline: "Move between SI and CGS without panicking.",
  },
];

/** The real astr201 required_moves shape (key → description). */
const ASTR201_MOVES = {
  observable: "What we measure (parallax angle, color, line spectrum)",
  model: "What we believe (geometric, atomic, gravitational)",
  inference: "What we can claim (distance, T, M, composition, L)",
  "assumption-audit": "What we leaned on; where it breaks",
};

const ASTR201_TRACKS = {
  enabled: true,
  tracks: [
    { id: "core", label: "Track A", target_time: "20-min" },
    { id: "enrichment", label: "Track B", target_time: "30-min", deeper: true },
  ],
};

describe("whyLead", () => {
  test("projects the first sentence of identity.description", () => {
    expect(
      whyLead(
        "This is not a tour of the cosmos. ASTR 201 teaches you to think like an astronomer."
      )
    ).toBe("This is not a tour of the cosmos.");
  });

  test("collapses whitespace from a folded YAML scalar", () => {
    expect(whyLead("Wonder-first\n  → physics-second. The rest.")).toBe(
      "Wonder-first → physics-second."
    );
  });

  test("returns the whole string when there is no sentence terminator", () => {
    expect(whyLead("A single clause with no period")).toBe(
      "A single clause with no period"
    );
  });

  test("absent / blank description → undefined (graceful omission)", () => {
    expect(whyLead(undefined)).toBeUndefined();
    expect(whyLead("   ")).toBeUndefined();
  });
});

describe("toolkitPillarBody", () => {
  test("projects the named_tools ids into a humanized Oxford-comma list", () => {
    expect(toolkitPillarBody(ASTR201_TOOLS)).toBe(
      "Dimensional analysis, ratio method, order of magnitude estimation, and unit conversions — reasoning skills that outlast any single equation."
    );
  });

  test("absent / empty named_tools → undefined (pillar omitted upstream)", () => {
    expect(toolkitPillarBody(undefined)).toBeUndefined();
    expect(toolkitPillarBody([])).toBeUndefined();
  });
});

describe("whyPillars", () => {
  test("full spec → three pillars in prototype order (observe · toolkit · models)", () => {
    const pillars = whyPillars(ASTR201_TOOLS);
    expect(pillars.map((p) => p.key)).toEqual([
      "observation",
      "toolkit",
      "models",
    ]);
    // The toolkit pillar's body is the PROJECTED tools list.
    expect(pillars[1]?.body).toContain("Dimensional analysis");
  });

  test("absent named_tools → toolkit pillar dropped, fixed pillars remain", () => {
    const pillars = whyPillars(undefined);
    expect(pillars.map((p) => p.key)).toEqual(["observation", "models"]);
    // No empty shell: every surviving pillar carries a body.
    expect(pillars.every((p) => p.body.length > 0)).toBe(true);
  });
});

describe("whyBand", () => {
  test("full spec → projected lead + three pillars", () => {
    const band = whyBand(
      "ASTR 201 teaches you to think like an astronomer. More text.",
      ASTR201_TOOLS
    );
    expect(band.lead).toBe("ASTR 201 teaches you to think like an astronomer.");
    expect(band.pillars).toHaveLength(3);
  });

  test("absent description + tools → no lead, two fixed pillars (no crash)", () => {
    const band = whyBand(undefined, undefined);
    expect(band.lead).toBeUndefined();
    expect(band.pillars).toHaveLength(2);
  });
});

describe("howFlow", () => {
  test("projects required_moves keys+values verbatim, in insertion order", () => {
    const flow = howFlow(ASTR201_MOVES);
    expect(flow).toEqual([
      {
        key: "observable",
        label: "Observable",
        caption: "What we measure (parallax angle, color, line spectrum)",
      },
      {
        key: "model",
        label: "Model",
        caption: "What we believe (geometric, atomic, gravitational)",
      },
      {
        key: "inference",
        label: "Inference",
        caption: "What we can claim (distance, T, M, composition, L)",
      },
      {
        key: "assumption-audit",
        label: "Assumption audit",
        caption: "What we leaned on; where it breaks",
      },
    ]);
  });

  test("uses the REAL move labels, not hardcoded OMI (distinct fixture)", () => {
    const flow = howFlow({
      "gather-data": "collect the photons",
      "fit-curve": "regress the model",
    });
    expect(flow.map((s) => s.label)).toEqual(["Gather data", "Fit curve"]);
    expect(flow.map((s) => s.caption)).toEqual([
      "collect the photons",
      "regress the model",
    ]);
  });

  test("absent / empty required_moves → [] (band omitted, graceful)", () => {
    expect(howFlow(undefined)).toEqual([]);
    expect(howFlow({})).toEqual([]);
  });
});

describe("trackNote", () => {
  test("projects enabled multi_track_readings labels + target times", () => {
    expect(trackNote(ASTR201_TRACKS)).toEqual({
      tracks: [
        { label: "Track A", time: "20-min" },
        { label: "Track B", time: "30-min" },
      ],
    });
  });

  test("degrades on every absence path → undefined", () => {
    expect(trackNote(undefined)).toBeUndefined();
    expect(
      trackNote({ enabled: false, tracks: ASTR201_TRACKS.tracks })
    ).toBeUndefined();
    expect(trackNote({ enabled: true, tracks: [] })).toBeUndefined();
  });
});

describe("howBand", () => {
  test("full spec → flow + track note", () => {
    const band = howBand(ASTR201_MOVES, ASTR201_TRACKS);
    expect(band.flow).toHaveLength(4);
    expect(band.note?.tracks).toHaveLength(2);
  });

  test("absent required_moves → empty flow (band degrades to nothing)", () => {
    const band = howBand(undefined, undefined);
    expect(band.flow).toEqual([]);
    expect(band.note).toBeUndefined();
  });

  test("moves present but tracks absent → flow without note", () => {
    const band = howBand(ASTR201_MOVES, undefined);
    expect(band.flow).toHaveLength(4);
    expect(band.note).toBeUndefined();
  });
});
