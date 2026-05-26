# Course-info projection — Implementation Plan

> **Revised 2026-05-26 (post-review).** This plan was critically reviewed
> against the current `course-spec.ts` (371 LOC, `.strict()` everywhere) +
> its 324-line `course-spec.test.ts` (30+ test pins) + `integration.ts` +
> `figures-virtual-module.ts`. The original draft had three blockers that
> wouldn't execute (broken test fixture, dual-shape grading, broken
> `getStaticPaths`) and ~10 mechanical drifts. Anna resolved the
> architectural decision points in-thread; this revision integrates them.
> Review trail is at `~/.claude/plans/i-m-picking-up-the-peppy-fog.md`.
>
> **Anna's resolved decisions (2026-05-26):**
>
> | # | Decision | Choice |
> |---|---|---|
> | H1/H5 | Grading shape | **Replace v0.1 `assessment.grade_weights` with new `grading.categories`** (sum to 1.0; drop_lowest + late_policy_ref). ASTR 201 fixture migrates in-place; ADR 0080 v0.2 amendment documents the break. SoTA over simple per `feedback_no_backcompat_prelaunch`. |
> | H2 | Landing override | **Add `"custom"` to `landing.layout` enum.** One declarative path. |
> | H3 | `useCourseSpec()` hook | **Keep hook for test mockability.** Cleaner than vitest resolve.alias for virtual-module mocking. |
> | H4/B5 | `compose:` typing | **Strict union** (known data keys + `prose/<slug>` regex). Per ADR 0080 §5 strict-by-default. *Proceeding under Auto Mode; Anna corrects if she wants loose.* |
> | H6 | Phase 5 (iCal + schedule.yaml) | **Deferred to follow-up sprint.** ScheduleSchema needs its own focused design pass + ADR. This sprint ships Phases 1-4 + 6-7 only (renumbered to 1-4 + 5-6 below). |
>
> **Concrete revisions applied below:**
>
> 1. Task 1.1: reading list extended with existing `course-spec.test.ts` + `course-spec-astr-201.yaml` fixture.
> 2. Task 1.2: rewritten — extends the existing test file; uses `loadFixture()` as v0.1 base (per fix B1).
> 3. Task 1.3: v0.2 fields land in **sibling files** (ADR 0061 LOC budget — `course-spec.ts` already 371 LOC); `assessment.grade_weights` **removed**; `assessment.category_refs` added as audit-coverage pointer; all imports `.js`.
> 4. New Task 1.3a: `landing.layout: "custom"` enum value + schema test.
> 5. New Task 1.3b: `info_pages.compose:` strict union schema.
> 6. Task 1.7: structural `VitePluginLike` interface (mirror `figures-virtual-module.ts:12-16`); R8 HMR-strategy header comment.
> 7. Task 2.1: fake hook context uses `tmpdir` consumer fixture so `fs.existsSync` + `warnOnUnroutedPracticeMdx` don't throw.
> 8. Task 2.3: `info-page.astro` drops `getStaticPaths`; reads slug from `Astro.url.pathname` (per fix B3).
> 9. Verification gates: every phase adds `pnpm astro check` + Pagefind sanity check.
> 10. Phase 3 layouts: axe assertions cover desktop + 375 px.
> 11. **Phase 5 (iCal + schedule.yaml) removed.** Renumber Phase 6 → 5, Phase 7 → 6.
> 12. Phase 5 (formerly 6): explicit delete of ASTR 201's `src/pages/index.astro` + astro.config wiring step.
> 13. `useCourseSpec()` hook kept (per H3) with JSDoc explaining mockability rationale.
> 14. All imports use `.js` extensions per project ESM convention.
>
> ---

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:test-driven-development` for every task that adds behavior (test → fail → impl → pass → commit). Use `superpowers:verification-before-completion` before declaring any task done.

**Goal:** Ship the Tier-2 course-info projection — `course.sophie.yaml` v0.2 schema + prose-fragment collection + 7 injected routes (course landing, section landings, syllabus, schedule, instructor, policies, accommodations) + 5 chrome components — so every Sophie course gets navigable course-website chrome without per-page authoring. **iCal export (`/schedule.ics` + schedule.yaml) deferred to follow-up sprint per Anna's H6 decision** (ScheduleSchema needs its own design pass).

**Architecture:** Three-layer projection. Layer 1: `course.sophie.yaml` v0.2 carries structural data (grading, objectives, prereqs, contact, office hours, schedule_ref, info_pages, landing config). Layer 2: prose fragments at `src/content/course-info/` carry authored prose. Layer 3: composition layouts in `@sophie/components` read both and render pages. `defineSophieIntegration` injects all routes from the spec at config-setup. Single source → many views; updating the spec updates web + iCal + (future) PDF in lockstep.

**Tech Stack:** Zod 4 (schemas), Astro 6 (route injection, content collections, virtual modules), React 19 (chrome components + layouts), `@axe-core/playwright` (a11y assertions), Vitest 4 (unit tests), Playwright 1.59 (e2e), Biome 2 (lint/format), pnpm 11 workspaces, Turborepo 2.

**Pre-reading (don't skip):**
- `docs/plans/2026-05-26-course-info-projection-design.md` — the validated design this plan implements. Read the five locked decisions + the seven-phase sprint table before any task.
- `docs/website/decisions/0080-course-spec-format-v0-1.md` — current course-spec format being extended.
- `docs/website/decisions/0082-chapter-layout-extraction.md` — the route-injection precedent + `virtual:sophie/figures` pattern this plan mirrors.
- `docs/website/decisions/0067-section-level-artifacts.md` — Section/Unit/Artifact hierarchy.
- `docs/website/decisions/0058-epistemic-component-contract.md` — chrome-vs-pedagogy boundary.
- `AGENTS.md` — HITL mandate (confirm scope at every architectural decision point), W1-W4 working principles, R6-R11 standing review rules. Apply throughout.
- Project memory at `~/.claude/projects/-Users-anna-Teaching-sophie/memory/MEMORY.md` — especially `feedback_branch_pr_scope.md`, `feedback_no_backcompat_prelaunch.md`, `feedback_codebase_optimized_for_ai.md`, `feedback_review_rules_r6_r10.md`, `feedback_biome_verification.md`.

---

## Pre-work: worktree setup

### Task 0.1: Create the worktree

**Goal:** Isolated workspace per the worktree-location convention memory.

**Step 1:** Verify you're starting from a clean main:

```bash
cd /Users/anna/Teaching/sophie
git fetch origin main --quiet
git status -s
```

Expected: empty output (clean), HEAD at or behind origin/main.

**Step 2:** Create the worktree at the conventional location:

```bash
git worktree add -b feat/course-info-projection .worktrees/feat-course-info-projection origin/main
cd .worktrees/feat-course-info-projection
```

**Step 3:** Install deps:

```bash
pnpm install --frozen-lockfile
```

Expected: completes in ~10-20s, no errors. The `[WARN] Failed to create bin at .../sophie` warnings about `@sophie/cli` are benign — the CLI isn't built yet.

**Step 4:** Run baseline tests + biome to confirm worktree is healthy:

```bash
pnpm exec biome check 2>&1 | tail -3
```

Expected: `Checked 818 files in <1s. No fixes applied.` (zero errors, zero warnings).

```bash
cd packages/astro && pnpm vitest run 2>&1 | tail -5 && cd ../..
```

Expected: `Test Files  1 failed | 106 passed` — the one pre-existing failure is `index-generator.integration.test.ts` (needs the docs HTML build; CI handles it). All other tests pass.

**No commit yet** — task 0.1 is environment setup only.

---

## Phase 1 — Schema layer

### Task 1.1: Orientation — read the existing schema cluster + test file

**Goal:** Get oriented in the existing course-spec + pedagogy-index entries cluster + the **existing 324-line test file** (per fix B1).

**No code yet.** Read these end-to-end:

- `packages/core/src/schema/course-spec.ts` (371 LOC) — current v0.1 eight-section `.strict()` shape. **Note `assessment.grade_weights` — this is the field being replaced in Task 1.3.**
- `packages/core/src/schema/course-spec.test.ts` (324 LOC, 30+ tests) — **the v0.2 tests must extend this file, not replace it.** Note the `loadFixture()` pattern at lines 14-22 and the `valid()` helper at line 20.
- `packages/core/src/schema/__fixtures__/course-spec-astr-201.yaml` — the canonical v0.1 fixture; v0.2 tests spread this + add clusters.
- `packages/core/src/schema/pedagogy-index-entries/omi-flow.ts` — schema-cluster precedent (the OMIFlowEntry pattern).
- `packages/core/src/schema/pedagogy-index-entries/worked-example.ts` — most recent schema addition (PR #197).

You're modeling the v0.2 schema design after these — same Zod patterns, same docstring shape, same export-via-barrel discipline (ADR 0061 rule 1: focused files).

**No commit.** Orientation step.

### Task 1.2: Failing tests — `CourseSpecSchema` v0.2 (extend existing test file)

**Files:**
- Modify: `packages/core/src/schema/course-spec.test.ts` (existing 324-line file)
- Modify: `packages/core/src/schema/__fixtures__/course-spec-astr-201.yaml` (migrate grade_weights → grading.categories)

**Important context (per fix B1).** The existing test file pins ~30
invariants including `.strict()`-rejection of unknown top-level keys.
The v0.2 additions must:
1. Land as new top-level keys on the existing `.strict()` schema (`.strict()` is preserved; new keys are explicitly added to the object shape).
2. Migrate the existing fixture so `assessment.grade_weights` becomes `grading.categories` (per H1/H5 clean-break).
3. Update the existing "rejects weights not summing to 100" test → "rejects grading.categories weights not summing to 1.0" (rename + adjust expected error message).

**Step 1: Migrate `course-spec-astr-201.yaml` fixture.** Replace the
`assessment.grade_weights` block with `grading.categories` (rescaled to
sum to 1.0) + add a minimal `objectives`, `office_hours`, `contact`,
`accessibility`, `info_pages`, `landing` cluster matching the design doc.
Keep `assessment` (philosophy/homework_workflow/growth_memos/exam_policy)
but **remove `grade_weights`** and add `category_refs:` pointing into the
new `grading.categories[*].id` set.

**Step 2: Add new acceptance tests to `course-spec.test.ts`** under a
new `describe("CourseSpecSchema v0.2 — new clusters", ...)` block. Spread
the existing `valid()` fixture per the existing pattern (lines 24-64):

```ts
describe("CourseSpecSchema v0.2 — new clusters", () => {
  it("accepts objectives cluster", () => {
    const parsed = CourseSpecSchema.parse(valid());
    expect(parsed.objectives?.[0]?.id).toBeDefined();
  });

  it("accepts grading.categories summing to 1.0 (refine)", () => {
    const parsed = CourseSpecSchema.parse(valid());
    const sum = parsed.grading.categories.reduce((s, c) => s + c.weight, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it("accepts office_hours array", () => { /* ... */ });
  it("accepts contact with async_channel", () => { /* ... */ });
  it("accepts accessibility cluster", () => { /* ... */ });

  it("accepts info_pages with strict compose: union", () => {
    const data = valid();
    const broken = { ...data, info_pages: {
      syllabus: { layout: "SyllabusPage", compose: ["objectives", "prose/policies"] },
    }};
    expect(() => CourseSpecSchema.parse(broken)).not.toThrow();
  });

  it("rejects info_pages.compose entries that aren't known data keys or prose/<slug>", () => {
    const data = valid();
    const broken = { ...data, info_pages: {
      syllabus: { layout: "SyllabusPage", compose: ["objetctives"] },  // typo
    }};
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("accepts landing.layout: 'custom' (integration-override path)", () => { /* ... */ });

  it("defaults landing.layout to 'simple-list' when omitted", () => { /* ... */ });

  it.each(["units", "sections", "library", "_astro", "_server", "_image", "pagefind"])(
    "rejects info_pages slug colliding with reserved set: %s",
    (reserved) => {
      const data = valid();
      const broken = { ...data, info_pages: { [reserved]: { layout: "SyllabusPage" } }};
      expect(() => CourseSpecSchema.parse(broken)).toThrow(/reserved/i);
    }
  );
});

describe("CourseSpecSchema v0.2 — grade_weights → grading migration (clean break)", () => {
  it("rejects the old assessment.grade_weights shape (clean break per ADR 0080 v0.2)", () => {
    const data = valid();
    const broken = { ...data, assessment: { ...data.assessment, grade_weights: [
      { category: "hw", weight: 100, label: "HW" },
    ]}};
    expect(() => CourseSpecSchema.parse(broken)).toThrow();
  });

  it("rejects grading.categories weights not summing to 1.0", () => {
    const data = valid();
    const broken = { ...data, grading: { ...data.grading, categories: [
      { id: "hw", name: "HW", weight: 0.5 },
      { id: "fn", name: "Final", weight: 0.49 },
    ]}};
    expect(() => CourseSpecSchema.parse(broken)).toThrow(/sum to 1\.0/);
  });

  it("requires assessment.category_refs to reference declared grading.categories", () => { /* ... */ });
});
```

**Step 3: Update the existing v0.1 test** at line 67-90 ("rejects
weights not summing to 100") — rename to reference `grading.categories`
+ test the 1.0-sum invariant. The old fixture file `invalid/weights-not-100.yaml`
gets renamed to `invalid/category-weights-not-one.yaml` + updated.

**Step 4: Run tests — expect FAIL:**

```bash
cd packages/core && pnpm vitest run src/schema/course-spec.test.ts 2>&1 | tail -15
```

Expected: the new v0.2 tests fail (schemas don't exist yet); the existing
tests that referenced `grade_weights` also fail until Task 1.3 ships.

**No commit until impl + test pass together (Task 1.3).**

### Task 1.3: Implement `CourseSpecSchema` v0.2 (sibling files; remove grade_weights)

**Files (per fix M7 — ADR 0061 LOC budget; current `course-spec.ts` is 371 LOC):**
- Create: `packages/core/src/schema/course-spec-v02-objectives.ts`
- Create: `packages/core/src/schema/course-spec-v02-prereqs.ts`
- Create: `packages/core/src/schema/course-spec-v02-grading.ts` (replaces `assessment.grade_weights`)
- Create: `packages/core/src/schema/course-spec-v02-office-hours.ts`
- Create: `packages/core/src/schema/course-spec-v02-contact.ts`
- Create: `packages/core/src/schema/course-spec-v02-accessibility.ts`
- Create: `packages/core/src/schema/course-spec-v02-info-pages.ts` (includes ComposeEntrySchema strict union per H4/B5)
- Create: `packages/core/src/schema/course-spec-v02-landing.ts` (includes "custom" enum value per H2)
- Modify: `packages/core/src/schema/course-spec.ts` (barrel + extend `CourseSpecSchema` + remove `grade_weights`; add `category_refs`)

**Step 1: Read the current file** to find `AssessmentSectionSchema` (lines ~170-240) — this is the one structural mutation, not just additive.

**Step 2: Author each sibling file.** All imports use `.js` (per fix B8). Pattern (using grading as example):

```ts
// packages/core/src/schema/course-spec-v02-grading.ts
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

export const GradingCategorySchema = z.object({
  id: Slug,
  name: NonEmptyString,
  weight: z.number().min(0).max(1),
  count: z.number().int().positive().optional(),
  drop_lowest: z.number().int().nonnegative().optional(),
  late_policy_ref: z.string().regex(/^prose\//).optional(),
}).strict();
export type GradingCategory = z.infer<typeof GradingCategorySchema>;

export const LetterScaleEntrySchema = z.object({
  grade: NonEmptyString,
  min: z.number().min(0).max(100),
}).strict();

export const GradingSchema = z.object({
  categories: z.array(GradingCategorySchema)
    .min(1)
    .refine(
      (cats) => Math.abs(cats.reduce((s, c) => s + c.weight, 0) - 1.0) < 0.001,
      { message: "grading.categories weights must sum to 1.0 (±0.001)" }
    ),
  letter_scale: z.array(LetterScaleEntrySchema).min(1),
  curve_policy_ref: z.string().regex(/^prose\//).optional(),
}).strict();
```

```ts
// packages/core/src/schema/course-spec-v02-info-pages.ts
import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

// Strict union per H4/B5 — known data keys OR prose/<slug> regex.
// Defends the class at the schema layer rather than surfacing typos at
// runtime in the compose evaluator (Phase 3).
const KNOWN_COMPOSE_DATA_KEYS = [
  "objectives", "prereqs", "grading", "office_hours",
  "accessibility", "contact", "schedule_overview",
] as const;

export const ComposeEntrySchema = z.union([
  z.enum(KNOWN_COMPOSE_DATA_KEYS),
  z.string().regex(/^prose\/[a-z][a-z0-9-]*$/, "prose-fragment ref must be prose/<kebab-slug>"),
]);
export type ComposeEntry = z.infer<typeof ComposeEntrySchema>;

export const InfoPageDeclarationSchema = z.object({
  layout: NonEmptyString,
  compose: z.array(ComposeEntrySchema).optional(),
  prose: z.string().regex(/^prose\//).optional(),
}).strict();

// Reserved slugs defend the slug-collision class at the schema layer.
// Includes Sophie-injected routes (units, sections) + Astro internal
// prefixes + Pagefind output dir. Bridge slugs (library) reserved for
// future ADR 0068 work.
const RESERVED_SLUGS = new Set([
  "units", "sections", "library", "_astro", "_server", "_image", "pagefind",
]);

export const InfoPagesSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9-]*$/, "info_pages key must be lowercase-kebab-case slug"),
  InfoPageDeclarationSchema
).refine(
  (pages) => Object.keys(pages).every((slug) => !RESERVED_SLUGS.has(slug)),
  { message: `info_pages slug is reserved (${[...RESERVED_SLUGS].join(", ")})` }
);
```

```ts
// packages/core/src/schema/course-spec-v02-landing.ts
import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

// "custom" per H2 — explicit schema declaration that the integration
// override path (defineSophieIntegration({ landings: { course } }))
// is in effect. Otherwise schema enum default applies.
export const LandingSchema = z.object({
  layout: z.enum(["hero-with-modules", "simple-list", "prose-with-toc", "custom"])
    .default("simple-list"),
  hero: z.object({
    title: z.string().optional(),
    tagline: z.string().optional(),
    image_ref: z.string().optional(),
    cta: z.object({
      label: NonEmptyString,
      href: NonEmptyString,
    }).strict().optional(),
  }).strict().optional(),
  show_announcements: z.boolean().optional(),
}).strict();
```

Other sibling files (`objectives`, `prereqs`, `office-hours`, `contact`,
`accessibility`) follow the same shape — pure Zod, `.strict()` everywhere,
`.js` imports, type-exports via `z.infer`. Each is ~30-50 LOC.

**Step 3: Wire into `course-spec.ts` barrel + mutate `AssessmentSectionSchema`.**

```ts
// packages/core/src/schema/course-spec.ts (extend, not rewrite)
import { GradingSchema, type GradingCategory } from "./course-spec-v02-grading.js";
import { InfoPagesSchema } from "./course-spec-v02-info-pages.js";
import { LandingSchema } from "./course-spec-v02-landing.js";
// ... other v02 imports

// MUTATION (per H1/H5 clean break): assessment.grade_weights is REMOVED.
// assessment.category_refs is added as an audit-coverage pointer into
// grading.categories[*].id. Audit invariants (QB6/QB7) can now verify
// "every grading category is referenced by ≥1 assessment surface."
const AssessmentSectionSchema = z
  .object({
    philosophy: NonEmptyString,
    category_refs: z.array(Slug).min(1),  // ← REPLACES grade_weights
    homework_workflow: HomeworkWorkflowSchema.optional(),
    growth_memos: GrowthMemosSchema.optional(),
    exam_policy: ExamPolicySchema.optional(),
  })
  .strict();
// NOTE: the existing .refine() on grade_weights summing to 100 is REMOVED
// (the new sum-to-1.0 invariant lives on GradingSchema).

export const CourseSpecSchema = z.object({
  identity: IdentitySchema,
  audience: AudienceSchema,
  pedagogy: PedagogySchema,
  terminal_goals: z.array(TerminalGoalSchema).min(1),
  principles: z.array(PrincipleSchema).default([]),
  assessment: AssessmentSectionSchema,         // ← mutated (category_refs)
  grading: GradingSchema,                      // ← NEW (required at v0.2; replaces grade_weights)
  quality_bars: QualityBarsSchema,
  discovery: DiscoverySchema,
  spec_version: z.literal(COURSE_SPEC_VERSION),
  schema: z.literal(COURSE_SPEC_SCHEMA_ID),
  // v0.2 additive (optional — courses can opt into chrome incrementally):
  objectives: z.array(ObjectiveSchema).optional(),
  prereqs: z.array(PrereqSchema).optional(),
  office_hours: z.array(OfficeHourSchema).optional(),
  contact: ContactSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
  info_pages: InfoPagesSchema.optional(),
  landing: LandingSchema.optional(),
}).strict();
export type CourseSpec = z.infer<typeof CourseSpecSchema>;
```

Cross-refine: add a top-level `.refine()` asserting every
`assessment.category_refs` entry exists in `grading.categories[*].id`.

**Step 3: Run tests — expect PASS:**

```bash
cd packages/core && pnpm vitest run src/schema/course-spec.test.ts 2>&1 | tail -10
```

Expected: 5/5 pass.

**Step 4: Run biome on all new + touched files:**

```bash
pnpm exec biome check --write packages/core/src/schema/ 2>&1 | tail -3
```

Expected: no errors. Auto-fix may rearrange imports — that's fine.

**Step 5: Commit:**

```bash
git add packages/core/src/schema/
git commit -m "feat(core): CourseSpecSchema v0.2 — replace grade_weights with grading; add chrome clusters

Clean break per ADR 0080 v0.2 (no back-compat pre-launch per feedback_no_backcompat_prelaunch):
- assessment.grade_weights REMOVED; replaced by required grading.categories
  (sum to 1.0 ±0.001) + assessment.category_refs (audit-coverage pointer)
- grading.categories adds drop_lowest? + late_policy_ref? for richer
  audit invariants (QB6/QB7) than the v0.1 grade_weights shape supported

Additive v0.2 chrome clusters (all optional; courses opt in incrementally):
- ObjectiveSchema + PrereqSchema for course-level LOs + prereqs
- OfficeHourSchema (modality enum, HH:MM regex, by_appointment)
- ContactSchema (email validation, async_channel)
- AccessibilitySchema (DRC link, request_deadline_weeks)
- InfoPagesSchema with strict compose: union (known data keys |
  prose/<slug>) + reserved-slug refinement
- LandingSchema with 'custom' enum value for integration-override path

Sibling-file layout per ADR 0061 LOC budget (course-spec.ts was 371 LOC):
  course-spec-v02-{grading,info-pages,landing,objectives,...}.ts

Phase 1 of the course-info-projection sprint
(docs/plans/2026-05-26-course-info-projection-design.md +
docs/plans/2026-05-26-course-info-projection-implementation.md
post-review revision)."
```

### Task 1.4: Re-export new types from `@sophie/core/schema` barrel

**Files:**
- Modify: `packages/core/src/schema/index.ts`

**Step 1: Add the new type + schema exports** alongside the existing `CourseSpecSchema` export. Run a grep first to find the existing export line:

```bash
grep -n "CourseSpecSchema\|export.*course-spec" packages/core/src/schema/index.ts
```

**Step 2: Edit the barrel** to add (alphabetical-ish, mirror existing style):

```ts
export {
  type CourseSpec,
  CourseSpecSchema,
  type GradingCategory,
  type Objective,
  type OfficeHour,
  type Prereq,
  validateCourseSpec,  // if it exists; check current barrel
} from "./course-spec.js";
```

**Step 3: Verify the barrel still type-checks:**

```bash
cd packages/core && pnpm typecheck 2>&1 | tail -3
```

Expected: `tsc --noEmit` clean.

**Step 4: Rebuild `@sophie/core` dist** so downstream packages can see the new exports:

```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm turbo run build --filter=@sophie/core --force 2>&1 | tail -3
```

Expected: build success; new types in `dist/schema/index.d.ts`.

**Step 5: Commit:**

```bash
git add packages/core/src/schema/index.ts
git commit -m "feat(core): re-export v0.2 course-spec types from @sophie/core/schema barrel"
```

### Task 1.5: Failing test — `CourseInfoFragmentSchema` for prose fragments

**Files:**
- Test: `packages/astro/src/lib/course-info-fragment-schema.test.ts` (new)

**Step 1: Write the test:**

```ts
import { describe, expect, test } from "vitest";
import { CourseInfoFragmentSchema } from "./course-info-fragment-schema.ts";

describe("CourseInfoFragmentSchema", () => {
  test("accepts minimal frontmatter (title only)", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "Instructor — Anna Rosen",
    });
    expect(result.success).toBe(true);
  });

  test("accepts full frontmatter", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "Course policies",
      description: "Late-work, attendance, academic integrity.",
      last_revised: "2026-05-26",
      ai_contribution: {
        visibility: "public",
        models: ["claude-opus-4-7"],
        review_depth: "manual",
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing title", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      description: "no title",
    });
    expect(result.success).toBe(false);
  });

  test("rejects malformed last_revised", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "x",
      last_revised: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run — expect FAIL:**

```bash
cd packages/astro && pnpm vitest run src/lib/course-info-fragment-schema.test.ts 2>&1 | tail -5
```

Expected: `Cannot find module './course-info-fragment-schema.ts'`.

### Task 1.6: Implement `CourseInfoFragmentSchema`

**Files:**
- Create: `packages/astro/src/lib/course-info-fragment-schema.ts`

```ts
import { z } from "zod";

/**
 * Frontmatter schema for prose fragments in `src/content/course-info/`
 * (course-info-projection design, 2026-05-26). Filename slug *is* the id;
 * no `id` field. Validated at build time by the Astro content collection.
 *
 * AI-contribution mirror: ADR 0042 — visibility/models/review_depth.
 */
export const CourseInfoFragmentSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  last_revised: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD")
    .optional(),
  ai_contribution: z.object({
    visibility: z.enum(["public", "private"]),
    models: z.array(z.string()).optional(),
    review_depth: z.string().optional(),
  }).optional(),
});

export type CourseInfoFragment = z.infer<typeof CourseInfoFragmentSchema>;
```

**Step 2: Run tests — expect PASS:**

```bash
pnpm vitest run src/lib/course-info-fragment-schema.test.ts 2>&1 | tail -5
```

Expected: 4/4 pass.

**Step 3: Biome:**

```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm exec biome check --write packages/astro/src/lib/course-info-fragment-schema.ts packages/astro/src/lib/course-info-fragment-schema.test.ts 2>&1 | tail -3
```

**Step 4: Commit:**

```bash
git add packages/astro/src/lib/course-info-fragment-schema.ts packages/astro/src/lib/course-info-fragment-schema.test.ts
git commit -m "feat(astro): CourseInfoFragmentSchema for prose fragments

Validates frontmatter of src/content/course-info/<slug>.mdx files.
Filename slug is the id; no id field. ADR 0042 ai_contribution mirror."
```

### Task 1.7: Add `virtual:sophie/course-spec` virtual module

**Files:**
- Create: `packages/astro/src/lib/course-spec-virtual-module.ts` (mirrors `figures-virtual-module.ts`)
- Test: `packages/astro/src/lib/course-spec-virtual-module.test.ts`

**Step 1: Read the precedent:**

```bash
cat packages/astro/src/lib/figures-virtual-module.ts
```

**Critical patterns to mirror (per fixes B7 + M6):**
- **Structural `VitePluginLike` interface** at lines 12-16; NOT `import("vite").Plugin`. `@sophie/astro` resolves to vite@8 while Astro 6 ships vite@7 types — two `Plugin` shapes coexist and TS structural-checks them as incompatible. The cast bypasses the version mismatch only.
- **R8 HMR-strategy header comment** declaring: "closure-captured at config-setup time; figures changes do not HMR — editing course.sophie.yaml requires a dev-server restart. This is deliberate per ADR 0082 § Consequences (mirrors figures-virtual-module)."
- **Null-byte prefix on resolved ID** (`\0virtual:sophie/course-spec`) — Vite's convention for marking IDs as "do not externalize."

**Step 2: Write the failing test first:**

```ts
import { describe, expect, test } from "vitest";
import type { CourseSpec } from "@sophie/core/schema";
import { courseSpecVirtualModule } from "./course-spec-virtual-module.ts";

describe("courseSpecVirtualModule", () => {
  const exampleSpec: CourseSpec = {
    identity: {
      id: "test-101",
      title: "Test Course",
      code: "TEST 101",
      term: "Spring 2027",
      institution: "Test U",
      instructor: "Test Instructor",
      voice: "test",
      voice_register: "test",
    },
    objectives: [{ id: "lo-1", verb: "Test", body: "the schema" }],
  };

  test("resolves the virtual module id", () => {
    const plugin = courseSpecVirtualModule(exampleSpec);
    expect(plugin.name).toMatch(/course-spec/);
    // @ts-expect-error — resolveId is on the plugin interface but typed loosely
    const resolved = plugin.resolveId?.("virtual:sophie/course-spec");
    expect(resolved).toBe("\0virtual:sophie/course-spec");
  });

  test("emits the spec as `export const courseSpec = ...`", () => {
    const plugin = courseSpecVirtualModule(exampleSpec);
    // @ts-expect-error — load is on the plugin interface but typed loosely
    const loaded = plugin.load?.("\0virtual:sophie/course-spec");
    expect(loaded).toContain("export const courseSpec");
    expect(loaded).toContain("test-101");
    expect(loaded).toContain("lo-1");
  });

  test("returns undefined for non-matching ids", () => {
    const plugin = courseSpecVirtualModule(exampleSpec);
    // @ts-expect-error
    expect(plugin.resolveId?.("not-virtual")).toBeUndefined();
    // @ts-expect-error
    expect(plugin.load?.("\0other:module")).toBeUndefined();
  });
});
```

**Step 3: Run — expect FAIL:**

```bash
pnpm vitest run src/lib/course-spec-virtual-module.test.ts 2>&1 | tail -5
```

**Step 4: Implement (mirror figures-virtual-module.ts shape exactly):**

```ts
import type { CourseSpec } from "@sophie/core/schema";

/**
 * Structural type for the minimal Vite plugin shape we return.
 * Mirrors `figures-virtual-module.ts` (per fix B7) to dodge the
 * vite@7-vs-vite@8 type collision: @sophie/astro resolves to vite@8
 * while Astro 6 ships vite@7 types; the two `Plugin` shapes are
 * structurally-incompatible at the TS level. Keeping the type local
 * + inferable bypasses the version mismatch.
 */
interface VitePluginLike {
  name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
}

/**
 * Vite plugin that exposes the consumer's `course.sophie.yaml` (parsed
 * + validated by course-spec-loader) as a virtual module. Chrome
 * components + layouts import it via:
 *
 *   import { courseSpec } from "virtual:sophie/course-spec";
 *
 * **R8 HMR strategy declaration.** The spec is **closure-captured at
 * config-setup time**. Production builds and dev mode both bake the
 * spec literal once; editing course.sophie.yaml requires a dev-server
 * restart. No `handleHotUpdate` hook is exposed — the no-HMR semantics
 * are structural, not "easy to forget." Mirrors the figures-virtual-
 * module trade-off per ADR 0082 § Consequences (the spec is global
 * course state; rare edits; dev-restart cost acceptable).
 */
export const COURSE_SPEC_VIRTUAL_ID = "virtual:sophie/course-spec";
const RESOLVED_ID = `\0${COURSE_SPEC_VIRTUAL_ID}`;

export function courseSpecVirtualModule(spec: CourseSpec): VitePluginLike {
  // JSON.stringify is sufficient because the validated CourseSpec is
  // plain JSON (no functions, Maps, Dates, etc. — every Zod field
  // resolves to a JSON-serializable primitive or array/object thereof).
  const literal = JSON.stringify(spec);
  return {
    name: "sophie:course-spec",
    resolveId(id: string): string | undefined {
      if (id === COURSE_SPEC_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },
    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      return `export const courseSpec = ${literal};\n`;
    },
  };
}
```

**Step 5: Run + biome + commit:**

```bash
pnpm vitest run src/lib/course-spec-virtual-module.test.ts 2>&1 | tail -5
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm exec biome check --write packages/astro/src/lib/course-spec-virtual-module.ts packages/astro/src/lib/course-spec-virtual-module.test.ts 2>&1 | tail -3
git add packages/astro/src/lib/course-spec-virtual-module.ts packages/astro/src/lib/course-spec-virtual-module.test.ts
git commit -m "feat(astro): virtual:sophie/course-spec module (mirrors virtual:sophie/figures)

Exposes the consumer's parsed course.sophie.yaml as a virtual module so
chrome components + layouts can read structured course-info data
without hand-passing props through every level."
```

### Task 1.8: Add `course-spec-loader.ts` — read + parse `course.sophie.yaml` at config-setup

**Files:**
- Create: `packages/astro/src/lib/course-spec-loader.ts`
- Test: `packages/astro/src/lib/course-spec-loader.test.ts`

**Step 1: Failing test using `tmpdir`:**

```ts
import fs from "node:fs";
import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadCourseSpec } from "./course-spec-loader.ts";

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

  test("loads + parses valid v0.1 spec", () => {
    fs.writeFileSync(
      path.join(root, "course.sophie.yaml"),
      `identity:\n  id: test-101\n  title: Test\n  code: TEST 101\n  term: Spring 2027\n  institution: Test U\n  instructor: T\n  voice: t\n  voice_register: t\n`
    );
    const spec = loadCourseSpec(root);
    expect(spec?.identity.id).toBe("test-101");
  });

  test("throws on malformed YAML", () => {
    fs.writeFileSync(path.join(root, "course.sophie.yaml"), "identity:\n  - this is not\n    a valid spec");
    expect(() => loadCourseSpec(root)).toThrow();
  });

  test("throws on schema-invalid spec (missing identity)", () => {
    fs.writeFileSync(path.join(root, "course.sophie.yaml"), "objectives: []\n");
    expect(() => loadCourseSpec(root)).toThrow(/identity/i);
  });
});
```

**Step 2: Implement:**

```ts
import fs from "node:fs";
import path from "node:path";
import { type CourseSpec, CourseSpecSchema } from "@sophie/core/schema";
import { parse as parseYaml } from "yaml";

/**
 * Load + validate `<consumerRoot>/course.sophie.yaml`. Returns null when
 * the file is absent (consumer hasn't authored a spec yet). Throws with
 * a curated error when the file exists but is malformed or
 * schema-invalid — those are author errors that must surface at config-
 * setup, not silently degrade to "no chrome routes."
 */
export function loadCourseSpec(consumerRoot: string): CourseSpec | null {
  const specPath = path.join(consumerRoot, "course.sophie.yaml");
  if (!fs.existsSync(specPath)) return null;
  const source = fs.readFileSync(specPath, "utf8");
  const raw = parseYaml(source);
  const result = CourseSpecSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[sophie] course.sophie.yaml is schema-invalid:\n${result.error.message}`
    );
  }
  return result.data;
}
```

**Step 3: Run + biome + commit:**

```bash
cd packages/astro && pnpm vitest run src/lib/course-spec-loader.test.ts 2>&1 | tail -5
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm exec biome check --write packages/astro/src/lib/course-spec-loader.ts packages/astro/src/lib/course-spec-loader.test.ts 2>&1 | tail -3
git add packages/astro/src/lib/course-spec-loader.ts packages/astro/src/lib/course-spec-loader.test.ts
git commit -m "feat(astro): course-spec-loader reads + validates course.sophie.yaml at config-setup"
```

### Task 1.9: Wire course-spec into integration

**Files:**
- Modify: `packages/astro/src/integration.ts`

**Step 1: Read the current integration to find where `astro:config:setup` is:**

```bash
grep -n "astro:config:setup\|figuresVirtualModule\|injectRoute" packages/astro/src/integration.ts | head -10
```

**Step 2: Add the spec load + virtual-module wire-up.** At the top of `astro:config:setup`, after `consumerRoot` is resolved:

```ts
// Load + validate course.sophie.yaml at config-setup. Returns null when
// the consumer hasn't authored a spec yet (back-compat with pre-v0.2
// consumer apps); throws on malformed/invalid spec (author error).
const consumerRoot = fileURLToPath(config.root);
const courseSpec = loadCourseSpec(consumerRoot);
```

Then add `courseSpecVirtualModule(courseSpec)` to the `vite.plugins` array — but guard it (skip when `courseSpec === null` so back-compat consumers still build):

```ts
plugins: [
  pedagogyIndexVirtualModule() as never,
  skillReviewResolverVitePlugin({ topicsDir }) as never,
  figuresVirtualModule(options.figures) as never,
  mdxAuthorTrapsVitePlugin() as never,
  // course-info projection (2026-05-26): expose the spec as a virtual
  // module so chrome components + layouts can read structured data.
  // Null spec = consumer hasn't authored course.sophie.yaml yet → skip.
  ...(courseSpec ? [courseSpecVirtualModule(courseSpec) as never] : []),
],
```

Add the imports:

```ts
import { loadCourseSpec } from "./lib/course-spec-loader.ts";
import { courseSpecVirtualModule } from "./lib/course-spec-virtual-module.ts";
```

**Step 3: Biome + smoke-build sanity-check:**

```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm exec biome check --write packages/astro/src/integration.ts 2>&1 | tail -3
pnpm turbo run build --filter=@sophie/astro --force 2>&1 | tail -5
```

Expected: builds clean. Smoke fixture has no `course.sophie.yaml` yet, so the spec is `null` and the virtual module isn't loaded — no regression on existing build.

**Step 4: Commit:**

```bash
git add packages/astro/src/integration.ts
git commit -m "feat(astro): wire course-spec loader + virtual:sophie/course-spec into integration

