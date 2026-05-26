import fs, { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadCourseSpec } from "./course-spec-loader.ts";

/**
 * Minimal v0.2 spec YAML for tests. Mirrors the canonical fixture at
 * packages/core/src/schema/__fixtures__/course-spec-astr-201.yaml but
 * trimmed to the smallest valid shape: 8 required sections + the v0.2
 * required `grading` block.
 */
const MINIMAL_VALID_SPEC = `
identity:
  id: test-101
  title: Test
  code: TEST 101
  term: Spring 2027
  institution: Test U
  instructor: Test
  voice: test
  voice_register: test
  subtitle: Test subtitle
  description: Test description
audience:
  level: undergraduate-sophomore
  enrollment_motivation: Test
  prerequisites: { courses: [], assumed_skills: [], scaffolded_skills: [] }
  affective_profile: Test
pedagogy:
  pattern: observable_model_inference
  required_moves:
    observable: o
    model: m
    inference: i
  named_tools: []
  callouts: []
terminal_goals:
  - id: TG1
    tag: test-tag
    statement: Test
    contributing_modules: [m1]
principles: []
assessment:
  philosophy: Test
  category_refs: [hw]
grading:
  categories:
    - { id: hw, name: HW, weight: 1.0 }
  letter_scale:
    - { grade: "A", min: 93 }
quality_bars:
  required: []
  recommended: []
discovery:
  sections: "src/content/sections/*.json"
  units: "src/content/units/**/*.json"
  artifacts: "src/content/sections/**/*.mdx"
  registries:
    equations: "src/content/equations/**/*.mdx"
    figures: "src/content/figures.ts"
spec_version: "0.1"
schema: "@sophie/schemas/course-spec@0.1"
`;

describe("loadCourseSpec", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "sophie-course-spec-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("returns null when course.sophie.yaml is missing", () => {
    expect(loadCourseSpec(root)).toBeNull();
  });

  test("loads + parses a valid v0.2 spec", () => {
    fs.writeFileSync(path.join(root, "course.sophie.yaml"), MINIMAL_VALID_SPEC);
    const spec = loadCourseSpec(root);
    expect(spec?.identity.id).toBe("test-101");
    expect(spec?.grading.categories[0]?.id).toBe("hw");
  });

  test("throws curated error on malformed YAML", () => {
    fs.writeFileSync(
      path.join(root, "course.sophie.yaml"),
      "identity:\n  - this is not\n    a valid spec"
    );
    expect(() => loadCourseSpec(root)).toThrow();
  });

  test("throws curated error on schema-invalid spec (missing identity)", () => {
    fs.writeFileSync(path.join(root, "course.sophie.yaml"), "objectives: []\n");
    expect(() => loadCourseSpec(root)).toThrow(/course\.sophie\.yaml/i);
  });

  test("error message names the file (author can find the offending spec)", () => {
    fs.writeFileSync(path.join(root, "course.sophie.yaml"), "objectives: []\n");
    try {
      loadCourseSpec(root);
      // unreachable
      expect(true).toBe(false);
    } catch (err) {
      expect(String(err)).toMatch(/course\.sophie\.yaml/i);
    }
  });
});
