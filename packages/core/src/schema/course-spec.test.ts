import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  COURSE_SPEC_SCHEMA_ID,
  COURSE_SPEC_VERSION,
  CourseSpecSchema,
  validateCourseSpec,
} from "./course-spec.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return parseYaml(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

function valid(): Record<string, unknown> {
  return loadFixture("course-spec-astr-201.yaml") as Record<string, unknown>;
}

describe("CourseSpecSchema — valid ASTR 201 draft", () => {
  it("accepts the design-doc draft verbatim", () => {
    expect(() => CourseSpecSchema.parse(valid())).not.toThrow();
  });

  it("parses identity.code and voice references", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.identity.code).toBe("ASTR 201");
    expect(parsed.identity.voice).toBe("anna-rosen");
    expect(parsed.identity.voice_register).toBe("sophomore-quantitative");
  });

  it("parses all 6 terminal goals", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.terminal_goals).toHaveLength(6);
    expect(parsed.terminal_goals[0]?.id).toBe("TG1");
  });

  it("parses grading.categories summing to 1.0 (v0.2 — replaces v0.1 grade_weights)", () => {
    const parsed = CourseSpecSchema.parse(valid());
    const total = parsed.grading.categories.reduce((s, c) => s + c.weight, 0);
    expect(Math.abs(total - 1.0)).toBeLessThan(0.001);
  });

  it("parses assessment.category_refs as audit-coverage pointer into grading.categories", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.assessment.category_refs).toContain("homework");
    expect(parsed.assessment.category_refs).toContain("final-exam");
    const declaredIds = new Set(parsed.grading.categories.map((c) => c.id));
    for (const ref of parsed.assessment.category_refs) {
      expect(declaredIds).toContain(ref);
    }
  });

  it("locks spec_version and schema id literals", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.spec_version).toBe(COURSE_SPEC_VERSION);
    expect(parsed.schema).toBe(COURSE_SPEC_SCHEMA_ID);
  });

  it("normalizes scope: <string> to scope: [<string>] via preprocess", () => {
    const parsed = CourseSpecSchema.parse(valid());
    const qb5 = parsed.quality_bars.required.find(
      (q) => q.id === "QB5-assessment-coverage"
    );
    expect(qb5?.scope).toEqual(["course"]);
  });
});