Null spec is treated as 'not yet authored' (back-compat with pre-v0.2
consumers); virtual module skipped in that case. Malformed/invalid spec
throws at config-setup with a curated error per AGENTS.md verify-before-
claiming discipline."
```

### Task 1.10: Phase 1 verification

Run the gates that AGENTS.md requires before declaring a phase done:

```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm exec biome check 2>&1 | tail -3
```

Expected: ~830 files (new schema files raise the count), 0 errors, 0 warnings.

```bash
cd packages/core && pnpm vitest run 2>&1 | tail -5
cd ../astro && pnpm vitest run 2>&1 | tail -5
```

Expected: all new tests pass; the pre-existing `index-generator.integration.test.ts` failure is the only red.

```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection/docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"
```

Expected: `0`.

**Astro check** (per fix M3):
```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm turbo run check --filter=@sophie/astro --filter=smoke 2>&1 | tail -3
```

Expected: 0 errors. The new virtual module + loader must type-check cleanly.

**Phase 1 done.** Schema layer + virtual module live. Pause + report to Anna before Phase 2.

---

## Phase 2 — Route injection + landing layouts

### Task 2.1: Failing test — integration injects landing + section-landing routes when spec is present

**Files:**
- Test: `packages/astro/src/integration.test.ts` (extend or create)

**Step 1: Look for existing integration tests:**

```bash
ls packages/astro/src/integration.test.ts 2>&1
```

If absent, create. If present, extend.

**Step 2: Write a test that verifies route injection is called with `/` + `/sections/[section]/` when a spec is loaded.**

The integration calls `injectRoute()` via the Astro hook context. Use a fake hook context that captures calls:

```ts
import { describe, expect, test, vi } from "vitest";
import { defineSophieIntegration } from "./integration.ts";

