# Deploy-Time Gated Solutions + Homework Registry — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a homework registry + per-chapter, build-time-gated solutions to
Sophie so a consumer course (astr201) can post worked solutions only after an
assignment's due date — with real protection (gated content absent from `dist/`,
not merely CSS-hidden).

**Architecture:** Two decoupled layers. (1) A **homework registry**
(`virtual:sophie/homework`, `T | null`, always-register) is the per-term source
of truth for `assignedDate` / `dueDate` / cross-chapter problem membership.
(2) **Per-chapter solution reveal**: each chapter's solutions live in a separate
`solutions.mdx`, rendered into `dist/` **only** when the chapter's resolved
reveal date has passed (`explicit solutionsRevealDate ?? max(dueDate of
homeworks touching the chapter)`, **fail-closed**). The gate is route-level
(`getStaticPaths`), so withheld content never enters the build. Mirrors the
existing `course-spec` pipeline end-to-end.

**Tech Stack:** Zod 4 (`z.iso.date()`), `@sophie/core` (schema), `@sophie/astro`
(loader + virtual module + injected route + integration), Vitest, Astro content
collections. Consumer cron lives in `astr201/.github/workflows/deploy.yml`.

**Design source:** `docs/plans/2026-05-30-deploy-time-gated-solutions-design.md`.
**ADR:** 0096 (written in Task 1; approved in-thread 2026-05-30).

**Locked decisions (do not re-litigate during execution):**
- Chapter-clean gating: before reveal, prompts + `<Hint>` only; no auto-check, no
  solutions for the whole chapter. After: full set opens.
- Content split: `practice.mdx` (prompts + hints, always shipped) +
  `solutions.mdx` (answers + worked solutions, gated). No AST-strip transform.
- Fail-closed: `tbd` / absent / future reveal date → hidden.
- Registry-side membership (problems are NOT tagged in MDX) → content reusable
  per term.
- Array-of-groups problem lists; `z.iso.date()` for dates.
- No client hydration — gating is build-time/SSR only.

**Verification gate for the whole feature (W4):** after PR 2, a future-dated
chapter's `dist/` contains **zero** solution text — proven by
`grep -r "<solution-marker>" dist/` returning empty. This is the security
acceptance test, not a nicety.

---

## PR 1 — Schema + loader + virtual module (platform core, renders nothing yet)

### Task 1: Write ADR 0096 + relocate design doc onto the branch

**Files:**
- Create: `docs/website/decisions/0096-deploy-time-gated-content.md`
- Move: `docs/plans/2026-05-30-deploy-time-gated-solutions-design.md` (from the
  main-checkout untracked copy → committed on this branch; re-create here if
  absent in the worktree)
- Modify: `AGENTS.md` (R12 nullable-module list: add `virtual:sophie/homework`)

**Step 1:** Write ADR 0096 from §10 of the design doc. Frontmatter `status:
accepted-design`, `validation:` block `in-progress`. Sections: Context (build-time
SSG, no auth, security-audit ref), Decision (registry + chapter-scoped
fail-closed reveal + build-time gate + consumer cron), Consequences, Alternatives
rejected (client toggle; per-problem strip; separate instructor artifact).
Amends astr201 decision 0001 §6 ("solutions not migrated").

**Step 2:** Extend AGENTS.md R12 scope clarification — add `virtual:sophie/homework`
(`HomeworkRegistry | null`) to the "Currently nullable" list.

**Step 3:** Regenerate the validation dashboard (new ADR with a validation block
trips integration test I3).

Run: `pnpm --filter @sophie/core build && pnpm tsx scripts/regenerate-validation-index.mts`
Expected: `docs/website/status/validation.md` updated to include 0096.

**Step 4: Commit**

```bash
git add docs/website/decisions/0096-deploy-time-gated-content.md docs/plans/ AGENTS.md docs/website/status/validation.md
git commit -m "docs(adr): ADR 0096 deploy-time gated content + homework registry (design)"
```

---

