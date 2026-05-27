import fs, { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { defineSophieIntegration } from "./integration.ts";

/**
 * Integration-test coverage for `defineSophieIntegration`'s route
 * injection at `astro:config:setup`. Fake hook context per fix T1 —
 * uses a tmpdir-rooted consumer fixture so `fs.existsSync` doesn't
 * throw on the discovery walks.
 *
 * Covers two paths:
 *  1. Consumer with no course.sophie.yaml — only the per-unit reading
 *     and practice routes are injected (no course-spec landing routes).
 *  2. Consumer with a valid course.sophie.yaml — reading + practice +
 *     landing + section-landing + per-info_pages routes are injected.
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
  required_moves: { observable: o, model: m, inference: i }
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
  letter_scale: [{ grade: A, min: 93 }]
quality_bars: { required: [], recommended: [] }
discovery:
  sections: "src/content/sections/*.json"
  units: "src/content/units/**/*.json"
  artifacts: "src/content/sections/**/*.mdx"
  registries:
    equations: "src/content/equations/**/*.mdx"
    figures: "src/content/figures.ts"
spec_version: "0.1"
schema: "@sophie/schemas/course-spec@0.1"
info_pages:
  syllabus: { layout: SyllabusPage }
  policies: { layout: PoliciesPage, prose: "prose/policies" }
landing:
  layout: simple-list
`;

interface InjectedRoute {
  pattern: string;
  entrypoint: string;
}

function runSetupHook(consumerRoot: string): {
  injected: InjectedRoute[];
  warnCalls: string[];
} {
  const injected: InjectedRoute[] = [];
  const warnCalls: string[] = [];

  const injectRoute = vi.fn((args: InjectedRoute) => {
    injected.push({ pattern: args.pattern, entrypoint: args.entrypoint });
  });
  const updateConfig = vi.fn();
  const logger = {
    warn: vi.fn((msg: string) => warnCalls.push(msg)),
    info: vi.fn(),
    error: vi.fn(),
    fork: vi.fn(),
    options: {},
  };

  const integration = defineSophieIntegration({ figures: {} });
  const setupHook = integration.hooks["astro:config:setup"];
  if (!setupHook) throw new Error("integration missing astro:config:setup");

  // biome-ignore lint/suspicious/noExplicitAny: fake hook context for unit test (per fix T1)
  (setupHook as (ctx: any) => void)({
    config: { root: new URL(`file://${consumerRoot}/`) },
    injectRoute,
    updateConfig,
    logger,
  });

  return { injected, warnCalls };
}

describe("defineSophieIntegration — route injection (course-info projection)", () => {
  let consumerRoot: string;

  beforeEach(() => {
    consumerRoot = mkdtempSync(path.join(tmpdir(), "sophie-integration-"));
    // Empty src/content so the integration's content-discovery walks
    // don't throw on the missing directory.
    fs.mkdirSync(path.join(consumerRoot, "src", "content"), {
      recursive: true,
    });
  });

  afterEach(() => {
    rmSync(consumerRoot, { recursive: true, force: true });
  });

  test("injects per-unit reading + practice routes when no course.sophie.yaml exists (no course-spec landing)", () => {
    const { injected } = runSetupHook(consumerRoot);
    const patterns = injected.map((r) => r.pattern);
    expect(patterns).toContain("/units/[unit]/reading");
    expect(patterns).toContain("/units/[unit]/practice");
    expect(patterns).not.toContain("/");
    expect(patterns).not.toContain("/sections/[section]/");
    expect(patterns).not.toContain("/syllabus/");
  });

  test("injects per-unit + landing + section-landing + info-page routes when course.sophie.yaml is present", () => {
    fs.writeFileSync(
      path.join(consumerRoot, "course.sophie.yaml"),
      MINIMAL_VALID_SPEC
    );
    const { injected } = runSetupHook(consumerRoot);
    const patterns = injected.map((r) => r.pattern);
    expect(patterns).toContain("/units/[unit]/reading");
    expect(patterns).toContain("/units/[unit]/practice");
    expect(patterns).toContain("/");
    expect(patterns).toContain("/sections/[section]/");
    expect(patterns).toContain("/syllabus/");
    expect(patterns).toContain("/policies/");
  });

  test("each info_pages slug becomes its own static route", () => {
    fs.writeFileSync(
      path.join(consumerRoot, "course.sophie.yaml"),
      MINIMAL_VALID_SPEC
    );
    const { injected } = runSetupHook(consumerRoot);
    const infoPageRoutes = injected.filter(
      (r) => r.entrypoint === "@sophie/astro/routes/info-page.astro"
    );
    expect(infoPageRoutes).toHaveLength(2);
    expect(infoPageRoutes.map((r) => r.pattern).sort()).toEqual([
      "/policies/",
      "/syllabus/",
    ]);
  });

  test("course-landing route points at the canonical entrypoint", () => {
    fs.writeFileSync(
      path.join(consumerRoot, "course.sophie.yaml"),
      MINIMAL_VALID_SPEC
    );
    const { injected } = runSetupHook(consumerRoot);
    const landing = injected.find((r) => r.pattern === "/");
    expect(landing?.entrypoint).toBe(
      "@sophie/astro/routes/course-landing.astro"
    );
  });

  test("warns when consumer shadows the injected landing route (/)", () => {
    fs.writeFileSync(
      path.join(consumerRoot, "course.sophie.yaml"),
      MINIMAL_VALID_SPEC
    );
    fs.mkdirSync(path.join(consumerRoot, "src", "pages"), { recursive: true });
    fs.writeFileSync(
      path.join(consumerRoot, "src", "pages", "index.astro"),
      "<!-- hand-rolled landing -->"
    );
    const { warnCalls } = runSetupHook(consumerRoot);
    expect(warnCalls.some((w) => /index\.astro|shadow|landing/i.test(w))).toBe(
      true
    );
  });
});