describe("defineSophieIntegration — route injection (course-info projection)", () => {
  test("injects /, /sections/[section]/, and /units/[unit]/reading when course.sophie.yaml is present", () => {
    // Build a fake AstroIntegrationLogger + config object
    const calls: Array<{ pattern: string; entrypoint: string }> = [];
    const injectRoute = vi.fn((args: { pattern: string; entrypoint: string }) => {
      calls.push({ pattern: args.pattern, entrypoint: args.entrypoint });
    });
    const updateConfig = vi.fn();
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as never;

    // Pre-shim a fake consumer root with a minimal v0.1 spec
    // (Use tmpdir + writeFileSync per the course-spec-loader.test.ts
    // precedent. Wrap setup/teardown in beforeEach/afterEach.)
    // ... (see precedent course-spec-loader.test.ts)

    const integration = defineSophieIntegration({ figures: {} });
    const setupHook = integration.hooks["astro:config:setup"];
    if (!setupHook) throw new Error("integration missing astro:config:setup hook");
    setupHook({
      config: { root: new URL(`file://${fakeRoot}/`) },
      injectRoute,
      updateConfig,
      logger,
    } as never);

    const patterns = calls.map((c) => c.pattern);
    expect(patterns).toContain("/units/[unit]/reading");  // existing
    expect(patterns).toContain("/");                      // new
    expect(patterns).toContain("/sections/[section]/");   // new
  });
});
```

**Step 3: Run + expect FAIL** (the new routes aren't injected yet).

### Task 2.2: Implement landing + section-landing route injection in integration

**Files:**
- Modify: `packages/astro/src/integration.ts`

**Step 1: After the existing `injectRoute({ pattern: "/units/[unit]/reading", … })` call, add:**

```ts
// course-info projection: course-level + section-level landing routes.
// Only inject when the consumer has a spec (otherwise back-compat with
// pre-v0.2 consumer apps stays intact).
if (courseSpec) {
  injectRoute({
    pattern: "/",
    entrypoint: "@sophie/astro/routes/course-landing.astro",
  });
  injectRoute({
    pattern: "/sections/[section]/",
    entrypoint: "@sophie/astro/routes/section-landing.astro",
  });
  for (const slug of Object.keys(courseSpec.info_pages ?? {})) {
    injectRoute({
      pattern: `/${slug}/`,
      entrypoint: "@sophie/astro/routes/info-page.astro",
    });
  }
}
```

**Step 2: Add shadow-warn for the new routes** — extend the existing pattern at line ~143-158 (per ADR 0082 §A2.6). For each injected slug, check `<consumerRoot>/src/pages/<slug>.astro` + warn.

**Step 3: Run integration test — expect PASS.**

**Step 4: Run smoke build to verify nothing broke** (smoke has no spec yet → routes don't inject):

```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm turbo run build --filter=smoke --force 2>&1 | tail -5
```

**Step 5: Commit:**

```bash
git add packages/astro/src/integration.ts packages/astro/src/integration.test.ts
git commit -m "feat(astro): inject course landing + section landing + info-page routes when course.sophie.yaml present