### Task 2: HomeworkRegistry schema in `@sophie/core`

**Files:**
- Create: `packages/core/src/schema/homework.ts`
- Modify: `packages/core/src/schema/index.ts` (barrel re-export)
- Test: `packages/core/src/schema/homework.test.ts`
- Fixtures: `packages/core/src/schema/__fixtures__/homework-valid.yaml`,
  `__fixtures__/invalid/homework-duplicate-claim.yaml`

**Step 1: Write the failing test** (`homework.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { HomeworkRegistrySchema } from "./homework.ts";

const valid = () => ({
  homework: [
    {
      id: "hw-3",
      title: "Homework 3 — Gravity",
      assignedDate: "2027-02-06",
      dueDate: "2027-02-20",
      problems: [
        { unit: "lecture-03-gravity-and-orbits", ids: ["grav-pr-04", "grav-pr-09"] },
        { unit: "lecture-01-ages-lifetimes", ids: ["ages-pr-03"] },
      ],
    },
  ],
});

describe("HomeworkRegistrySchema", () => {
  it("accepts a valid registry", () => {
    expect(() => HomeworkRegistrySchema.parse(valid())).not.toThrow();
  });

  it("accepts dueDate: tbd", () => {
    const spec = valid();
    spec.homework[0].dueDate = "tbd";
    expect(() => HomeworkRegistrySchema.parse(spec)).not.toThrow();
  });

  it("rejects assignedDate after dueDate", () => {
    const spec = valid();
    spec.homework[0].assignedDate = "2027-03-01";
    expect(() => HomeworkRegistrySchema.parse(spec)).toThrow(/assignedDate.*dueDate/i);
  });

  it("rejects a problem claimed by two homeworks", () => {
    const spec = valid();
    spec.homework.push({
      ...valid().homework[0],
      id: "hw-4",
      problems: [{ unit: "lecture-03-gravity-and-orbits", ids: ["grav-pr-04"] }],
    });
    expect(() => HomeworkRegistrySchema.parse(spec)).toThrow(/claimed by at most one/i);
  });

  it("rejects an empty ids array", () => {
    const spec = valid();
    spec.homework[0].problems[0].ids = [];
    expect(() => HomeworkRegistrySchema.parse(spec)).toThrow();
  });
});
```

**Step 2: Run to verify it fails**
Run: `pnpm --filter @sophie/core test homework`
Expected: FAIL — `HomeworkRegistrySchema` not exported.

**Step 3: Implement** (`homework.ts`). Note Zod 4 + `.strict()`; reuse `Slug` /
`NonEmptyString` from `./primitives.ts`. Cross-refines on the top-level object
(template: `course-spec.ts:363–394`).

```ts
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.ts";

const DateOrTbd = z.union([z.iso.date(), z.literal("tbd")]);

const ProblemGroupSchema = z
  .object({ unit: Slug, ids: z.array(NonEmptyString).min(1) })
  .strict();

const HomeworkSchema = z
  .object({
    id: Slug,
    title: NonEmptyString,
    assignedDate: DateOrTbd,
    dueDate: DateOrTbd,
    problems: z.array(ProblemGroupSchema).min(1),
  })
  .strict()
  .refine(
    (hw) =>
      hw.assignedDate === "tbd" ||
      hw.dueDate === "tbd" ||
      new Date(hw.assignedDate) <= new Date(hw.dueDate),
    { message: "assignedDate must be on or before dueDate", path: ["assignedDate"] },
  );

export const HomeworkRegistrySchema = z
  .object({ homework: z.array(HomeworkSchema) })
  .strict()
  .refine(
    (reg) => {
      const seen = new Set<string>();
      for (const hw of reg.homework)
        for (const g of hw.problems)
          for (const id of g.ids) {
            const key = `${g.unit}/${id}`;
            if (seen.has(key)) return false;
            seen.add(key);
          }
      return true;
    },
    { message: "each problem may be claimed by at most one homework", path: ["homework"] },
  );

export type HomeworkRegistry = z.infer<typeof HomeworkRegistrySchema>;
export type Homework = z.infer<typeof HomeworkSchema>;
```

**Step 4: Re-export** — add to `packages/core/src/schema/index.ts` (alongside the
course-spec exports ~lines 49–100):

```ts
export {
  type Homework,
  type HomeworkRegistry,
  HomeworkRegistrySchema,
} from "./homework.ts";
```

**Step 5: Run tests** → `pnpm --filter @sophie/core test homework` → PASS.

**Step 6:** Bump `packages/core/vitest.config.ts` coverage floors upward to the
new measured values (`pnpm --filter @sophie/core test --coverage`; ratchet rule).

**Step 7: Commit** — `feat(core): HomeworkRegistry schema + cross-refines`

> NOTE for executor: the "unit exists" + "id exists in that unit's practice"
> cross-refines are NOT in the core schema — `@sophie/core` has no filesystem
> access (framework-purity, ADR 0001). They run in the loader (Task 4) where the
> content collection is available. Keep the core schema to shape + intra-registry
> invariants only.

---

### Task 3: `homework-loader.ts` in `@sophie/astro`

**Files:**
- Create: `packages/astro/src/lib/homework-loader.ts`
- Test: `packages/astro/src/lib/homework-loader.test.ts`

Copy `course-spec-loader.ts` verbatim; substitute filename
`homework.sophie.yaml`, schema `HomeworkRegistrySchema`, return type
`HomeworkRegistry | null`. Same three-state contract (null on absent, throw on
malformed/invalid, value on valid). Test via `mkdtempSync` (template:
`course-spec-loader.test.ts`): null-on-missing, valid-loads, throw-on-bad-YAML,
throw-on-schema-invalid. Commit `feat(astro): homework.sophie.yaml loader`.

---

### Task 4: Virtual module + integration wiring

**Files:**
- Create: `packages/astro/src/lib/homework-virtual-module.ts`
- Modify: `packages/astro/src/virtual-modules.d.ts` (add `declare module
  "virtual:sophie/homework"`)
- Modify: `packages/astro/src/integration.ts` (load at ~line 122; register plugin
  at ~line 176)
- Test: `packages/astro/src/lib/homework-virtual-module.test.ts`

Copy `course-spec-virtual-module.ts`; substitute id `virtual:sophie/homework`,
export name `homework`, plugin name `sophie:homework`. Keep the R8 HMR docblock.
In `integration.ts`: `const homework = loadHomework(consumerRoot);` and
`homeworkVirtualModule(homework) as never,` in the `vite.plugins` array — always
registered even when null (always-register pattern). Add the `T | null` block to
`virtual-modules.d.ts`. Test: serializes a registry; serializes `null`. Commit
`feat(astro): virtual:sophie/homework module (always-register, T|null)`.

---

## PR 2 — Reveal resolver + Solutions route + gating

### Task 5: Chapter reveal-date resolver (the security-critical core)

**Files:**
- Create: `packages/astro/src/lib/resolve-solution-reveal.ts`
- Test: `packages/astro/src/lib/resolve-solution-reveal.test.ts`

**Step 1: Write the failing test** — exhaustively cover fail-closed:

```ts
import { describe, expect, it } from "vitest";
import { isChapterRevealed } from "./resolve-solution-reveal.ts";

const reg = (dueDate: string) => ({
  homework: [{ id: "hw-1", title: "x", assignedDate: "2027-01-01", dueDate,
    problems: [{ unit: "u1", ids: ["p1"] }] }],
});
const at = (d: string) => new Date(d);

describe("isChapterRevealed (fail-closed)", () => {
  it("hidden when no homework references the chapter and no explicit date", () => {
    expect(isChapterRevealed("u1", null, reg("2027-02-01"), at("2030-01-01"))).toBe(false);
  });
  it("hidden when dueDate is tbd", () => {
    expect(isChapterRevealed("u1", undefined, reg("tbd"), at("2030-01-01"))).toBe(false);
  });
  it("hidden before the due date", () => {
    expect(isChapterRevealed("u1", undefined, reg("2027-02-20"), at("2027-02-19"))).toBe(false);
  });
  it("revealed on/after the due date", () => {
    expect(isChapterRevealed("u1", undefined, reg("2027-02-20"), at("2027-02-20"))).toBe(true);
  });
  it("uses the LATEST due date when multiple homeworks touch the chapter", () => {
    const r = { homework: [
      { id: "a", title: "x", assignedDate: "2027-01-01", dueDate: "2027-02-01", problems: [{ unit: "u1", ids: ["p1"] }] },
      { id: "b", title: "x", assignedDate: "2027-01-01", dueDate: "2027-03-01", problems: [{ unit: "u1", ids: ["p2"] }] },
    ] };
    expect(isChapterRevealed("u1", undefined, r, at("2027-02-15"))).toBe(false); // before latest
    expect(isChapterRevealed("u1", undefined, r, at("2027-03-01"))).toBe(true);
  });
  it("explicit override wins over derived date", () => {
    expect(isChapterRevealed("u1", "2027-01-15", reg("2027-02-20"), at("2027-01-15"))).toBe(true);
  });
  it("explicit tbd stays hidden even if a homework due date passed", () => {
    expect(isChapterRevealed("u1", "tbd", reg("2027-02-01"), at("2030-01-01"))).toBe(false);
  });
  it("hidden when registry is null", () => {
    expect(isChapterRevealed("u1", undefined, null, at("2030-01-01"))).toBe(false);
  });
});
```

**Step 2:** Run → FAIL.

**Step 3: Implement** — fail-closed by construction:

```ts
import type { HomeworkRegistry } from "@sophie/core/schema";

/** Resolve a chapter's reveal date, then decide visibility. Fail-closed:
 *  any non-concrete / future date → hidden. `explicit` may be a date,
 *  "tbd", or undefined (derive from homework). */
export function isChapterRevealed(
  unit: string,
  explicit: string | null | undefined,
  registry: HomeworkRegistry | null,
  now: Date,
): boolean {
  const resolved = resolveRevealDate(unit, explicit, registry);
  if (resolved === null) return false; // fail-closed
  return now.getTime() >= resolved.getTime();
}

function resolveRevealDate(
  unit: string,
  explicit: string | null | undefined,
  registry: HomeworkRegistry | null,
): Date | null {
  if (explicit === "tbd") return null;
  if (explicit) return new Date(explicit);
  if (!registry) return null;
  const due = registry.homework
    .filter((hw) => hw.problems.some((g) => g.unit === unit))
    .map((hw) => hw.dueDate)
    .filter((d): d is string => d !== "tbd");
  if (due.length === 0) return null; // no concrete date → hidden
  return new Date(due.reduce((a, b) => (a > b ? a : b))); // latest
}
```

**Step 4:** Run → PASS. **Step 5:** Commit `feat(astro): fail-closed chapter
reveal resolver`.

> The `now` parameter is injected (build wall-clock) so this is pure + fully
> testable — never call `new Date()` inside the resolver.

---

### Task 6: Inject the Solutions route + gate in `getStaticPaths`

**Files:**
- Create: `packages/astro/src/routes/solutions.astro`
- Modify: `packages/astro/src/integration.ts` (`injectRoute` after the practice
  injection ~line 226)
- Test: `packages/astro/src/routes/solutions.getStaticPaths.test.ts` (unit-test
  the path-building helper, extracted so it's testable without Astro runtime)

**Step 1:** Extract the gated path logic into a pure helper
`buildSolutionPaths(artifacts, units, registry, now)` and test it: a unit whose
chapter is revealed yields a page with `props.revealed === true`; a gated chapter
yields `props.revealed === false` (placeholder page, NO artifact content). A
revealed chapter's props include the `solutions` artifact; a gated chapter's
props do NOT (so `render()` is never called on it → solution text absent from
`dist/`).

**Step 2:** `solutions.astro` mirrors `practice.astro` but:
- filters `artifacts` on `a.id.endsWith("/solutions")`;
- computes `revealed` per unit via `isChapterRevealed(...)` using `homework`
  (from `virtual:sophie/homework`) + optional unit `solutionsRevealDate` + build
  `new Date()` (the ONLY place wall-clock is read);
- if `revealed`: `render(solutionsArtifact)` inside `<ChapterLayout
  viewKind="solutions">`;
- else: render a `<SolutionsPlaceholder date={resolvedDateOrTbd} />` and DO NOT
  import/render the artifact.

**Step 3:** `injectRoute({ pattern: "/units/[unit]/solutions", entrypoint:
"@sophie/astro/routes/solutions.astro" })` after the practice injection.

**Step 4:** Run unit tests → PASS. **Step 5:** Commit `feat(astro): gated
/units/[unit]/solutions route`.

---

### Task 7: Solutions nav tab + placeholder component + a11y

**Files:**
- Modify: the unit/chapter nav (wherever `practice` tab is rendered — locate via
  `grep -rn "viewKind" packages/astro/src`) to add a `Solutions` tab.
- Create: `packages/astro/src/components/SolutionsPlaceholder.astro`
- Test: axe-core on both the revealed solutions render and the placeholder
  (ADR 0004 mandate; R11). Landmark per R10 (`<section aria-labelledby>` if
  nested under the chapter `<main>`).

Commit `feat(astro): Solutions tab + gated placeholder (a11y)`.

---

### Task 8: Security acceptance test (the W4 gate)

**Files:** `packages/astro/src/routes/solutions.security.test.ts` (or a smoke
assertion in `examples/smoke`).

Build a fixture consumer with one future-dated chapter containing a
`solutions.mdx` whose body has a unique sentinel string. Build. Assert the
sentinel is **absent** from the built output. Assert a past-dated chapter's
sentinel **is present**. This is the real-protection proof. Commit
`test(astro): prove gated solution text is absent from build`.

---

## PR 3 — astr201 consumer: registry + pilot re-pedagogy (separate repo)

> Runs in `/Users/anna/Teaching/astr201` after PRs 1–2 publish/resolve locally
> via the `pnpm-workspace` override.

### Task 9: `homework.sophie.yaml` + a `tbd` and a concrete fixture
Create the registry with the gravity-and-orbits problems. Include one `tbd`
homework + one concrete-date homework to exercise both gate states. Run `sophie
validate`.

### Task 10: Re-pedagogize gravity-and-orbits — `practice.mdx` (prompts + hints)
Rewrite the pilot `practice.mdx` to the pattern vocabulary, **prompts + `<Hint>`
ladders only** (no `<Solution>`, no `<NumericQuestion.Answer>`). Misconception
#2 → `<MCQ>` prompt (correct answer lives in solutions.mdx). Use the
`lecture-writing` + `check-science` skills.

### Task 11: Author `solutions.mdx` (answers + worked solutions) — VERIFIED
Author the gated `solutions.mdx`: `<NumericQuestion>` with verified `value`,
`<MCQ correct>`, `<Solution>` worked reveals. **Show CGS work for every numeric
answer in the PR description** for Anna's spot-check (CLAUDE.md standard). No
answer ships unverified.

### Task 12: Consumer cron + verify
Add `schedule: - cron: "17 8 * * *"` to `astr201/.github/workflows/deploy.yml`
triggers (daily rebuild flips chapters as dates pass). Verify locally: build with
a past date → solutions render; build with a future/`tbd` date → `grep dist/`
shows the worked-solution sentinel absent. axe-core clean. Anna sign-off before
batching the other 14 sets.

---

## Out of scope (W2 — do NOT build)
- Per-homework assembled solutions view (`/homework/hw-3/solutions/`).
- Sourcing reveal dates from `ScheduleSchema` (future; registry is forward-shaped
  for it).
- The frontend-design findings + info-page base-path bug (separate, post-pilot).
- Batching the other 14 practice sets (after pilot sign-off).
