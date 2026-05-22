# Course-Website Schema Extensions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This is Wedge A of the course-website implementation arc; see [Course-Website Platform Roadmap](../website/status/course-website-roadmap.md) for the multi-wedge sequencing.

**Goal:** Extend `@sophie/core/schema` with the typed entities needed by the course-website roadmap — Subsection, Unit, Artifact, Assessment, Rubric, BKTState, FSRSRecord — plus the stable `BaseRecord` pattern (`user_id` + `course_id` + `schema_version` + timestamps + `state_type`) and a `createPedagogyRecord` helper. **Pure schema work; no UI, no runtime integration.** Foundation for all subsequent course-website wedges.

**Architecture:** All new schemas live in `packages/core/src/schema/` as focused per-concern files (~100–200 LOC each), with sibling `.test.ts` files (TDD: tests first). Mirrors existing conventions (`chapter.ts`, `equation-biography.ts`, `intervention.ts`). Re-exported through `packages/core/src/schema/index.ts`. The `createPedagogyRecord` helper lives in `packages/core/src/runtime/` (new directory if it doesn't exist).

**Out of scope** (defer to follow-up wedges):
- Renaming/reconciling existing `module.ts` + `section.ts` with the new `Section[type=module|phase|track|bridge]` discriminated union from [ADR 0067](../website/decisions/0067-section-level-artifacts.md). That's a Sophie-wide rename across consumers; substantial enough to be its own PR.
- UI components (`<RetrievalPrompt>`, `<WorkedExample>`, etc.) — Wedge B.
- Library room pages (`<EquationSpecPage>`, Cheatsheet) — Wedge C.
- FSRS algorithm implementation (`@sophie/pedagogy-fsrs`) — Wedge D. This wedge only ships the `FSRSRecord` schema, not the scheduler.
- BKT algorithm implementation (`@sophie/pedagogy-bkt`) — Wedge E. This wedge only ships the `BKTState` schema.

**Tech Stack:** Zod ([ADR 0003](../website/decisions/0003-zod-as-source-of-truth.md)), TypeScript, Vitest, Biome ([ADR 0013](../website/decisions/0013-biome-lint-format.md)), pnpm ([ADR 0011](../website/decisions/0011-pnpm-package-manager.md)).

**Branch + PR strategy:**
- New feature branch `feat/course-website-schema` off `main`
- PR titled `feat(core): course-website schema extensions (BaseRecord + Subsection + Unit + Artifact + Assessment + Rubric + BKTState + FSRSRecord)`
- Squash-merge per [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md)
- Required CI checks: lint, typecheck, unit, build, e2e, storybook, visual-regression

---

## Pre-flight (do once at start of session)

**Step 1: Sync local main + create feature branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/course-website-schema
```

Verify the new ADRs landed (sanity check that you're branching off the right tip):

```bash
ls docs/website/decisions/006[5-9]*.md docs/website/decisions/007[0-3]*.md
```

Expected: 9 files listed (0065 through 0073).

**Step 2: Inspect existing schema conventions**

Spend ~10 minutes reading these files to absorb the house style:

- `packages/core/src/schema/primitives.ts` — shared atomic types (`Slug`, `NonEmptyString`, `LangTag`)
- `packages/core/src/schema/chapter.ts` — model for a Zod-with-JSDoc schema file
- `packages/core/src/schema/equation-biography.ts` — model for a schema with rich nested structure
- `packages/core/src/schema/chapter.test.ts` — vitest patterns
- `packages/core/src/schema/index.ts` — barrel-export style

Note the conventions:
- JSDoc with ADR cross-references
- `z.infer<typeof X>` type alias next to the schema
- `.js` extension in internal imports (ESM convention)
- One concern per file
- Sibling `.test.ts` for every schema

**Step 3: Verify pre-flight gates green**

```bash
pnpm install --frozen-lockfile
pnpm exec biome check
pnpm turbo run typecheck --filter=@sophie/core
pnpm turbo run test:unit --filter=@sophie/core
```

Expected: all four commands exit 0. If anything fails on a clean main, **stop and fix** before proceeding — don't add new code on a broken baseline.

---

## Task 1 — `BaseRecord` pattern

Establishes the stable record shape every persisted entity carries (per [ADR 0066](../website/decisions/0066-pseudonymous-first-data-model.md)).

**Files:**
- Create: `packages/core/src/schema/base-record.ts`
- Test: `packages/core/src/schema/base-record.test.ts`

**Step 1: Write the failing test**

`packages/core/src/schema/base-record.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { BaseRecord } from "./base-record.js";

describe("BaseRecord", () => {
  const validRecord = {
    user_id: "browser-uuid-7f3a",
    course_id: "astr201-sp26",
    schema_version: "1.0.0",
    state_type: "fsrs_state",
    created_at: "2026-05-21T11:35:22Z",
    updated_at: "2026-05-21T11:35:22Z",
  };

  it("accepts a complete valid record", () => {
    expect(() => BaseRecord.parse(validRecord)).not.toThrow();
  });

  it("rejects missing user_id", () => {
    const { user_id, ...rest } = validRecord;
    expect(() => BaseRecord.parse(rest)).toThrow();
  });

  it("rejects missing course_id", () => {
    const { course_id, ...rest } = validRecord;
    expect(() => BaseRecord.parse(rest)).toThrow();
  });

  it("rejects missing schema_version", () => {
    const { schema_version, ...rest } = validRecord;
    expect(() => BaseRecord.parse(rest)).toThrow();
  });

  it("rejects missing state_type", () => {
    const { state_type, ...rest } = validRecord;
    expect(() => BaseRecord.parse(rest)).toThrow();
  });

  it("rejects invalid ISO timestamps", () => {
    expect(() =>
      BaseRecord.parse({ ...validRecord, created_at: "not-a-date" })
    ).toThrow();
  });

  it("accepts semver-style schema_version", () => {
    expect(() =>
      BaseRecord.parse({ ...validRecord, schema_version: "2.3.1" })
    ).not.toThrow();
  });

  it("rejects non-semver schema_version", () => {
    expect(() =>
      BaseRecord.parse({ ...validRecord, schema_version: "v2" })
    ).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter=@sophie/core test:unit --run base-record
```

Expected: FAIL with "Cannot find module './base-record.js'" or equivalent.

**Step 3: Write the minimal implementation**

`packages/core/src/schema/base-record.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

/**
 * `BaseRecord` — the stable shape every persisted Sophie record carries
 * (per [ADR 0066](../../../docs/website/decisions/0066-pseudonymous-first-data-model.md)).
 *
 * | Field            | Purpose                                            |
 * | ---------------- | -------------------------------------------------- |
 * | `user_id`        | Pseudonymous identifier: per-browser UUID at Tier 1/2; LTI `sub` claim at Tier 3 ([ADR 0065](../../../docs/website/decisions/0065-lti-1-3-integration.md)). Same field shape; Sophie treats both uniformly. |
 * | `course_id`      | Prevents cross-course state merges. Required even on per-browser records. |
 * | `schema_version` | Semver-style; tracks future schema migrations.     |
 * | `state_type`     | Discriminator: `fsrs_state` \| `bkt_mastery` \| `predict_response` \| `practice_attempt` \| `bookmark` \| `reading_progress` \| ... |
 * | `created_at`     | ISO 8601 timestamp; initial write.                 |
 * | `updated_at`     | ISO 8601 timestamp; last write. LWW per [ADR 0029](../../../docs/website/decisions/0029-broadcast-lww.md). |
 *
 * Concrete record types (`FSRSRecord`, `BKTState`, etc.) extend this
 * via `BaseRecord.extend({ ... })`. Never instantiated directly.
 */
export const BaseRecord = z.object({
  user_id: NonEmptyString,
  course_id: NonEmptyString,
  schema_version: z
    .string()
    .regex(
      /^\d+\.\d+\.\d+$/,
      "schema_version must be semver-style (e.g. '1.0.0')."
    ),
  state_type: NonEmptyString,
  created_at: z.string().datetime({ message: "created_at must be ISO 8601." }),
  updated_at: z.string().datetime({ message: "updated_at must be ISO 8601." }),
});

export type BaseRecord = z.infer<typeof BaseRecord>;
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter=@sophie/core test:unit --run base-record
```

Expected: PASS, 8/8 tests green.

**Step 5: Commit**

```bash
git add packages/core/src/schema/base-record.ts packages/core/src/schema/base-record.test.ts
git commit -m "$(cat <<'EOF'
feat(core): add BaseRecord schema (stable persisted-record pattern)

Every Sophie persisted record carries user_id + course_id +
schema_version + state_type + created_at + updated_at per ADR 0066.
Concrete records (FSRSRecord, BKTState, etc.) extend this via
BaseRecord.extend({ ... }).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — `createPedagogyRecord` helper

Convenience constructor that injects the `BaseRecord` boilerplate so call sites stay clean.

**Files:**
- Create: `packages/core/src/runtime/create-pedagogy-record.ts`
- Test: `packages/core/src/runtime/create-pedagogy-record.test.ts`
- Verify: `packages/core/src/runtime/` directory exists; create if needed.

**Step 1: Confirm runtime/ directory**

```bash
ls packages/core/src/runtime/ 2>/dev/null || mkdir -p packages/core/src/runtime
```

**Step 2: Write the failing test**

`packages/core/src/runtime/create-pedagogy-record.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createPedagogyRecord } from "./create-pedagogy-record.js";

describe("createPedagogyRecord", () => {
  it("injects user_id + course_id + schema_version + timestamps + state_type", () => {
    const record = createPedagogyRecord({
      user_id: "browser-uuid-7f3a",
      course_id: "astr201-sp26",
      state_type: "fsrs_state",
      schema_version: "1.0.0",
      payload: { skill_id: "math-logarithms", p_learned: 0.42 },
    });
    expect(record.user_id).toBe("browser-uuid-7f3a");
    expect(record.course_id).toBe("astr201-sp26");
    expect(record.state_type).toBe("fsrs_state");
    expect(record.schema_version).toBe("1.0.0");
    expect(record.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(record.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(record.skill_id).toBe("math-logarithms");
    expect(record.p_learned).toBe(0.42);
  });

  it("sets created_at === updated_at on initial create", () => {
    const record = createPedagogyRecord({
      user_id: "u",
      course_id: "c",
      state_type: "t",
      schema_version: "1.0.0",
      payload: {},
    });
    expect(record.created_at).toBe(record.updated_at);
  });

  it("merges payload at the top level (no nesting)", () => {
    const record = createPedagogyRecord({
      user_id: "u",
      course_id: "c",
      state_type: "t",
      schema_version: "1.0.0",
      payload: { a: 1, b: "two", c: [3, 4] },
    });
    expect(record.a).toBe(1);
    expect(record.b).toBe("two");
    expect(record.c).toEqual([3, 4]);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm --filter=@sophie/core test:unit --run create-pedagogy-record
```

Expected: FAIL with "Cannot find module './create-pedagogy-record.js'".

**Step 4: Write the minimal implementation**

`packages/core/src/runtime/create-pedagogy-record.ts`:

```typescript
import type { BaseRecord } from "../schema/base-record.js";

/**
 * `createPedagogyRecord` — convenience constructor that injects the
 * `BaseRecord` boilerplate (timestamps, schema_version, etc.) so call
 * sites stay focused on the typed payload.
 *
 * @example
 * ```ts
 * const fsrsRecord = createPedagogyRecord({
 *   user_id: getUserId(courseId),
 *   course_id: "astr201-sp26",
 *   state_type: "fsrs_state",
 *   schema_version: "1.0.0",
 *   payload: { target_id: "logs-q1", difficulty: 5.2, stability: 7.1, ... },
 * });
 * ```
 *
 * The returned object satisfies `BaseRecord & T` where `T` is the
 * payload shape; downstream code parses with the concrete schema
 * (e.g., `FSRSRecord.parse(record)`) to get full validation.
 */
export function createPedagogyRecord<T extends Record<string, unknown>>(args: {
  user_id: string;
  course_id: string;
  state_type: string;
  schema_version: string;
  payload: T;
}): BaseRecord & T {
  const now = new Date().toISOString();
  return {
    user_id: args.user_id,
    course_id: args.course_id,
    state_type: args.state_type,
    schema_version: args.schema_version,
    created_at: now,
    updated_at: now,
    ...args.payload,
  } as BaseRecord & T;
}
```

**Step 5: Run test to verify it passes**

```bash
pnpm --filter=@sophie/core test:unit --run create-pedagogy-record
```

Expected: PASS, 3/3 tests green.

**Step 6: Commit**

```bash
git add packages/core/src/runtime/create-pedagogy-record.ts packages/core/src/runtime/create-pedagogy-record.test.ts
git commit -m "feat(core): add createPedagogyRecord helper for BaseRecord boilerplate

Constructor injects user_id + course_id + schema_version + timestamps
+ state_type so call sites focus on the typed payload. Returns
BaseRecord & T; downstream parses with concrete schema for validation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `Subsection` schema

Per [ADR 0067](../website/decisions/0067-section-level-artifacts.md): Subsections are auto-grouped by Artifact type by default; explicit Subsection authoring is the opt-in override with `intro_mdx` + `order` + `label`.

**Files:**
- Create: `packages/core/src/schema/subsection.ts`
- Test: `packages/core/src/schema/subsection.test.ts`

**Step 1: Write the failing test**

`packages/core/src/schema/subsection.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { Subsection } from "./subsection.js";

describe("Subsection", () => {
  it("accepts an auto-grouping subsection (no intro_mdx)", () => {
    expect(() =>
      Subsection.parse({
        id: "slides",
        label: "Slides",
        order: 1,
        kind: "auto-grouped",
        artifact_type: "slides",
      })
    ).not.toThrow();
  });

  it("accepts an explicit subsection (with intro_mdx)", () => {
    expect(() =>
      Subsection.parse({
        id: "first-half",
        label: "Lectures 1–3",
        order: 1,
        kind: "explicit",
        intro_mdx: "These three lectures cover the basics...",
      })
    ).not.toThrow();
  });

  it("rejects auto-grouped without artifact_type", () => {
    expect(() =>
      Subsection.parse({
        id: "x",
        label: "X",
        order: 1,
        kind: "auto-grouped",
      })
    ).toThrow();
  });

  it("rejects unknown kind", () => {
    expect(() =>
      Subsection.parse({
        id: "x",
        label: "X",
        order: 1,
        kind: "mystery",
      })
    ).toThrow();
  });

  it("rejects negative order", () => {
    expect(() =>
      Subsection.parse({
        id: "x",
        label: "X",
        order: -1,
        kind: "auto-grouped",
        artifact_type: "slides",
      })
    ).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter=@sophie/core test:unit --run subsection
```

Expected: FAIL.

**Step 3: Write the implementation**

`packages/core/src/schema/subsection.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `Subsection` — a content grouping inside a `Section`'s Units.
 *
 * Per [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md):
 * Subsections are **auto-grouped by Artifact type** by default — Sophie
 * inspects the Section's Units and synthesizes "Slides" / "Readings" /
 * "Resources" subsections without any authoring input. The instructor
 * can opt into **explicit Subsection authoring** to add a subsection
 * intro, custom ordering, or grouping that doesn't follow artifact-type
 * boundaries.
 *
 * `kind` discriminates:
 * - `auto-grouped`: synthesized by Sophie; references `artifact_type`
 *   (e.g., `"slides"`); no `intro_mdx`.
 * - `explicit`: instructor-authored; may have `intro_mdx`; does not
 *   reference `artifact_type`.
 */
export const SubsectionAutoGrouped = z.object({
  id: Slug,
  label: NonEmptyString,
  order: z.number().int().nonnegative(),
  kind: z.literal("auto-grouped"),
  artifact_type: NonEmptyString,
});

export const SubsectionExplicit = z.object({
  id: Slug,
  label: NonEmptyString,
  order: z.number().int().nonnegative(),
  kind: z.literal("explicit"),
  intro_mdx: z.string().optional(),
});

export const Subsection = z.discriminatedUnion("kind", [
  SubsectionAutoGrouped,
  SubsectionExplicit,
]);

export type Subsection = z.infer<typeof Subsection>;
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter=@sophie/core test:unit --run subsection
```

Expected: PASS, 5/5 tests green.

**Step 5: Commit**

```bash
git add packages/core/src/schema/subsection.ts packages/core/src/schema/subsection.test.ts
git commit -m "feat(core): add Subsection schema (auto-grouped + explicit variants)

Per ADR 0067 — Subsections inside a Section's Units. Auto-grouped by
artifact type by default; instructor opts into explicit subsection
authoring with intro_mdx + custom ordering. Discriminated union over
'kind'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `Unit` schema (typed discriminator)

Per [ADR 0067](../website/decisions/0067-section-level-artifacts.md): Unit is the individual learning unit; type variants are `lecture`, `project`, `lab`, `topic`, `skill`.

**Files:**
- Create: `packages/core/src/schema/unit.ts`
- Test: `packages/core/src/schema/unit.test.ts`

**Step 1: Write the failing test**

`packages/core/src/schema/unit.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { Unit, UnitType } from "./unit.js";

describe("UnitType", () => {
  it("accepts each declared variant", () => {
    for (const t of ["lecture", "project", "lab", "topic", "skill"]) {
      expect(() => UnitType.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => UnitType.parse("lab-report")).toThrow();
  });
});

describe("Unit", () => {
  const minimalLecture = {
    id: "l1-why-different",
    type: "lecture",
    title: "Why ASTR 201 is Different",
    order: 1,
  };

  it("accepts a minimal lecture", () => {
    expect(() => Unit.parse(minimalLecture)).not.toThrow();
  });

  it("accepts a project with prereqs + estimated_duration_weeks", () => {
    expect(() =>
      Unit.parse({
        id: "p1-stellar-populations",
        type: "project",
        title: "Stellar Populations",
        order: 1,
        prereqs: ["math-logarithms", "physics-newton-2"],
        estimated_duration_weeks: 1.5,
      })
    ).not.toThrow();
  });

  it("accepts a skill (bridge-only)", () => {
    expect(() =>
      Unit.parse({
        id: "math-logarithms",
        type: "skill",
        title: "Logarithms",
        order: 1,
        topic_id: "math-logarithms",
      })
    ).not.toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => Unit.parse({ id: "x", type: "lecture" })).toThrow();
  });

  it("rejects unknown type", () => {
    expect(() =>
      Unit.parse({ ...minimalLecture, type: "mystery" })
    ).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter=@sophie/core test:unit --run "unit.test"
```

Expected: FAIL.

**Step 3: Write the implementation**

`packages/core/src/schema/unit.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `UnitType` — the discriminator for a `Unit`'s pedagogical kind
 * (per [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md)).
 *
 * - `lecture`: one class meeting; carries `slides` + `reading` artifacts.
 * - `project`: multi-week deliverable; carries `spec` + `rubric` + `lab-notebook`.
 * - `lab`: single-session lab; carries `lab-notebook` + optionally `spec`.
 * - `topic`: free-form content unit (e.g., supplementary modules).
 * - `skill`: bridge-only; one prerequisite topic (per [ADR 0068](../../../docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md)).
 */
export const UnitType = z.enum(["lecture", "project", "lab", "topic", "skill"]);
export type UnitType = z.infer<typeof UnitType>;

/**
 * `Unit` — an individual learning unit inside a `Section`. Each Unit
 * holds typed `Artifact`s appropriate to its `type`.
 *
 * `prereqs` declares the topic_ids this Unit's content depends on;
 * curriculum-CI ([ADR 0045](../../../docs/website/decisions/0045-pedagogical-diff.md))
 * verifies every declared prereq topic has at least one authored
 * bridge surface (room, section, or `<SkillReview>` component).
 *
 * `topic_id` applies to `type: "skill"` Units only (bridge content);
 * binds the Unit to a canonical prereq topic in the pedagogy graph.
 *
 * `estimated_duration_weeks` is optional metadata for Schedule
 * generation + AI co-author prompts.
 */
export const Unit = z.object({
  id: Slug,
  type: UnitType,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  prereqs: z.array(NonEmptyString).default([]),
  topic_id: NonEmptyString.optional(),
  estimated_duration_weeks: z.number().positive().optional(),
});

export type Unit = z.infer<typeof Unit>;
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter=@sophie/core test:unit --run "unit.test"
```

Expected: PASS, 7/7 tests green.

**Step 5: Commit**

```bash
git add packages/core/src/schema/unit.ts packages/core/src/schema/unit.test.ts
git commit -m "feat(core): add Unit schema with type discriminator (lecture/project/lab/topic/skill)

Per ADR 0067 — individual learning unit inside a Section. Type
discriminator: lecture (slides+reading), project (spec+rubric+lab),
lab, topic (free-form), skill (bridge-only with topic_id). prereqs
field for curriculum-CI bridge-coverage audits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — `Artifact` schema (19 typed variants)

Per [ADR 0067](../website/decisions/0067-section-level-artifacts.md): Artifacts are the discrete authored pieces. This is the largest schema in this wedge. The 19 types span Unit-level artifacts (reading, slides, etc.) and Section-level artifacts (intro, synthesis, etc.).

**Files:**
- Create: `packages/core/src/schema/artifact.ts`
- Test: `packages/core/src/schema/artifact.test.ts`

**Step 1: Write the failing test**

`packages/core/src/schema/artifact.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { Artifact, ArtifactType, ArtifactScope } from "./artifact.js";

const UNIT_LEVEL_TYPES = [
  "reading",
  "slides",
  "spec",
  "rubric",
  "lab-notebook",
  "media",
  "practice",
  "worked-example",
  "diagnostic",
  "concept-review",
] as const;

const SECTION_LEVEL_TYPES = [
  "intro",
  "synthesis",
  "equation-collection",
  "practice-set",
  "review-checklist",
  "concept-map",
  "misconception-summary",
  "historical-context",
  "further-reading",
  "reference-tables",
] as const;

describe("ArtifactType", () => {
  it("accepts every declared variant (Unit-level + Section-level)", () => {
    for (const t of [...UNIT_LEVEL_TYPES, ...SECTION_LEVEL_TYPES]) {
      expect(() => ArtifactType.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => ArtifactType.parse("lecture-notes")).toThrow();
  });
});

describe("ArtifactScope", () => {
  it("accepts 'unit' and 'section'", () => {
    expect(() => ArtifactScope.parse("unit")).not.toThrow();
    expect(() => ArtifactScope.parse("section")).not.toThrow();
  });
});

describe("Artifact", () => {
  it("accepts a minimal Unit-level reading artifact", () => {
    expect(() =>
      Artifact.parse({
        id: "m1-l1-reading",
        type: "reading",
        scope: "unit",
        title: "L1 reading: Why ASTR 201 is Different",
        source_path: "src/content/courses/astr201/sections/m1/units/l1/reading.mdx",
      })
    ).not.toThrow();
  });

  it("accepts a Section-level practice-set artifact", () => {
    expect(() =>
      Artifact.parse({
        id: "m1-practice-set",
        type: "practice-set",
        scope: "section",
        title: "Module 1 — Interleaved practice",
        source_path: "src/content/courses/astr201/sections/m1/practice-set.mdx",
        references: { units: ["l1", "l2", "l3"], los: ["lo-1.1", "lo-1.2"] },
      })
    ).not.toThrow();
  });

  it("rejects missing required fields (no source_path)", () => {
    expect(() =>
      Artifact.parse({
        id: "x",
        type: "reading",
        scope: "unit",
        title: "X",
      })
    ).toThrow();
  });

  it("rejects unknown scope", () => {
    expect(() =>
      Artifact.parse({
        id: "x",
        type: "reading",
        scope: "course",
        title: "X",
        source_path: "x.mdx",
      })
    ).toThrow();
  });

  it("defaults references to an empty object", () => {
    const parsed = Artifact.parse({
      id: "x",
      type: "reading",
      scope: "unit",
      title: "X",
      source_path: "x.mdx",
    });
    expect(parsed.references).toEqual({});
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter=@sophie/core test:unit --run "artifact.test"
```

Expected: FAIL.

**Step 3: Write the implementation**

`packages/core/src/schema/artifact.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `ArtifactType` — the typed kind of an `Artifact` (per
 * [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md)).
 *
 * **Unit-level** types (live inside a `Unit`):
 * - `reading`: long-form prose chapter for a lecture-shape Unit.
 * - `slides`: Reveal.js slide deck (per [ADR 0006](../../../docs/website/decisions/0006-slides-revealjs.md)).
 * - `spec`: project-shape Unit's prompt + deliverable spec.
 * - `rubric`: structured grading guide (also referenced from `Assessment`).
 * - `lab-notebook`: Pyodide-driven computational walkthrough.
 * - `media`: PDF, image, video link, or other reference asset.
 * - `practice`: Unit-level blocked practice problems.
 * - `worked-example`: step-by-step solution with epistemic-role annotations.
 * - `diagnostic`: course-start / mid-course / pre-exam screener content.
 * - `concept-review`: bridge-only explanation prose.
 *
 * **Section-level** types (live directly on a `Section`):
 * - `intro`: advance organizer; LOs + prior-knowledge connection + roadmap.
 * - `synthesis`: integrative recap; cross-Unit conceptual links.
 * - `equation-collection`: auto-pulled from Equation Registry; instructor-curated.
 * - `practice-set`: interleaved mixed-topic practice; FSRS-scheduled.
 * - `review-checklist`: LO self-check; entries link to diagnostics.
 * - `concept-map`: visual summary (React Flow per [ADR 0016](../../../docs/website/decisions/0016-react-flow-for-concept-maps.md)).
 * - `misconception-summary`: Module-level misconception bundle.
 * - `historical-context`: narrative thread for the Section's science.
 * - `further-reading`: annotated bibliography.
 * - `reference-tables`: Section-scoped reference; mirrors to Resources room.
 */
export const ArtifactType = z.enum([
  // Unit-level
  "reading",
  "slides",
  "spec",
  "rubric",
  "lab-notebook",
  "media",
  "practice",
  "worked-example",
  "diagnostic",
  "concept-review",
  // Section-level
  "intro",
  "synthesis",
  "equation-collection",
  "practice-set",
  "review-checklist",
  "concept-map",
  "misconception-summary",
  "historical-context",
  "further-reading",
  "reference-tables",
]);
export type ArtifactType = z.infer<typeof ArtifactType>;

/**
 * `ArtifactScope` — where in the hierarchy this Artifact attaches.
 * Section-scoped artifacts (`intro`, `synthesis`, etc.) live on a
 * `Section` directly; Unit-scoped artifacts live on a `Unit`.
 */
export const ArtifactScope = z.enum(["unit", "section"]);
export type ArtifactScope = z.infer<typeof ArtifactScope>;

/**
 * `ArtifactReferences` — typed cross-references this Artifact declares.
 * The pedagogy-index extractor ([ADR 0038](../../../docs/website/decisions/0038-pedagogy-index-pattern.md))
 * audits that referenced IDs exist + are appropriately typed.
 */
export const ArtifactReferences = z
  .object({
    units: z.array(NonEmptyString).default([]),
    equations: z.array(NonEmptyString).default([]),
    figures: z.array(NonEmptyString).default([]),
    skills: z.array(NonEmptyString).default([]),
    misconceptions: z.array(NonEmptyString).default([]),
    los: z.array(NonEmptyString).default([]),
  })
  .partial()
  .default({});

/**
 * `Artifact` — the discrete authored content unit. Each Artifact has
 * a stable `id`, declared `type`, `scope`, and source-file path.
 */
export const Artifact = z.object({
  id: Slug,
  type: ArtifactType,
  scope: ArtifactScope,
  title: NonEmptyString,
  source_path: NonEmptyString,
  references: ArtifactReferences,
  order: z.number().int().nonnegative().optional(),
});

export type Artifact = z.infer<typeof Artifact>;
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter=@sophie/core test:unit --run "artifact.test"
```

Expected: PASS, ~22 tests green (20 type variants + scope variants + the structural tests).

**Step 5: Commit**

```bash
git add packages/core/src/schema/artifact.ts packages/core/src/schema/artifact.test.ts
git commit -m "feat(core): add Artifact schema (20 typed variants, Unit- + Section-scoped)

Per ADR 0067 — Artifact is the discrete authored content unit. 10
Unit-level types (reading, slides, spec, rubric, lab-notebook, media,
practice, worked-example, diagnostic, concept-review) + 10
Section-level types (intro, synthesis, equation-collection,
practice-set, review-checklist, concept-map, misconception-summary,
historical-context, further-reading, reference-tables). Typed
cross-references for pedagogy-index audit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — `Rubric` schema (Criterion + Scale)

Per [ADR 0073](../website/decisions/0073-unified-assessment-schema.md): Rubric is a first-class artifact reused across Assessments.

**Files:**
- Create: `packages/core/src/schema/rubric.ts`
- Test: `packages/core/src/schema/rubric.test.ts`

**Step 1: Write the failing test**

`packages/core/src/schema/rubric.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { Rubric, RubricCriterion, RubricScaleLevel } from "./rubric.js";

const sampleCriterion = {
  id: "physical-reasoning",
  label: "Physical reasoning",
  weight: 30,
  scale: [
    { points: 30, label: "Excellent", descriptor: "Identifies all relevant assumptions." },
    { points: 24, label: "Proficient", descriptor: "Identifies most assumptions." },
    { points: 18, label: "Developing", descriptor: "Identifies some assumptions." },
    { points: 10, label: "Beginning", descriptor: "Limited identification." },
  ],
};

describe("RubricScaleLevel", () => {
  it("accepts a valid level", () => {
    expect(() =>
      RubricScaleLevel.parse(sampleCriterion.scale[0])
    ).not.toThrow();
  });
});

describe("RubricCriterion", () => {
  it("accepts a valid criterion", () => {
    expect(() => RubricCriterion.parse(sampleCriterion)).not.toThrow();
  });
  it("rejects empty scale", () => {
    expect(() =>
      RubricCriterion.parse({ ...sampleCriterion, scale: [] })
    ).toThrow();
  });
});

describe("Rubric", () => {
  it("accepts a criterion-based rubric", () => {
    expect(() =>
      Rubric.parse({
        id: "project-rubric",
        type: "criterion-based",
        total_points: 100,
        criteria: [sampleCriterion],
      })
    ).not.toThrow();
  });

  it("accepts a holistic rubric", () => {
    expect(() =>
      Rubric.parse({
        id: "essay-rubric",
        type: "holistic",
        total_points: 100,
        scale: [
          { points: 100, label: "Mastery", descriptor: "..." },
          { points: 80, label: "Proficient", descriptor: "..." },
          { points: 60, label: "Developing", descriptor: "..." },
        ],
      })
    ).not.toThrow();
  });

  it("rejects criterion-based without criteria", () => {
    expect(() =>
      Rubric.parse({
        id: "x",
        type: "criterion-based",
        total_points: 100,
      })
    ).toThrow();
  });

  it("rejects holistic without scale", () => {
    expect(() =>
      Rubric.parse({
        id: "x",
        type: "holistic",
        total_points: 100,
      })
    ).toThrow();
  });
});
```

**Step 2: Run + verify fail → Step 3: Implement**

`packages/core/src/schema/rubric.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `RubricScaleLevel` — one row of a rubric's scoring scale.
 * (e.g., "Excellent / 30 points / Identifies all relevant assumptions").
 */
export const RubricScaleLevel = z.object({
  points: z.number().nonnegative(),
  label: NonEmptyString,
  descriptor: NonEmptyString,
});
export type RubricScaleLevel = z.infer<typeof RubricScaleLevel>;

/**
 * `RubricCriterion` — one criterion in a criterion-based rubric
 * (e.g., "Physical reasoning / 30% weight / 4-level scale").
 */
export const RubricCriterion = z.object({
  id: Slug,
  label: NonEmptyString,
  weight: z.number().positive(),
  scale: z.array(RubricScaleLevel).min(1),
  lo_references: z.array(NonEmptyString).default([]),
});
export type RubricCriterion = z.infer<typeof RubricCriterion>;

/**
 * `Rubric` — first-class grading guide (per
 * [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)).
 * Authored once; reused across `Assessment`s. Renderable for student
 * self-assessment. Audited by curriculum-CI against claimed LOs.
 *
 * Two variants:
 * - `criterion-based` (default): per-criterion weights + scales.
 * - `holistic`: one scale describing whole work.
 */
const RubricCriterionBased = z.object({
  id: Slug,
  type: z.literal("criterion-based"),
  total_points: z.number().positive(),
  criteria: z.array(RubricCriterion).min(1),
});

const RubricHolistic = z.object({
  id: Slug,
  type: z.literal("holistic"),
  total_points: z.number().positive(),
  scale: z.array(RubricScaleLevel).min(1),
});

export const Rubric = z.discriminatedUnion("type", [
  RubricCriterionBased,
  RubricHolistic,
]);
export type Rubric = z.infer<typeof Rubric>;
```

**Step 4: Run + verify pass → Step 5: Commit**

```bash
git add packages/core/src/schema/rubric.ts packages/core/src/schema/rubric.test.ts
git commit -m "feat(core): add Rubric schema (criterion-based + holistic variants)

Per ADR 0073 — first-class grading guide. Discriminated union over
criterion-based (per-criterion weight + scale) vs holistic (one
scale). Each criterion declares lo_references for curriculum-CI
LO-coverage audit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — `Assessment` schema (type-variants)

Per [ADR 0073](../website/decisions/0073-unified-assessment-schema.md): Single Assessment entity with 4 type-variants (assignment / practice / diagnostic / exam).

**Files:**
- Create: `packages/core/src/schema/assessment.ts`
- Test: `packages/core/src/schema/assessment.test.ts`

**Step 1: Write the failing test**

`packages/core/src/schema/assessment.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { Assessment, AssessmentType, AssessmentItem } from "./assessment.js";

describe("AssessmentType", () => {
  it("accepts each variant", () => {
    for (const t of ["assignment", "practice", "diagnostic", "exam"]) {
      expect(() => AssessmentType.parse(t)).not.toThrow();
    }
  });
});

describe("AssessmentItem", () => {
  it("accepts a multiple-choice item", () => {
    expect(() =>
      AssessmentItem.parse({
        id: "q1",
        type: "multiple-choice",
        prompt: "log10(1000) = ?",
        options: ["1", "2", "3", "10"],
        answer: "3",
      })
    ).not.toThrow();
  });
  it("accepts a numerical item with tolerance", () => {
    expect(() =>
      AssessmentItem.parse({
        id: "q2",
        type: "numerical",
        prompt: "What is sin(π/2)?",
        answer: 1.0,
        tolerance: 0.001,
      })
    ).not.toThrow();
  });
  it("accepts a code item with test_cases", () => {
    expect(() =>
      AssessmentItem.parse({
        id: "q3",
        type: "code",
        prompt: "Implement compute_l_from_r_t",
        language: "python",
        test_cases: ["assert compute_l_from_r_t(1, 5778) == 3.828e33"],
      })
    ).not.toThrow();
  });
  it("rejects unknown item type", () => {
    expect(() =>
      AssessmentItem.parse({ id: "x", type: "essay", prompt: "..." })
    ).toThrow();
  });
});

describe("Assessment", () => {
  const baseAssessment = {
    id: "hw1",
    type: "assignment",
    title: "HW1: Stellar Magnitudes",
    prompt: "Compute the apparent magnitude...",
    stakes: "low",
    items: [
      {
        id: "q1",
        type: "numerical",
        prompt: "What is m1 - m2?",
        answer: 2.5,
        tolerance: 0.1,
      },
    ],
    feedback: { timing: "asynchronous" },
  };

  it("accepts a minimal assignment", () => {
    expect(() => Assessment.parse(baseAssessment)).not.toThrow();
  });

  it("accepts a practice with inline feedback", () => {
    expect(() =>
      Assessment.parse({
        ...baseAssessment,
        type: "practice",
        stakes: "formative",
        feedback: { timing: "inline" },
      })
    ).not.toThrow();
  });

  it("accepts an exam with time_limit + scope", () => {
    expect(() =>
      Assessment.parse({
        ...baseAssessment,
        type: "exam",
        stakes: "high",
        schedule: { time_limit_minutes: 50 },
        scope: { sections: ["m1", "m2"] },
      })
    ).not.toThrow();
  });

  it("accepts a diagnostic with required: completion", () => {
    expect(() =>
      Assessment.parse({
        ...baseAssessment,
        type: "diagnostic",
        stakes: "formative",
        required: "completion",
      })
    ).not.toThrow();
  });

  it("rejects unknown stakes", () => {
    expect(() =>
      Assessment.parse({ ...baseAssessment, stakes: "mystery" })
    ).toThrow();
  });
});
```

**Step 2: Run + verify fail → Step 3: Implement**

`packages/core/src/schema/assessment.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `AssessmentType` — discriminator for the four assessment variants
 * (per [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)).
 *
 * - `assignment`: submission window; feedback after due date; rubric-graded.
 * - `practice`: instant feedback; unlimited retry; FSRS-scheduled.
 * - `diagnostic`: required-for-completion not-grade; feeds BKT mastery.
 * - `exam`: time-locked; scope-restricted; high-stakes.
 */
export const AssessmentType = z.enum([
  "assignment",
  "practice",
  "diagnostic",
  "exam",
]);
export type AssessmentType = z.infer<typeof AssessmentType>;

/**
 * `AssessmentItemType` — auto-gradable item kinds. Per
 * [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)
 * Auto-grading scope table.
 */
export const AssessmentItemType = z.enum([
  "multiple-choice",
  "multiple-select",
  "numerical",
  "short-text",
  "code",
  "plotly-chart",
  "concept-map",
  "equation-derivation",
]);

const ItemMultipleChoice = z.object({
  id: Slug,
  type: z.literal("multiple-choice"),
  prompt: NonEmptyString,
  options: z.array(NonEmptyString).min(2),
  answer: NonEmptyString,
});
const ItemMultipleSelect = z.object({
  id: Slug,
  type: z.literal("multiple-select"),
  prompt: NonEmptyString,
  options: z.array(NonEmptyString).min(2),
  answer: z.array(NonEmptyString).min(1),
});
const ItemNumerical = z.object({
  id: Slug,
  type: z.literal("numerical"),
  prompt: NonEmptyString,
  answer: z.number(),
  tolerance: z.number().nonnegative(),
});
const ItemShortText = z.object({
  id: Slug,
  type: z.literal("short-text"),
  prompt: NonEmptyString,
  answer_pattern: NonEmptyString, // regex source
});
const ItemCode = z.object({
  id: Slug,
  type: z.literal("code"),
  prompt: NonEmptyString,
  language: z.enum(["python"]),
  test_cases: z.array(NonEmptyString).min(1),
});
const ItemPlotlyChart = z.object({
  id: Slug,
  type: z.literal("plotly-chart"),
  prompt: NonEmptyString,
  expected_spec_hash: NonEmptyString.optional(),
});
const ItemConceptMap = z.object({
  id: Slug,
  type: z.literal("concept-map"),
  prompt: NonEmptyString,
  expected_graph: z.record(z.array(NonEmptyString)),
});
const ItemEquationDerivation = z.object({
  id: Slug,
  type: z.literal("equation-derivation"),
  prompt: NonEmptyString,
  expected_sympy: NonEmptyString,
});

export const AssessmentItem = z.discriminatedUnion("type", [
  ItemMultipleChoice,
  ItemMultipleSelect,
  ItemNumerical,
  ItemShortText,
  ItemCode,
  ItemPlotlyChart,
  ItemConceptMap,
  ItemEquationDerivation,
]);
export type AssessmentItem = z.infer<typeof AssessmentItem>;

const AssessmentStakes = z.enum(["formative", "low", "high"]);
const AssessmentSchedule = z.object({
  released_at: z.string().datetime().optional(),
  due_at: z.string().datetime().optional(),
  late_policy: NonEmptyString.optional(),
  duration_minutes: z.number().positive().optional(),
  time_limit_minutes: z.number().positive().optional(),
});
const AssessmentFeedback = z.object({
  timing: z.enum(["inline", "asynchronous"]),
  format: NonEmptyString.optional(),
});
const AssessmentReferences = z
  .object({
    units: z.array(NonEmptyString).default([]),
    equations: z.array(NonEmptyString).default([]),
    skills: z.array(NonEmptyString).default([]),
    misconceptions: z.array(NonEmptyString).default([]),
    los: z.array(NonEmptyString).default([]),
  })
  .partial()
  .default({});
const AssessmentScope = z
  .object({
    sections: z.array(NonEmptyString).default([]),
    modules: z.array(NonEmptyString).default([]),
  })
  .partial()
  .default({});
const AssessmentSubmission = z.object({
  mode: z.enum(["in-app", "external"]).default("in-app"),
  external_location: NonEmptyString.optional(),
});

/**
 * `Assessment` — unified entity for assignment / practice / diagnostic /
 * exam (per [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)).
 * Type tag drives UX, submission flow, feedback timing.
 *
 * `required: "completion"` applies to diagnostics — must be done to
 * proceed but not graded on outcome.
 */
export const Assessment = z.object({
  id: Slug,
  type: AssessmentType,
  title: NonEmptyString,
  description: z.string().optional(),
  prompt: NonEmptyString,
  schedule: AssessmentSchedule.optional(),
  rubric_id: NonEmptyString.optional(),
  items: z.array(AssessmentItem).default([]),
  references: AssessmentReferences,
  scope: AssessmentScope.optional(),
  stakes: AssessmentStakes,
  required: z.enum(["completion", "grade"]).optional(),
  submission: AssessmentSubmission.optional(),
  feedback: AssessmentFeedback,
});

export type Assessment = z.infer<typeof Assessment>;
```

**Step 4: Run + verify pass → Step 5: Commit**

```bash
git add packages/core/src/schema/assessment.ts packages/core/src/schema/assessment.test.ts
git commit -m "feat(core): add Assessment schema (assignment/practice/diagnostic/exam variants)

Per ADR 0073 — unified Assessment entity. Type tag drives UX +
submission flow + feedback timing. AssessmentItem discriminated union
covers 8 auto-gradable item kinds (multiple-choice, multiple-select,
numerical, short-text, code, plotly-chart, concept-map,
equation-derivation). Open-ended written responses go through
external rubric grading (Canvas at Tier 1/2; AI-aligned at Tier 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — `BKTState` schema

Per [ADR 0073](../website/decisions/0073-unified-assessment-schema.md): Per-(student, skill) Bayesian Knowledge Tracing state. Extends `BaseRecord`.

**Files:**
- Create: `packages/core/src/schema/bkt-state.ts`
- Test: `packages/core/src/schema/bkt-state.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { BKTState } from "./bkt-state.js";

const valid: BKTState = {
  user_id: "browser-uuid",
  course_id: "astr201-sp26",
  schema_version: "1.0.0",
  state_type: "bkt_mastery",
  created_at: "2026-05-21T11:35:22Z",
  updated_at: "2026-05-21T11:35:22Z",
  skill_id: "math-logarithms",
  p_learned: 0.42,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_count: 3,
  last_attempt_at: "2026-05-21T11:30:22Z",
};

describe("BKTState", () => {
  it("accepts a valid record", () => {
    expect(() => BKTState.parse(valid)).not.toThrow();
  });
  it("rejects p_learned outside [0, 1]", () => {
    expect(() => BKTState.parse({ ...valid, p_learned: 1.5 })).toThrow();
    expect(() => BKTState.parse({ ...valid, p_learned: -0.1 })).toThrow();
  });
  it("rejects negative attempt_count", () => {
    expect(() => BKTState.parse({ ...valid, attempt_count: -1 })).toThrow();
  });
  it("rejects missing skill_id", () => {
    const { skill_id, ...rest } = valid;
    expect(() => BKTState.parse(rest)).toThrow();
  });
});
```

**Step 2: Run + fail → Step 3: Implement**

`packages/core/src/schema/bkt-state.ts`:

```typescript
import { z } from "zod";
import { BaseRecord } from "./base-record.js";
import { NonEmptyString } from "./primitives.js";

/**
 * `BKTState` — per-(student, skill) Bayesian Knowledge Tracing state
 * (per [ADR 0073](../../../docs/website/decisions/0073-unified-assessment-schema.md)
 * §"BKT mastery model").
 *
 * Stored per-browser at Tier 1/2 (IndexedDB); server-side at Tier 3
 * (with same shape). Records extend `BaseRecord` with the four BKT
 * parameters + attempt accounting.
 */
export const BKTState = BaseRecord.extend({
  state_type: z.literal("bkt_mastery"),
  skill_id: NonEmptyString,
  p_learned: z.number().min(0).max(1),
  p_transit: z.number().min(0).max(1),
  p_slip: z.number().min(0).max(1),
  p_guess: z.number().min(0).max(1),
  attempt_count: z.number().int().nonnegative(),
  last_attempt_at: z.string().datetime().optional(),
});

export type BKTState = z.infer<typeof BKTState>;
```

**Step 4: Pass → Step 5: Commit**

```bash
git add packages/core/src/schema/bkt-state.ts packages/core/src/schema/bkt-state.test.ts
git commit -m "feat(core): add BKTState schema (Bayesian Knowledge Tracing per-skill state)

Per ADR 0073 — per-(student, skill) BKT state. Extends BaseRecord with
p_learned/p_transit/p_slip/p_guess parameters + attempt accounting.
Schema only; algorithm in @sophie/pedagogy-bkt (Wedge E).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — `FSRSRecord` schema

Per [ADR 0069](../website/decisions/0069-fsrs-spaced-repetition-engine.md): per-(student, target) FSRS scheduling state. Extends `BaseRecord`.

**Files:**
- Create: `packages/core/src/schema/fsrs-record.ts`
- Test: `packages/core/src/schema/fsrs-record.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { FSRSRecord } from "./fsrs-record.js";

const valid: FSRSRecord = {
  user_id: "browser-uuid",
  course_id: "astr201-sp26",
  schema_version: "1.0.0",
  state_type: "fsrs_state",
  created_at: "2026-05-21T11:35:22Z",
  updated_at: "2026-05-21T11:35:22Z",
  target_id: "logs-q1",
  target_type: "item",
  difficulty: 5.2,
  stability: 7.1,
  last_review_at: "2026-05-20T11:35:22Z",
  next_review_at: "2026-05-24T11:35:22Z",
  review_count: 4,
  desired_retention: 0.9,
};

describe("FSRSRecord", () => {
  it("accepts a valid record", () => {
    expect(() => FSRSRecord.parse(valid)).not.toThrow();
  });
  it("accepts each target_type variant", () => {
    for (const t of ["item", "unit", "section", "topic", "lo"]) {
      expect(() =>
        FSRSRecord.parse({ ...valid, target_type: t })
      ).not.toThrow();
    }
  });
  it("rejects desired_retention outside [0, 1]", () => {
    expect(() =>
      FSRSRecord.parse({ ...valid, desired_retention: 1.5 })
    ).toThrow();
  });
  it("rejects negative review_count", () => {
    expect(() =>
      FSRSRecord.parse({ ...valid, review_count: -1 })
    ).toThrow();
  });
});
```

**Step 2: Run + fail → Step 3: Implement**

`packages/core/src/schema/fsrs-record.ts`:

```typescript
import { z } from "zod";
import { BaseRecord } from "./base-record.js";
import { NonEmptyString } from "./primitives.js";

/**
 * `FSRSTargetType` — what kind of pedagogy graph node the FSRS state
 * is keyed against (per [ADR 0069](../../../docs/website/decisions/0069-fsrs-spaced-repetition-engine.md)).
 *
 * - `item`: a single `<RetrievalPrompt>` or practice problem
 * - `unit`: composite over a lecture's content
 * - `section`: composite over a module's content
 * - `topic`: a skill / prereq topic
 * - `lo`: a learning objective
 */
export const FSRSTargetType = z.enum(["item", "unit", "section", "topic", "lo"]);
export type FSRSTargetType = z.infer<typeof FSRSTargetType>;

/**
 * `FSRSRecord` — per-(student, target) Free Spaced Repetition Scheduler
 * state (per [ADR 0069](../../../docs/website/decisions/0069-fsrs-spaced-repetition-engine.md)).
 *
 * Maintains Difficulty + Stability per FSRS algorithm. Schedule
 * computed from D + S + elapsed time relative to `desired_retention`.
 * Schema only; algorithm in `@sophie/pedagogy-fsrs` (Wedge D).
 */
export const FSRSRecord = BaseRecord.extend({
  state_type: z.literal("fsrs_state"),
  target_id: NonEmptyString,
  target_type: FSRSTargetType,
  difficulty: z.number(),
  stability: z.number().positive(),
  last_review_at: z.string().datetime(),
  next_review_at: z.string().datetime(),
  review_count: z.number().int().nonnegative(),
  desired_retention: z.number().min(0).max(1),
});

export type FSRSRecord = z.infer<typeof FSRSRecord>;
```

**Step 4: Pass → Step 5: Commit**

```bash
git add packages/core/src/schema/fsrs-record.ts packages/core/src/schema/fsrs-record.test.ts
git commit -m "feat(core): add FSRSRecord schema (per-(student, target) spaced-repetition state)

Per ADR 0069 — Free Spaced Repetition Scheduler per-target state.
Extends BaseRecord with target_id + target_type (item/unit/section/
topic/lo) + difficulty + stability + review timestamps +
desired_retention. Schema only; algorithm in @sophie/pedagogy-fsrs
(Wedge D).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — Update barrel exports

`packages/core/src/schema/index.ts` re-exports every schema. Add the new ones.

**Files:**
- Modify: `packages/core/src/schema/index.ts`
- Modify: `packages/core/src/index.ts` (if it doesn't already re-export schema/*)

**Step 1: Read current state of `packages/core/src/schema/index.ts`** so you don't blow it away. Add the new exports preserving existing organization.

**Step 2: Add the new exports**

Append a new section to `packages/core/src/schema/index.ts`:

```typescript
// Course-website schema extensions (per ADRs 0066–0073)
export {
  BaseRecord,
} from "./base-record.js";
export {
  Subsection,
  SubsectionAutoGrouped,
  SubsectionExplicit,
} from "./subsection.js";
export {
  Unit,
  UnitType,
} from "./unit.js";
export {
  Artifact,
  ArtifactType,
  ArtifactScope,
  ArtifactReferences,
} from "./artifact.js";
export {
  Rubric,
  RubricCriterion,
  RubricScaleLevel,
} from "./rubric.js";
export {
  Assessment,
  AssessmentType,
  AssessmentItem,
  AssessmentItemType,
} from "./assessment.js";
export {
  BKTState,
} from "./bkt-state.js";
export {
  FSRSRecord,
  FSRSTargetType,
} from "./fsrs-record.js";
```

Also expose the runtime helper. If `packages/core/src/runtime/index.ts` exists, add:

```typescript
export { createPedagogyRecord } from "./create-pedagogy-record.js";
```

If `packages/core/src/index.ts` doesn't already re-export schema + runtime, ensure it does:

```typescript
export * from "./schema/index.js";
export * from "./runtime/index.js";
```

**Step 3: Verify imports work from outside the package**

```bash
pnpm turbo run typecheck --filter=@sophie/core
```

Expected: 0 errors. If anything fails, fix it before moving on.

**Step 4: Commit**

```bash
git add packages/core/src/schema/index.ts packages/core/src/runtime/index.ts packages/core/src/index.ts
git commit -m "feat(core): export new course-website schemas through barrel

Adds BaseRecord, Subsection (+variants), Unit, Artifact (+types +
scope), Rubric (+Criterion +ScaleLevel), Assessment (+Item + types),
BKTState, FSRSRecord (+TargetType), createPedagogyRecord to the
@sophie/core public surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — Pre-PR verification gates

Run every gate this PR will face in CI. Per `feedback_pre_pr_lockfile_check` + `feedback_biome_verification` memories.

**Step 1: Lockfile check**

```bash
pnpm install --frozen-lockfile
```

Expected: "Already up to date" (no lockfile drift; no new deps added in this wedge).

**Step 2: Biome (full check, NOT just tail)**

```bash
pnpm exec biome check
```

Expected: exit code 0; 0 errors, 0 warnings. **Per `feedback_biome_verification`: do not rely on tail output — grep for "error"/"warning" or check exit code explicitly.**

If anything fails:
1. Try `pnpm exec biome check --write` to auto-fix safe issues
2. Re-run `pnpm exec biome check`
3. Hand-fix anything remaining

**Step 3: Typecheck**

```bash
pnpm turbo run typecheck
```

Expected: exit 0. All 11 tasks (per Sophie's current monorepo) green.

**Step 4: Unit tests**

```bash
pnpm turbo run test:unit
```

Expected: exit 0. New schema tests included (8 new test files; ~40-60 new tests total).

**Step 5: Build**

```bash
pnpm turbo run build
```

Expected: exit 0. `@sophie/core` rebuilds with the new schemas exposed.

**Step 6: E2E** (sanity check — these schemas shouldn't affect E2E but run anyway)

```bash
pnpm test:e2e
```

Expected: 157/0/5 (same as Sprint K post-merge baseline) or better.

**Step 7: Visual regression** — skip locally; CI will run this.

---

## Task 12 — Open PR

**Step 1: Push branch**

```bash
git push -u origin feat/course-website-schema
```

**Step 2: Create PR via gh**

```bash
gh pr create --base main --title "feat(core): course-website schema extensions (Wedge A — schemas only)" --body "$(cat <<'EOF'
## Summary

First implementation wedge of the course-website roadmap. Pure schema
extensions; no UI; no runtime integration; no breaking changes.

Lands the typed entities locked by ADRs 0066–0073:

- **`BaseRecord`** (ADR 0066): user_id + course_id + schema_version +
  state_type + created_at + updated_at — the stable shape every
  persisted record carries.
- **`createPedagogyRecord` helper** — convenience constructor.
- **`Subsection`** (ADR 0067): auto-grouped + explicit variants.
- **`Unit`** (ADR 0067): typed (lecture / project / lab / topic /
  skill) with prereqs + topic_id.
- **`Artifact`** (ADR 0067): 20 typed variants (10 Unit-level + 10
  Section-level); typed cross-references for pedagogy-index audit.
- **`Rubric`** + Criterion + ScaleLevel (ADR 0073): criterion-based +
  holistic variants.
- **`Assessment`** (ADR 0073): assignment / practice / diagnostic /
  exam variants; `AssessmentItem` discriminated union over 8
  auto-gradable item kinds.
- **`BKTState`** (ADR 0073): Bayesian Knowledge Tracing per-skill
  state.
- **`FSRSRecord`** (ADR 0069): Free Spaced Repetition Scheduler
  per-target state.

All extend `BaseRecord` where applicable. Schema-only — algorithm
implementations land in future wedges (`@sophie/pedagogy-fsrs`,
`@sophie/pedagogy-bkt`, etc.).

## Scope deliberately excluded

- Existing `Section`/`Module` schema reconciliation (separate PR)
- Component implementations (Wedge B)
- Library room infrastructure (Wedge C)
- Algorithm implementations (Wedges D + E)

## Test plan

- [x] `pnpm exec biome check` — 0 errors, 0 warnings
- [x] `pnpm turbo run typecheck` — 0 errors
- [x] `pnpm turbo run test:unit` — all schemas + helper green; new
      tests pass
- [x] `pnpm turbo run build` — `@sophie/core` rebuilds with new exports
- [x] `pnpm test:e2e` — no regressions
- [x] `pnpm install --frozen-lockfile` — no diff

## Related

- Plan file: `docs/plans/2026-05-21-course-website-schema-extensions.md`
- Roadmap: `docs/website/status/course-website-roadmap.md`
- ADRs: 0066 (pseudonymous-first), 0067 (Section/Unit/Artifact),
  0069 (FSRS), 0073 (Assessment + BKT)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Monitor CI**

Use the standard `gh pr checks <number>` flow. All required checks
(lint, build, typecheck, unit, e2e, storybook, visual-regression)
should pass — this wedge changes no rendered output, so VR baselines
should not diff.

**Step 4: Squash-merge when green**

Per [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md):

```bash
gh pr merge <number> --squash
```

**Step 5: Sync local main + cleanup**

```bash
git checkout main
git pull --ff-only
git branch -d feat/course-website-schema
git push origin --delete feat/course-website-schema
```

---

## Verification at completion

After all tasks land + the PR merges:

1. **`docs/website/status/validation.md` does NOT need regenerating** for this wedge — these are *code* schemas, not ADR validation-status updates. The `validation:` frontmatter in the ADRs that govern these schemas is unchanged by the implementation landing.
2. **Memory update worth considering** after merge: record the schema-package surface (`@sophie/core` now exports BaseRecord, Subsection, Unit, Artifact, Rubric, Assessment, BKTState, FSRSRecord, createPedagogyRecord) so future Claude sessions know about them.

## Notes for the executing engineer

- **TDD strictly**: every task has tests-first. Don't skip the
  "run + verify fail" steps — they prove the test is testing what you
  think.
- **Frequent commits**: one commit per task minimum. Don't batch
  unrelated work.
- **Biome verification**: never trust tail-only output (memory
  `feedback_biome_verification`).
- **Schema cross-refs in JSDoc**: use the `../../../docs/website/decisions/`
  relative path so the rendered `pnpm typedoc` (if Sophie ships it
  later) can resolve them.
- **Don't touch existing `section.ts` or `module.ts`**: the
  Section/Module reconciliation is a separate wedge with its own plan.
- **If any Zod pattern is unclear**: read existing
  `packages/core/src/schema/chapter.ts` for the canonical style.
- **When in doubt**: HITL — pause and surface the question rather
  than guessing (per CLAUDE.md mandate).

## Followup wedges (out of scope for this plan)

- **Wedge A.5**: Section/Module schema reconciliation — rename existing
  `section.ts` → `chapter-section.ts`; introduce new `Section`
  discriminated union over module/phase/track/bridge.
- **Wedge B**: Tier 1 pedagogy components — `<RetrievalPrompt>`,
  `<WorkedExample>`, `<FadedPrompt>`, `<InterleavedSet>`; evolved
  `<SkillReview>` with retrieval-first surface.
- **Wedge C**: Library room infrastructure — `<EquationSpecPage>`,
  Cheatsheet, PDF export, Astro routing.
- **Wedge D**: `@sophie/pedagogy-fsrs` — FSRS algorithm implementation
  + React hook + IndexedDB persistence layer.
- **Wedge E**: `@sophie/pedagogy-bkt` — BKT algorithm + adaptive
  surfacing.
- **Wedge F**: Schedule view + iCal export.
- **Wedge G**: AI co-authoring scaffold for Section-level practice-set
  draft generation.