Spec-driven route injection per the projection-pattern design. Back-compat:
consumers without course.sophie.yaml don't get any new routes (existing
/units/[unit]/reading continues to work). Shadow-warn mirrors ADR 0082
§A2.6 for the new slugs."
```

### Task 2.3: Create the route entry-points (3 .astro files; all dispatch to consumer-overridable layouts)

**Files:**
- Create: `packages/astro/src/routes/course-landing.astro`
- Create: `packages/astro/src/routes/section-landing.astro`
- Create: `packages/astro/src/routes/info-page.astro`

These are dispatcher routes — they read the spec via `virtual:sophie/course-spec` + look up the right layout + render.

**course-landing.astro:**

```astro
---
import { courseSpec } from "virtual:sophie/course-spec";
import HeroWithModules from "@sophie/components/CourseLanding/HeroWithModules";
import SimpleList from "@sophie/components/CourseLanding/SimpleList";
import ProseWithToc from "@sophie/components/CourseLanding/ProseWithToc";
import { getCollection } from "astro:content";

const LAYOUTS = {
  "hero-with-modules": HeroWithModules,
  "simple-list": SimpleList,
  "prose-with-toc": ProseWithToc,
};

const layoutKey = courseSpec.landing?.layout ?? "simple-list";
const Layout = LAYOUTS[layoutKey] ?? SimpleList;

