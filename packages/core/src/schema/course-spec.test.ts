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

  it("parses grade weights summing to 100", () => {
    const parsed = CourseSpecSchema.parse(valid());
    const total = parsed.assessment.grade_weights.reduce(
      (s, w) => s + w.weight,
      0
    );
    expect(total).toBe(100);
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
  it("rejects weights not summing to 100 (refine)", () => {
    const data = valid();
    const broken = {
      ...data,
      assessment: {
        ...(data.assessment as Record<string, unknown>),
        grade_weights: [
          {
            category: "homework",
            weight: 50,
            label: "HW",
          },
          {
            category: "final-exam",
            weight: 49,
            label: "Final",
          },
        ],
      },
    };
    expect(() => CourseSpecSchema.parse(broken)).toThrow(
      /grade_weights must sum to 100/
    );
  });

  it("rejects weights-not-100.yaml fixture (loaded from disk)", () => {
    const broken = loadFixture("invalid/weights-not-100.yaml");
    expect(() => CourseSpecSchema.parse(broken)).toThrow(
      /grade_weights must sum to 100/
    );
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