describe("CourseSpecSchema — rejects malformed inputs", () => {
  it("rejects grading.categories weights not summing to 1.0 (v0.2 refine)", () => {
    const data = valid();
    const broken = {
      ...data,
      grading: {
        ...(data.grading as Record<string, unknown>),
        categories: [
          { id: "homework", name: "HW", weight: 0.5 },
          { id: "final-exam", name: "Final", weight: 0.49 },
        ],
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow(/sum to 1\.0/);
  });

  it("rejects category-weights-not-one.yaml fixture (loaded from disk)", () => {
    const broken = loadFixture("invalid/category-weights-not-one.yaml");
    expect(() => CourseSpecSchema.parse(broken)).toThrow(/sum to 1\.0/);
  });

  it("rejects the legacy v0.1 grade_weights shape (clean break per ADR 0080 v0.2)", () => {
    const data = valid();
    const broken = {
      ...data,
      assessment: {
        ...(data.assessment as Record<string, unknown>),
        grade_weights: [{ category: "hw", weight: 100, label: "HW" }],
      },
    };
    // .strict() rejects the unknown `grade_weights` key.
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects unknown pedagogy.pattern (enum)", () => {
    const data = valid();
    const broken = {
      ...data,
      pedagogy: {
        ...(data.pedagogy as Record<string, unknown>),
        pattern: "unknown_pattern_xyz",
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects missing identity section", () => {
    const data = valid();
    const { identity: _omit, ...rest } = data;
    expect(() => CourseSpecSchema.parse(rest)).toThrow();
  });

  it("rejects missing audience section", () => {
    const data = valid();
    const { audience: _omit, ...rest } = data;
    expect(() => CourseSpecSchema.parse(rest)).toThrow();
  });

  it("rejects unknown top-level keys (.strict)", () => {
    const data = valid();
    expect(() =>
      CourseSpecSchema.parse({ ...data, mystery_section: { foo: "bar" } })
    ).toThrow();
  });

  it("rejects unknown nested keys (.strict on inner objects)", () => {
    const data = valid();
    const broken = {
      ...data,
      identity: {
        ...(data.identity as Record<string, unknown>),
        misspelled_field: "oops",
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects empty terminal_goals", () => {
    const data = valid();
    expect(() =>
      CourseSpecSchema.parse({ ...data, terminal_goals: [] })
    ).toThrow();
  });

  it("rejects non-Slug voice_register", () => {
    const data = valid();
    const broken = {
      ...data,
      identity: {
        ...(data.identity as Record<string, unknown>),
        voice_register: "Sophomore_Quantitative",
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects mismatched spec_version literal", () => {
    const data = valid();
    expect(() =>
      CourseSpecSchema.parse({ ...data, spec_version: "0.2" })
    ).toThrow();
  });

  it("rejects mismatched schema id literal", () => {
    const data = valid();
    expect(() =>
      CourseSpecSchema.parse({ ...data, schema: "@sophie/schemas/other@0.1" })
    ).toThrow();
  });
});

describe("CourseSpecSchema — discovery shape (ADR 0067 alignment)", () => {
  it("accepts the ADR 0067 shape from the fixture", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.discovery.sections).toMatch(/sections/);
    expect(parsed.discovery.units).toMatch(/units/);
    expect(parsed.discovery.artifacts).toMatch(/sections.*mdx/);
    expect(parsed.discovery.registries.equations).toMatch(/equations/);
    expect(parsed.discovery.registries.figures).toMatch(/figures/);
  });

  it("accepts optional registries.topics (ADR 0079) when present", () => {
    const data = valid();
    const discovery = data.discovery as Record<string, unknown>;
    const registries = discovery.registries as Record<string, unknown>;
    const extended = {
      ...data,
      discovery: {
        ...discovery,
        registries: {
          ...registries,
          topics: "src/content/topics/**/*.mdx",
        },
      },
    };
    expect(() => CourseSpecSchema.parse(extended)).not.toThrow();
    const parsed = CourseSpecSchema.parse(extended);
    expect(parsed.discovery.registries.topics).toBe(
      "src/content/topics/**/*.mdx"
    );
  });

  it("accepts optional registries.misconceptions (ADR 0060) when present", () => {
    const data = valid();
    const discovery = data.discovery as Record<string, unknown>;
    const registries = discovery.registries as Record<string, unknown>;
    const extended = {
      ...data,
      discovery: {
        ...discovery,
        registries: {
          ...registries,
          misconceptions: "src/content/misconceptions/**/*.mdx",
        },
      },
    };
    expect(() => CourseSpecSchema.parse(extended)).not.toThrow();
  });

  it("rejects unknown top-level discovery keys (.strict)", () => {
    const data = valid();
    const discovery = data.discovery as Record<string, unknown>;
    const broken = {
      ...data,
      discovery: { ...discovery, modules: "modules/*/index.mdx" },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects unknown registry keys (.strict on inner)", () => {
    const data = valid();
    const discovery = data.discovery as Record<string, unknown>;
    const registries = discovery.registries as Record<string, unknown>;
    const broken = {
      ...data,
      discovery: {
        ...discovery,
        registries: { ...registries, glossary: "glossary/*.mdx" },
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects the legacy v0.1 module-shaped discovery (pre-amendment)", () => {
    const data = valid();
    const broken = {
      ...data,
      discovery: {
        modules: {
          pattern: "modules/*/index.mdx",
          children: {
            lectures: "modules/*/readings/*.mdx",
            slides: "modules/*/slides/*.mdx",
          },
        },
        assignments: "homework/*.mdx",
        exams: "exams/*.mdx",
        course_info: "course-info/*.mdx",
        handouts: "handouts/*.{pdf,mdx}",
        registries: {
          figures: "assets/figures.yaml",
          equations: "equations/*.mdx",
          misconceptions: "misconceptions/*.mdx",
        },
        schedule: "course-info/schedule.yaml",
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects missing required discovery key (units omitted)", () => {
    const data = valid();
    const discovery = data.discovery as Record<string, unknown>;
    const { units: _omit, ...rest } = discovery;
    const broken = { ...data, discovery: rest };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects missing required registries key (figures omitted)", () => {
    const data = valid();
    const discovery = data.discovery as Record<string, unknown>;
    const registries = discovery.registries as Record<string, unknown>;
    const { figures: _omit, ...regRest } = registries;
    const broken = {
      ...data,
      discovery: { ...discovery, registries: regRest },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });
});

describe("validateCourseSpec helper", () => {
  it("returns [] for valid input", () => {
    expect(validateCourseSpec(valid())).toEqual([]);
  });

  it("returns ERROR findings for malformed input", () => {
    const findings = validateCourseSpec({ identity: "not-an-object" });
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.severity).toBe("ERROR");
      expect(f.code).toBe("COURSE-SPEC");
    }
  });

  it("path-prefixes the issue message", () => {
    const data = valid();
    const broken = {
      ...data,
      pedagogy: {
        ...(data.pedagogy as Record<string, unknown>),
        pattern: "unknown_pattern_xyz",
      },
    };
    const findings = validateCourseSpec(broken);
    expect(findings.some((f) => f.message.includes("pedagogy.pattern"))).toBe(
      true
    );
  });
});

// ───────────────────────────────────────────────────────────────────
// v0.2 clusters — course-info projection (ADR 0080 v0.2 amendment +
// docs/plans/2026-05-26-course-info-projection-design.md). All optional
// chrome clusters are populated in the canonical fixture so the
// acceptance test stays small (spread + override).
// ───────────────────────────────────────────────────────────────────

describe("CourseSpecSchema v0.2 — chrome clusters", () => {
  it("accepts objectives cluster", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.objectives?.[0]?.id).toBe("lo-1");
    expect(parsed.objectives?.[0]?.verb).toBe("Infer");
  });

  it("accepts office_hours array with modality enum + HH:MM regex", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.office_hours?.[0]?.day).toBe("Tuesday");
    expect(parsed.office_hours?.[0]?.modality).toBe("in-person");
  });

  it("accepts contact with email + async_channel", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.contact?.email).toBe("alrosen@sdsu.edu");
    expect(parsed.contact?.async_channel?.kind).toBe("canvas-msg");
  });

  it("accepts accessibility cluster (DRC link, request deadline weeks)", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.accessibility?.drc_link).toMatch(/^https?:\/\//);
    expect(parsed.accessibility?.request_deadline_weeks).toBe(2);
  });

  it("accepts info_pages with strict compose: union (data keys + prose/<slug>)", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.info_pages?.syllabus?.compose).toContain("objectives");
    expect(parsed.info_pages?.syllabus?.compose).toContain("prose/policies");
  });

  it("rejects info_pages declarations with unknown layout names (per review I1 — enum, not NonEmptyString)", () => {
    const data = valid();
    const broken = {
      ...data,
      info_pages: {
        syllabus: { layout: "TypoPage" }, // not one of the 5 known layouts
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects info_pages.compose entries that are neither known data keys nor prose/<slug>", () => {
    const data = valid();
    const broken = {
      ...data,
      info_pages: {
        syllabus: {
          layout: "SyllabusPage",
          compose: ["objetctives"], // typo — should be objectives
        },
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("accepts landing.layout: 'custom' (integration-override path per H2)", () => {
    const data = valid();
    const extended = {
      ...data,
      landing: { layout: "custom" },
    };
    expect(() => CourseSpecSchema.parse(extended)).not.toThrow();
  });

  it("defaults landing.layout to 'simple-list' when layout is omitted", () => {
    const data = valid();
    const extended = { ...data, landing: {} };
    const parsed = CourseSpecSchema.parse(extended);
    expect(parsed.landing?.layout).toBe("simple-list");
  });

  // Schema-validated slugs (kebab-case, no leading underscore) that
  // collide with Sophie-injected routes are caught by the
  // reserved-slug refine on InfoPagesSchema.
  it.each([
    "units",
    "sections",
    "library",
    "pagefind",
  ])("rejects info_pages slug colliding with Sophie-reserved set: %s", (reserved) => {
    const data = valid();
    const broken = {
      ...data,
      info_pages: { [reserved]: { layout: "SyllabusPage" } },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow(/reserved/i);
  });

  // Astro-internal prefixes (`_astro`, `_server`, `_image`) start with
  // underscore — caught by the kebab-case key regex (different rule,
  // same outcome). Both defenses combined foreclose the collision class.
  it.each([
    "_astro",
    "_server",
    "_image",
  ])("rejects info_pages slug with Astro-internal underscore prefix: %s", (reserved) => {
    const data = valid();
    const broken = {
      ...data,
      info_pages: { [reserved]: { layout: "SyllabusPage" } },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });
});

describe("CourseSpecSchema v0.2 — grading invariants", () => {
  it("rejects objectives[*].assessed_by entries that don't reference declared grading.categories (I3 cross-refine)", () => {
    const data = valid();
    const broken = {
      ...data,
      objectives: [
        {
          id: "lo-x",
          verb: "Test",
          body: "the cross-refine",
          assessed_by: ["nonexistent-category"],
        },
      ],
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("requires assessment.category_refs to reference declared grading.categories", () => {
    const data = valid();
    const broken = {
      ...data,
      assessment: {
        ...(data.assessment as Record<string, unknown>),
        category_refs: ["nonexistent-category"],
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("requires assessment.category_refs to be non-empty", () => {
    const data = valid();
    const broken = {
      ...data,
      assessment: {
        ...(data.assessment as Record<string, unknown>),
        category_refs: [],
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("accepts grading.categories with drop_lowest + late_policy_ref", () => {
    const parsed = CourseSpecSchema.parse(valid());
    const homework = parsed.grading.categories.find((c) => c.id === "homework");
    expect(homework?.drop_lowest).toBe(1);
    expect(homework?.late_policy_ref).toBe("prose/late-work");
  });
});