const sections = (await getCollection("sections")).map((s) => s.data);
const units = (await getCollection("units")).map((u) => u.data);
---

<Layout
  client:load
  spec={courseSpec}
  sections={sections}
  units={units}
/>
```

**section-landing.astro:**

```astro
---
import { courseSpec } from "virtual:sophie/course-spec";
import SectionLanding from "@sophie/components/SectionLanding";
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const sections = (await getCollection("sections")).map((s) => s.data);
  return sections.map((section) => ({
    params: { section: section.slug },
    props: { section },
  }));
}

const { section } = Astro.props;
const units = (await getCollection("units"))
  .map((u) => u.data)
  .filter((u) => u.section_id === section.slug);
---

<SectionLanding
  client:load
  spec={courseSpec}
  section={section}
  units={units}
/>
```

**info-page.astro** (revised per fix B3 — drop `getStaticPaths`; each
injected slug route is a parameter-less static URL, so the dispatcher
reads the slug from `Astro.url.pathname` at render time):

```astro
---
import { courseSpec } from "virtual:sophie/course-spec";
import SyllabusPage from "@sophie/components/SyllabusPage";
import SchedulePage from "@sophie/components/SchedulePage";
import InstructorPage from "@sophie/components/InstructorPage";
import PoliciesPage from "@sophie/components/PoliciesPage";
import AccommodationsPage from "@sophie/components/AccommodationsPage";

const LAYOUTS = {
  SyllabusPage, SchedulePage, InstructorPage, PoliciesPage, AccommodationsPage,
};

// Each info_pages entry is injected as its OWN static route by
// defineSophieIntegration (e.g. /syllabus/, /policies/). There is no
// [param] segment in the URL pattern, so getStaticPaths does not apply.
// Read the slug from the URL at render time; spec lookup gives us the
// layout + composition declaration.
const slug = Astro.url.pathname.replace(/^\/|\/$/g, "");
const decl = courseSpec.info_pages?.[slug];
if (!decl) {
  throw new Error(
    `[sophie] info-page.astro: no info_pages[${slug}] declared in course.sophie.yaml. ` +
      `The integration injected /${slug}/ but the spec doesn't carry a declaration for it. ` +
      `This is a build-time invariant violation — check course.sophie.yaml's info_pages block.`
  );
}
const Layout = LAYOUTS[decl.layout as keyof typeof LAYOUTS];
if (!Layout) {
  throw new Error(`[sophie] info_pages[${slug}].layout '${decl.layout}' not in shipped layouts`);
}
---

<Layout client:load spec={courseSpec} decl={decl} />
```

**Step 1: Create the three files.** Build will fail because the layout components don't exist yet — that's expected; subsequent tasks create them.

**Step 2: Commit (deferred until first layout exists so build doesn't break — fold into Task 2.4's commit).**

### Task 2.4: Build the `SimpleList` landing (the always-on default)

**Files:**
- Create: `packages/components/src/components/CourseLanding/SimpleList.tsx`
- Create: `packages/components/src/components/CourseLanding/SimpleList.module.css`
- Create: `packages/components/src/components/CourseLanding/SimpleList.test.tsx`

**Step 1: Failing test (axe + structure):**

```tsx
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import SimpleList from "./SimpleList.tsx";

expect.extend(toHaveNoViolations);

describe("CourseLanding/SimpleList", () => {
  const spec = { /* minimal v0.2 spec with title + a few sections + units */ };
  const sections = [{ slug: "foundations", title: "Foundations", order: 1, status: "stable" }];
  const units = [{ id: "spoiler-alerts", title: "Spoiler Alerts", section_id: "foundations", order: 1, status: "stable" }];

  test("renders course title as h1", () => {
    const { container } = render(<SimpleList spec={spec as never} sections={sections as never} units={units as never} />);
    expect(container.querySelector("h1")?.textContent).toContain(spec.identity.title);
  });

  test("renders each section + its units", () => {
    const { container } = render(<SimpleList spec={spec as never} sections={sections as never} units={units as never} />);
    expect(container.querySelectorAll(".sophie-section")).toHaveLength(1);
    expect(container.querySelectorAll(".sophie-unit-link")).toHaveLength(1);
  });

  test("axe-clean", async () => {
    const { container } = render(<SimpleList spec={spec as never} sections={sections as never} units={units as never} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Step 2: Run — expect FAIL.**

**Step 3: Implement** — `<main>` landmark (course landing IS the top-level main per R10 — it's a page-level shell, not nested under another landmark), `<h1>` with course title, sectional list with section headers + nested unit links.

```tsx
import type { CourseSpec, SectionEntry, UnitEntry } from "@sophie/core/schema";
import styles from "./SimpleList.module.css";

interface SimpleListProps {
  spec: CourseSpec;
  sections: ReadonlyArray<SectionEntry>;
  units: ReadonlyArray<UnitEntry>;
}

export default function SimpleList({ spec, sections, units }: SimpleListProps) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{spec.identity.title}</h1>
      {spec.identity.subtitle && <p className={styles.subtitle}>{spec.identity.subtitle}</p>}

      {sortedSections.map((section) => {
        const sectionUnits = units
          .filter((u) => u.section_id === section.slug && u.status !== "draft")
          .sort((a, b) => a.order - b.order);
        return (
          <section key={section.slug} className={`sophie-section ${styles.section}`}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <ul className={styles.unitList}>
              {sectionUnits.map((unit) => (
                <li key={unit.id}>
                  <a className={`sophie-unit-link ${styles.unitLink}`}
                     href={`/units/${unit.id}/reading/`}>
                    {unit.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
```

CSS module: minimal — use existing Sophie design tokens (`var(--sophie-font-serif)` for h1, `var(--sophie-space-*)` for spacing).

**Step 4: Run + biome + commit:**

```bash
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm exec biome check --write packages/components/src/components/CourseLanding/ packages/astro/src/routes/ 2>&1 | tail -3
cd packages/components && pnpm vitest run src/components/CourseLanding/SimpleList.test.tsx 2>&1 | tail -5
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
git add packages/components/src/components/CourseLanding/ packages/astro/src/routes/
git commit -m "feat(components,astro): SimpleList course landing + route dispatcher trio

Default landing layout — renders course title + each section's units in
order, with R10-compliant <main> landmark + h1. Other two landings
(HeroWithModules, ProseWithToc) ship in subsequent tasks but the route
files reference them so the build needs them stubbed first."
```

### Task 2.5: Stub `HeroWithModules` + `ProseWithToc` (just enough to compile)

**Files:**
- Create: `packages/components/src/components/CourseLanding/HeroWithModules.tsx` (stub for now)
- Create: `packages/components/src/components/CourseLanding/ProseWithToc.tsx` (stub for now)

Both can initially be `export default SimpleList` re-exports (delegate to the default so route compiles); replace with real implementations later. **Mark with a TODO + issue ref** so they're tracked:

```tsx
// TODO(course-info v0.2 follow-up): real HeroWithModules layout per design
// docs/plans/2026-05-26-course-info-projection-design.md section 4. Until
// then, delegate to SimpleList so the route + dispatcher compile.
import SimpleList from "./SimpleList.tsx";
export default SimpleList;
```

**Commit:**

```bash
git add packages/components/src/components/CourseLanding/HeroWithModules.tsx packages/components/src/components/CourseLanding/ProseWithToc.tsx
git commit -m "stub(components): HeroWithModules + ProseWithToc delegate to SimpleList for now

Real implementations are a v0.2 follow-up; stubs let the route dispatcher
compile + the schema's layout enum lookup succeed without a 404."
```

### Task 2.6: Build the `<SectionLanding>` shell

**Files:**
- Create: `packages/components/src/components/SectionLanding/SectionLanding.tsx`
- Create: `packages/components/src/components/SectionLanding/SectionLanding.module.css`
- Create: `packages/components/src/components/SectionLanding/SectionLanding.test.tsx`

Same TDD shape as Task 2.4. Section landing renders:
- `<main>` landmark (per R10)
- h1 with section title
- Section description if present
- Optional `intro.mdx` fragment (Phase 3 ships the loader; this phase renders a placeholder area for it)
- Ordered list of units with their `chapter`, `title`, `reading_time`, and `status` if non-stable

Commit.

### Task 2.7: Phase 2 verification

```bash
pnpm exec biome check 2>&1 | tail -3
cd packages/components && pnpm vitest run 2>&1 | tail -5
```

Expected: all green, including the new SimpleList + SectionLanding tests + axe-clean.

```bash
pnpm lint:axe-render 2>&1 | tail -3
```

Expected: R11 grep finds all new `*.test.tsx` files have axe() calls — clean.

**Phase 2 done.**

---

## Phase 3 — Info-page layouts + `compose:` evaluator

### Task 3.1: Build the `compose:` evaluator

**Files:**
- Create: `packages/astro/src/lib/compose-evaluator.ts`
- Test: `packages/astro/src/lib/compose-evaluator.test.ts`

The evaluator takes a `compose: [...]` list from `info_pages.X.compose` + the course spec + the prose-fragment collection, and returns a structured list of `{ kind: "data", key, value } | { kind: "prose", slug, body }` so layouts can render in order.

**Step 1: TDD shape — write the failing test first.** Cover:
- Data refs resolve from spec (`"objectives"` → `spec.objectives`)
- Prose refs resolve (`"prose/policies"` → loaded fragment body)
- Unknown ref throws curated error
- Empty `compose:` returns empty list

**Step 2: Implement + run + commit.**

### Task 3.2-3.6: Build the 5 info-page layouts (Syllabus, Schedule, Instructor, Policies, Accommodations)

For each layout, repeat the TDD pattern from Task 2.4:

1. Failing test (axe + structure-specific assertion)
2. Implement using the compose evaluator + spec data + fragment bodies
3. CSS module with Sophie design tokens
4. Run test → pass
5. Biome + commit

**Per-layout assertions** to write tests against:

- **`<SyllabusPage>`**: renders course title + composed sections (objectives, grading, office_hours, accessibility, prose blocks) in `compose:` order. R10: `<main>` landmark with named subregions (`<section aria-labelledby>` per cluster).
- **`<SchedulePage>`**: renders aggregated due-date table from schedule.yaml + per-unit `due` fields. Sort by date. Group by week.
- **`<InstructorPage>`**: renders contact card from `spec.contact` + office-hours table from `spec.office_hours` + prose/instructor-bio fragment.
- **`<PoliciesPage>`**: renders prose/policies fragment + grading.late_policy_ref fragment if present.
- **`<AccommodationsPage>`**: renders spec.accessibility (DRC link, contact, deadline) + prose/accommodations fragment.

Each gets its own commit (frequent commits per the skill).

### Task 3.7: Phase 3 verification

Run biome + vitest + lint:axe-render. Expected: 5 new layouts + the compose evaluator all clean. Skip MyST docs check since no docs changed yet.

**Phase 3 done.**

---

## Phase 4 — Course-management chrome components

### Task 4.1: Build `useCourseSpec()` hook

**Files:**
- Create: `packages/components/src/hooks/useCourseSpec.ts`
- Test: `packages/components/src/hooks/useCourseSpec.test.ts`

Reads from `virtual:sophie/course-spec`. Returns the spec object. In tests, mock the virtual module via a vitest alias.

### Task 4.2-4.6: Build the 5 chrome components

For each: `<Due>`, `<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`:

1. Failing test (hybrid props-or-schema behavior + axe-clean)
2. Implement with default-to-schema-lookup + props-as-override
3. CSS module
4. R11 compliance (test calls axe)
5. Biome + commit

Each component is small (~50-80 LOC + test). Use `data-` attributes for runtime metadata (e.g., `data-due-date`, `data-points-category`) so consumers can style/probe.

**Per the design's eight-role contract footnote:** these don't declare an epistemic role — they're chrome. Document in the component's docstring.

### Task 4.7: Phase 4 verification — same gates as Phase 3.

**Phase 4 done.**

---

## Phase 5 — iCal export — DEFERRED to follow-up sprint (per H6)

**Status:** Per Anna's H6 decision (2026-05-26), Phase 5 (iCal route +
hand-rolled emitter) is deferred from this sprint. Reason: it depends on
a `schedule.yaml` schema that doesn't yet exist in `@sophie/core`. That
schema (week → date mapping, recurrence rules, holidays, multi-section
logic) deserves its own focused design pass + ADR amendment to ADR 0080,
not an inline minimal stub.

**Triggers for the follow-up sprint:**

- Design pass: `schedule.yaml` shape (weeks vs flat day-list; recurrence
  for office hours; holiday handling; multi-section logic for COMP 521).
- ADR amendment to ADR 0080 declaring the schedule schema + its
  relationship to `course.sophie.yaml`'s `schedule_ref` pointer.
- Implementation: `@sophie/core/schema/schedule.ts` +
  `@sophie/astro/src/lib/schedule-loader.ts` +
  `@sophie/astro/src/lib/ical-emitter.ts` + `/schedule.ics` route.
- Smoke E2E: iCal output passes `node-ical` parse + semantic assertions
  (VEVENT count, DTSTART, RRULE).

**Effect on this sprint:** Phases 6 → 5 and 7 → 6 (renumbered below).
The original `schedule_ref` field on `CourseSpecSchema` v0.2 is kept as
an optional opaque string — it's a forward reference; the iCal sprint
fills in the loader + emitter.

---

## Phase 5 — astr201 integration (formerly Phase 6)

### Task 5.1: Coordinate with parallel session

**Before touching astr201/**: confirm the parallel chapter-migration session has paused or is on a non-conflicting branch. Send Anna a message asking for the green-light. Don't proceed without it.

### Task 5.2: Delete ASTR 201's hand-rolled `src/pages/index.astro` (per fix M4)

**Critical step that was missing from the original plan.** ASTR 201
ships a hand-rolled landing at `src/pages/index.astro` (per
design-doc context line 13). When `@sophie/astro` injects `/`, the
consumer file shadows the injected route per ADR 0082 §A2.6 + Astro
issue #3809 — meaning the injected `<CourseLanding*>` will NOT render
until the consumer file is removed.

```bash
cd /Users/anna/Teaching/astr201
git rm src/pages/index.astro
```

Commit on a `feat/sophie-course-info` branch in astr201/ with message
explaining the removal cites this sprint + ADR 0082 §A2.6.

### Task 5.3: Wire `@sophie/astro` integration in astr201's `astro.config.mjs` (per fix M5)

If a custom landing override is wanted, pass `landings.course` to
`defineSophieIntegration` here. Otherwise the spec's `landing.layout`
enum default applies (`"simple-list"`).

### Task 5.4: Fill out astr201's `course.sophie.yaml` v0.2

Add the new clusters (objectives, grading.categories, office_hours,
contact, accessibility, info_pages, landing). **Migrate
`assessment.grade_weights` → `grading.categories`** + add
`assessment.category_refs` pointer. Use real ASTR 201 Spring 2027 data;
ask Anna for specifics where unclear.

### Task 5.5: Author the prose fragments (per fix M10)

Create `src/content/course-info/`:

**Mandatory for v0.2 done (3 fragments):**
- `policies.mdx` — late-work, attendance, academic integrity, AI policy
- `accommodations.mdx` — DRC process, request deadlines, specifics
- `instructor-bio.mdx` — background, research, teaching philosophy

**Aspirational (ship if time):**
- `late-work.mdx` — separate from policies if granularity wanted
- `course-thesis.mdx` — what the course is about (one paragraph)

Each is small (1-3 paragraphs). Ask Anna for content; pause at each
fragment per HITL.

### Task 5.6: Build + verify all 7 routes render

(7 routes now, not 8 — iCal deferred per H6.)

```bash
cd /Users/anna/Teaching/astr201 && pnpm install && pnpm build
```

Then `pnpm preview` + open each URL + verify visual + content correctness:
`/`, `/sections/[section]/`, `/units/[unit]/reading/`, `/syllabus/`,
`/schedule/`, `/instructor/`, `/policies/`, `/accommodations/`.

**Verify Pagefind picks up info pages** (per fix M2):
```bash
ls dist/pagefind/ && grep -c "syllabus\|policies" dist/pagefind/pagefind-entry.json || true
```

### Task 5.7: Author + run a new e2e spec

`examples/smoke/e2e/info-pages.spec.ts` (or astr201's equivalent if it has its own e2e setup) — axe-clean assertion per route at **desktop + 375 px** (per fix M8).

### Task 5.8: Phase 5 verification + commit astr201 changes.

**Phase 5 done.**

---

## Phase 6 — ADRs + docs (formerly Phase 7)

### Task 6.1: Write ADR 0086 (projection pattern + chrome-vs-pedagogy boundary)

**Files:**
- Create: `docs/website/decisions/0086-course-info-projection-pattern.md`

Use the existing ADR template at `docs/website/decisions/template.md`. Cite this design doc as the evidence base. Lock the locked decisions from the design as "Decision" sections.

### Task 6.2: Amend ADR 0080 to v0.2

**Files:**
- Modify: `docs/website/decisions/0080-course-spec-format-v0-1.md`

Either:
- Rename to `0080-course-spec-format.md` + bump internal version to v0.2 + add a "v0.2 additions" section, OR
- Leave 0080 as-is and write a new `0080a` or `0086a` amendment.

Pick whichever has precedent in the existing ADR cluster.

### Task 6.3: Update `chapter-components.md` with the Course-management chrome section

**Files:**
- Modify: `docs/website/reference/chapter-components.md`

Add a new section: "Course-management chrome components" with each of the 5 components (props + default-schema-lookup behavior + when to override).

### Task 6.4: Regenerate validation dashboard (ADR 0080 status changed)

```bash
pnpm tsx scripts/regenerate-validation-index.mts
git diff docs/website/status/validation.md
```

Commit the regenerated dashboard.

### Task 6.5: Final-pass verification

```bash
pnpm exec biome check 2>&1 | tail -3
pnpm turbo run test 2>&1 | tail -5
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"
cd /Users/anna/Teaching/sophie/.worktrees/feat-course-info-projection
pnpm lint:axe-render 2>&1 | tail -3
pnpm turbo run check --filter=@sophie/astro --filter=smoke 2>&1 | tail -3   # astro check per fix M3
```

All 5 expected clean. The 1 pre-existing failure on `index-generator.integration.test.ts` is the only red.

**Pagefind sanity check** (per fix M2 — info pages indexed in `dist/pagefind/`; iCal route absent since Phase 5 deferred):
```bash
ls dist/pagefind/ && ls dist/syllabus/index.html dist/policies/index.html 2>/dev/null
```

### Task 6.6: Open the PR

Per AGENTS.md HITL: ask Anna confirmation in plain text before pushing/opening.

PR body should include:
- Summary of the 5 locked decisions (cite the design doc)
- File-by-file diff summary
- Verification table (biome, tests, MyST, smoke build, axe-clean per route)
- Test-plan checklist
- ADRs cited (0058, 0067, 0080, 0082, 0086)
- Co-author trailer

Branch is already pushed (each commit in each phase pushes its own); PR creation is the final step.

**Phase 6 done. Sprint complete (Phases 1-4 + 5-6 of revised plan).**

---

## Verification — sprint definition of done (revised 2026-05-26)

- All 7 routes injected by `@sophie/astro` render in astr201 dev + build (`/`, `/sections/[section]/`, `/units/[unit]/reading/`, `/syllabus/`, `/schedule/`, `/instructor/`, `/policies/`, `/accommodations/` — iCal route deferred per H6).
- axe-core clean (0 violations, WCAG 2.1 AA) at **desktop + 375 px** on all 7 routes (per fix M8).
- `pnpm exec biome check` 0/0 warnings.
- `pnpm vitest run` clean across @sophie/core + @sophie/components + @sophie/astro.
- `pnpm turbo run check` clean (astro check; per fix M3).
- `npx mystmd build --html` in `docs/website/` 0 ⚠.
- `pnpm lint:axe-render` clean (R11).
- Pagefind index includes info pages (per fix M2).
- ADR 0086 (projection pattern) shipped; ADR 0080 amended to v0.2 (clean break: grade_weights → grading.categories).
- `docs/website/status/validation.md` regenerated (`pnpm tsx scripts/regenerate-validation-index.mts`).
- ASTR 201 `course.sophie.yaml` filled with real data + ≥3 mandatory prose fragments authored (policies + accommodations + instructor-bio) + `src/pages/index.astro` deleted.
- Anna confirms the syllabus page reads cleanly + matches what she'd hand a student day 1.

**Deferred to follow-up sprint (per H6):** iCal export, `schedule.yaml` schema, `/schedule.ics` route.

---

## After execution

When the sprint is done, follow `superpowers:finishing-a-development-branch` to decide the merge approach (squash-merge per ADR 0055 is the default).
