# Wedge B-followup Implementation Plan (W4a — Library room route migration + hub)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Default batch size = 3 tasks; report after each batch and wait for Anna's confirmation per the HITL mandate in `/Users/anna/Teaching/sophie/CLAUDE.md`.

**Goal:** Hard-rename 6 course-level rollup routes (`/glossary`, `/equations`, `/figures`, `/misconceptions`, `/key-insights`, `/objectives`) to their `/library/<X>/` equivalents under the ADR 0067 Library "room" hierarchy. Add a minimal Library hub page at `/library/index.astro`. Migrate 6 e2e specs, 9 lines in `chapter-components.md`, 6 JSDoc/comment refs in component code, and 1 ADR-0038 example. No new components; no schema changes; no audit changes; no 301 redirects.

**Architecture:** Pure URL-string rename. Sophie's modular shape keeps the rename surface tight (~30 atomic edits across ~15 files): no breadcrumb helpers, no navigation chrome, no CI-config hardcodes affected (verified clean in Phase-1 grep). The W3 pilot-report doctrine R1/R2 applies: grep multiple URL-string shapes (bare literals, `href=`, markdown-link `]\(/X\)`, `page.goto`, template-literals); pair regex rewrites with a structural disambiguator that distinguishes route-paths from asset-paths and from prose mentions. See [design doc](2026-05-22-wedge-b-followup-w4a-design.md) for D1–D4 + touchpoint inventory.

**Tech Stack:** Astro 6, TypeScript, pnpm, Turborepo, Biome, Vitest, Playwright. No new deps. Worktree at `.worktrees/wedge-b-followup-w4a/`, branch `feat/wedge-b-followup-w4a` off `origin/main` at `ade2696`.

---

## Batch 1 — Worktree + design + plan (this PR's metadocs)

### Task 1 — Worktree + branch (DONE)

**Status:** ✅ Done before plan landed.

```bash
git worktree add .worktrees/wedge-b-followup-w4a -b feat/wedge-b-followup-w4a origin/main
cd .worktrees/wedge-b-followup-w4a
pnpm install --frozen-lockfile
```

Baseline verified: biome 0 errors / 0 warnings (696 files); typecheck 11/11 tasks cached-green.

### Task 2 — W4a design doc (DONE)

**Status:** ✅ Done before plan landed.

**File:** `docs/plans/2026-05-22-wedge-b-followup-w4a-design.md` (this Batch).

Mirrors W3 design-doc shape: §1 Goal & context, §2 Locked design decisions (D1 hard-rename / D2 `/objectives` 6th rollup / D3 minimal Library hub / D4 docs no-drift policy), §3 Phase-1 touchpoint enumeration, §4 W3 doctrine application, §5 implementation strategy (4 batches), §6 verification, §7 risk + mitigation, §8 pilot report shape.

### Task 3 — This plan doc (DONE on write)

**File:** `docs/plans/2026-05-22-wedge-b-followup-w4a.md` (this file).

**Step:** Commit Batch 1 metadocs:

```bash
git add docs/plans/2026-05-22-wedge-b-followup-w4a-design.md docs/plans/2026-05-22-wedge-b-followup-w4a.md
git commit -m "docs(W4a): wedge B-followup W4a design + plan"
```

---

## Batch 2 — Route file moves + Library hub creation

### Task 4 — Create `examples/smoke/src/pages/library/` directory + `git mv` the 6 rollup routes

**Files affected:**
- Move: `examples/smoke/src/pages/glossary.astro` → `examples/smoke/src/pages/library/glossary.astro`
- Move: `examples/smoke/src/pages/equations.astro` → `examples/smoke/src/pages/library/equations.astro`
- Move: `examples/smoke/src/pages/figures.astro` → `examples/smoke/src/pages/library/figures.astro`
- Move: `examples/smoke/src/pages/misconceptions.astro` → `examples/smoke/src/pages/library/misconceptions.astro`
- Move: `examples/smoke/src/pages/key-insights.astro` → `examples/smoke/src/pages/library/key-insights.astro`
- Move: `examples/smoke/src/pages/objectives.astro` → `examples/smoke/src/pages/library/objectives.astro`

**Step 1: Use `git mv` to preserve history**

```bash
cd examples/smoke/src/pages
mkdir -p library
git mv glossary.astro library/glossary.astro
git mv equations.astro library/equations.astro
git mv figures.astro library/figures.astro
git mv misconceptions.astro library/misconceptions.astro
git mv key-insights.astro library/key-insights.astro
git mv objectives.astro library/objectives.astro
cd ../../../..
```

**Step 2: Verify no content changes**

```bash
git diff --stat HEAD
```

Expected: 6 file renames, zero line changes.

**Step 3: Verify each route file imports unaffected (relative imports point to `../content/...`)**

Inside each moved file, imports like `from "../content/figures"` need to become `from "../../content/figures"` because the file dropped a directory level. Check each:

```bash
rg -n 'from "\.\./content' examples/smoke/src/pages/library/
```

If any matches found, update the relative depth (one extra `../`).

**Step 4: Verify each route file imports `@sophie/*` paths unaffected**

Imports of `@sophie/astro/components/...` use package aliases — unaffected by directory move.

### Task 5 — Create the Library hub page

**File to create:** `examples/smoke/src/pages/library/index.astro`

**Step 1: Write the hub page (minimal — per design D3)**

Use this exact shape (mirrors `objectives.astro`'s frontmatter posture but with no `CourseX` body):

```astro
---
import ModuleNav from "@sophie/astro/components/ModuleNav.astro";
import TextbookHead from "@sophie/astro/components/TextbookHead.astro";
import TextbookLayout from "@sophie/astro/components/TextbookLayout.astro";
import { SophieChapter } from "@sophie/astro/client";
import { getCollection } from "astro:content";
import { figures as figureRegistry } from "../../content/figures";

/**
 * `/library/` — Library hub.
 *
 * Lists the 6 course-level rollup rooms migrated in Wedge B-followup
 * W4a per ADR 0067 §2.1. W4b adds Topics; W4c adds Observables /
 * Models / Inferences + per-entry Spec pages.
 *
 * Minimal placeholder per W4a design doc §2 D3 — shell extraction
 * and faceted nav land in W4c.
 */

const figureRegistryArray = Object.values(figureRegistry);

const sections = (await getCollection("sections")).map((s) => s.data);
const units = (await getCollection("units")).map((u) => u.data);
const modules = sections.map((s) => ({
  slug: s.slug,
  title: s.title,
  order: s.order,
  description: s.description,
}));
const chapters = units.map((u) => ({
  slug: u.id,
  title: u.title,
  module: u.section_id,
  order: u.order,
  chapter: undefined as number | undefined,
  status: u.status,
}));

const rooms = [
  { href: "/library/glossary", title: "Glossary", description: "All definitions across the course, alphabetical." },
  { href: "/library/equations", title: "Equations", description: "All equations across the course." },
  { href: "/library/figures", title: "Figures", description: "Every figure (canonical entries from the registry)." },
  { href: "/library/key-insights", title: "Key insights", description: "All key insights across the course." },
  { href: "/library/misconceptions", title: "Misconceptions", description: "All misconceptions across the course." },
  { href: "/library/objectives", title: "Objectives", description: "Hierarchical Module → Chapter → Objectives roll-up." },
];
---

<html lang='en'>
  <head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <title>Library</title>
    <meta
      name='description'
      content='Course-wide reference rooms: glossary, equations, figures, key insights, misconceptions, objectives.'
    />
    <TextbookHead />
  </head>
  <body>
    <SophieChapter client:load>
      <TextbookLayout figureRegistry={figureRegistryArray}>
        <Fragment slot='sidebar'>
          <ModuleNav modules={modules} chapters={chapters} />
        </Fragment>
        <h1>Library</h1>
        <p>
          Course-wide reference rooms. Each room rolls up entries of one
          epistemic kind across the whole course.
        </p>
        <ul>
          {rooms.map((room) => (
            <li>
              <a href={room.href}>{room.title}</a> — {room.description}
            </li>
          ))}
        </ul>
      </TextbookLayout>
    </SophieChapter>
  </body>
</html>
```

**Step 2: Verify smoke builds with the 6 moved routes + the new hub**

```bash
pnpm turbo run build --filter=@sophie/astro-smoke 2>&1 | tail -20
```

Expected: build succeeds; `dist/` contains `library/index.html` + `library/glossary/index.html` + 5 more.

**Step 3: Manual route check (optional)**

```bash
ls examples/smoke/dist/library/
```

Expected: `index.html`, `glossary/`, `equations/`, `figures/`, `misconceptions/`, `key-insights/`, `objectives/`.

**Step 4: Commit Batch 2**

```bash
git add examples/smoke/src/pages/
git commit -m "feat(W4a): move 6 rollup routes to /library/<X>/ + add Library hub"
```

---

## Batch 3 — E2e const updates

### Task 6 — Rename URL constants in 6 e2e specs

**Files affected:**
- `examples/smoke/e2e/course-glossary.spec.ts:4`
- `examples/smoke/e2e/course-equations.spec.ts:4`
- `examples/smoke/e2e/course-figures.spec.ts:4`
- `examples/smoke/e2e/course-misconceptions.spec.ts:4`
- `examples/smoke/e2e/course-key-insights.spec.ts:4`
- `examples/smoke/e2e/objectives.spec.ts:4`

**Step 1: Update each const declaration**

```typescript
// course-glossary.spec.ts:4
- const GLOSSARY_URL = "/glossary";
+ const GLOSSARY_URL = "/library/glossary";

// course-equations.spec.ts:4
- const EQUATIONS_URL = "/equations";
+ const EQUATIONS_URL = "/library/equations";

// course-figures.spec.ts:4
- const FIGURES_URL = "/figures";
+ const FIGURES_URL = "/library/figures";

// course-misconceptions.spec.ts:4
- const MISCONCEPTIONS_URL = "/misconceptions";
+ const MISCONCEPTIONS_URL = "/library/misconceptions";

// course-key-insights.spec.ts:4
- const KEY_INSIGHTS_URL = "/key-insights";
+ const KEY_INSIGHTS_URL = "/library/key-insights";

// objectives.spec.ts:4
- const OBJECTIVES_URL = "/objectives";
+ const OBJECTIVES_URL = "/library/objectives";
```

**Step 2: Ensure port 4321 is clean (per `project_local_dev_pagefind_e2e_pitfall`)**

```bash
lsof -ti:4321 | xargs -r kill 2>/dev/null
sleep 1
lsof -ti:4321 || echo "port 4321 clean"
```

**Step 3: Run the 6 e2e specs from worktree root (per W3 surprise #5)**

```bash
pnpm exec playwright test e2e/course-glossary.spec.ts e2e/course-equations.spec.ts e2e/course-figures.spec.ts e2e/course-misconceptions.spec.ts e2e/course-key-insights.spec.ts e2e/objectives.spec.ts 2>&1 | tail -20
```

Expected: all 6 specs pass.

**Step 4: Verify `equation-ref.spec.ts` is NOT affected** — it tests the `/equations/<id>` DETAIL route (W4c territory), not the rollup.

```bash
pnpm exec playwright test e2e/equation-ref.spec.ts 2>&1 | tail -5
```

Expected: passes unchanged.

**Step 5: Commit Batch 3**

```bash
git add examples/smoke/e2e/
git commit -m "test(W4a): update e2e URL consts to /library/<X>/"
```

---

## Batch 4 — Docs + JSDoc/comment drift updates

### Task 7 — Update `docs/website/reference/chapter-components.md` (9 lines)

**File:** `docs/website/reference/chapter-components.md`

**Step 1: Update the 6 table rows (lines 170-175)**

```diff
- | `<CourseGlossary />` | `/glossary` | All definitions across the course, alphabetical |
+ | `<CourseGlossary />` | `/library/glossary` | All definitions across the course, alphabetical |
- | `<CourseEquations />` | `/equations` | All equations across the course |
+ | `<CourseEquations />` | `/library/equations` | All equations across the course |
- | `<CourseFigures />` | `/figures` | Every figure (canonical entries from registry) |
+ | `<CourseFigures />` | `/library/figures` | Every figure (canonical entries from registry) |
- | `<CourseKeyInsights />` | `/key-insights` | All key insights across the course |
+ | `<CourseKeyInsights />` | `/library/key-insights` | All key insights across the course |
- | `<CourseMisconceptions />` | `/misconceptions` | All misconceptions across the course |
+ | `<CourseMisconceptions />` | `/library/misconceptions` | All misconceptions across the course |
- | `<CourseObjectives />` | `/objectives` | Hierarchical Module → Chapter → Objectives roll-up. Chapter headings link to each `/chapters/X` route. (PR-C4) |
+ | `<CourseObjectives />` | `/library/objectives` | Hierarchical Module → Chapter → Objectives roll-up. Chapter headings link to each `/chapters/X` route. (PR-C4) |
```

**Step 2: Update the file-path prose at line 178**

```diff
- (`examples/smoke/src/pages/{glossary,equations,figures,key-insights,misconceptions,objectives}.astro`),
+ (`examples/smoke/src/pages/library/{glossary,equations,figures,key-insights,misconceptions,objectives}.astro`),
```

**Step 3: Update the code-block comment at line 299**

```diff
- // examples/smoke/src/pages/objectives.astro
+ // examples/smoke/src/pages/library/objectives.astro
```

**Step 4: Update the prose route list at line 389**

```diff
- | Course-wide pages | `<Course*>` on the matching `/glossary`, `/equations`, `/figures`, `/key-insights`, `/misconceptions`, `/objectives` route |
+ | Course-wide pages | `<Course*>` on the matching `/library/glossary`, `/library/equations`, `/library/figures`, `/library/key-insights`, `/library/misconceptions`, `/library/objectives` route |
```

### Task 8 — Update 6 JSDoc/comment refs in component code

**Files:**
- `packages/astro/src/components/TextbookLayout.astro:252`
- `packages/components/src/components/Objective/Objective.tsx:13`
- `packages/components/src/components/Objective/Objective.schema.ts:12`
- `packages/components/src/components/Objective/Objective.stories.tsx:16`
- `packages/components/src/components/Objective/objectives-store.ts:10`
- `packages/components/src/components/LearningObjectives/LearningObjectives.tsx:44`

**Step 1: Update each file's comment to reference the new route**

For each file, find the JSDoc/comment line containing `/objectives` (W4a context) or any of the 5 other old paths, and update to `/library/objectives` (or matching new path). Read each file's referenced line, then Edit with precise context.

Pattern to look for in each file: a comment or JSDoc line like:

```typescript
// (b) On the `/objectives` course-wide roll-up page, ...
```

Replace with:

```typescript
// (b) On the `/library/objectives` course-wide roll-up page, ...
```

**Step 2: Verify no other source code drift**

```bash
rg -n '(`|"|\x27)/(glossary|equations|figures|misconceptions|key-insights|objectives)(`|"|\x27|/)' packages/ examples/smoke/src --type-add 'astro:*.astro' --type-add 'tsx:*.tsx' -t ts -t tsx -t astro
```

Expected: NO results (all the references are either updated, or they're `/equations/<id>` detail routes with a trailing slash).

Where matches found that are `/equations/<id>/...` style detail routes (W4c territory), leave them alone. The grep above includes `/` at the end, so `/equations/foo` would match `/equations/` followed by foo — let me refine: a better pattern is `/X` with NOT followed by `/`:

```bash
rg -n '(`|"|\x27)/(glossary|equations|figures|misconceptions|key-insights|objectives)(`|"|\x27)(?!/)' packages/ examples/smoke/src --type-add 'astro:*.astro' --type-add 'tsx:*.tsx' -t ts -t tsx -t astro 2>&1 | head -20
```

(PCRE-only feature — rg supports it with `-P`.)

Expected: NO results.

### Task 9 — Update ADR 0038 inline example

**File:** `docs/website/decisions/0038-pedagogy-index-pattern.md:504`

**Step 1: Update the example URL**

```diff
- frontmatter (e.g., `/objectives.astro`) yields empty arrays
+ frontmatter (e.g., `/library/objectives.astro`) yields empty arrays
```

Wait — this is actually a FILE PATH `objectives.astro`, not a route URL `/objectives`. Read line 504 carefully before editing to confirm what's being referenced. If it's a file path, the update is `pages/objectives.astro` → `pages/library/objectives.astro`. If it's a route URL, the update is `/objectives` → `/library/objectives`. Verify with Read tool first.

### Task 10 — Counter-pass grep (R2 disambiguator verification)

**Step 1: Grep for any remaining bare rollup paths in source code**

```bash
rg -n '"/(glossary|equations|figures|misconceptions|key-insights|objectives)"' packages/ examples/smoke --type-add 'astro:*.astro' --type-add 'tsx:*.tsx' -t ts -t tsx -t astro 2>&1
```

Expected: NO results in packages/ or examples/smoke. (Old paths should ONLY survive in docs/plans/2026-05-1X-* historical docs and docs/reviews/* historical files.)

**Step 2: Confirm `/equations/<id>` detail routes are still untouched**

```bash
rg -n '/equations/' packages/ examples/smoke --type-add 'astro:*.astro' --type-add 'tsx:*.tsx' -t ts -t tsx -t astro | head -10
```

Expected: hits for `/equations/${entity.id}`, `/equations/inverse-square-law` (detail route) — unchanged.

**Step 3: Confirm `/figures/<asset>.png` asset paths are still untouched**

```bash
rg -n '"/figures/[a-z-]+\.(png|jpg|svg)"' examples/smoke 2>&1 | wc -l
```

Expected: 40+ matches (asset paths from `src/content/figures.ts`); count unchanged.

**Step 4: Commit Batch 4**

```bash
git add docs/website/reference/chapter-components.md docs/website/decisions/0038-pedagogy-index-pattern.md packages/astro packages/components
git commit -m "docs(W4a): update route refs to /library/<X>/ in chapter-components + JSDoc + ADR 0038"
```

---

## Batch 5 — Pre-PR gates

### Task 11 — Lockfile check

```bash
pnpm install --frozen-lockfile 2>&1 | tail -3
```

Expected: clean; no lockfile drift.

### Task 12 — Biome zero-warning gate

```bash
pnpm exec biome check 2>&1 | tee /tmp/biome-w4a.log | tail -5
grep -E "(error|warning)" /tmp/biome-w4a.log
```

Expected: tail says "Checked N files in Xms. No fixes applied." and the grep returns nothing. (Per `feedback_biome_verification` — tail-only is insufficient.)

### Task 13 — Typecheck force

```bash
pnpm turbo run typecheck --force 2>&1 | tail -10
```

Expected: all 11 turbo tasks green. `--force` bypasses W3 surprise #6 (local cache silently skipping files).

### Task 14 — Full unit test suite

```bash
pnpm turbo run test --filter='@sophie/*' 2>&1 | tail -10
```

Expected: full unit suite green (baseline ~1,943 tests).

### Task 15 — Full smoke build

```bash
pnpm turbo run build --filter=@sophie/astro-smoke 2>&1 | tail -10
```

Expected: smoke builds without error; `dist/library/` contains the 6 rollup HTML files + `index.html` hub.

### Task 16 — Full e2e suite

```bash
lsof -ti:4321 | xargs -r kill 2>/dev/null
sleep 1
pnpm exec playwright test 2>&1 | tail -20
```

Expected: all e2e specs pass (baseline 157 + 5 skipped); the 6 migrated specs + `equation-ref.spec.ts` (unaffected) all green.

### Task 17 — Pagefind index verification

```bash
ls examples/smoke/dist/pagefind/
grep -lr '"/library/glossary"' examples/smoke/dist/pagefind/ 2>&1 | head -3
```

Expected: pagefind directory exists; new `/library/<X>/` URLs are indexed.

---

## Batch 6 — R+CR + Pilot report

### Task 18 — Request code review

Dispatch `superpowers:requesting-code-review` to verify the rename surface didn't drift past the enumerated 22 lines + 6 file renames + 1 new file. Address Critical and Important findings BEFORE PR opens (W3 R+CR caught 2 contract-drift items after gates were green).

```bash
# This runs via the requesting-code-review skill; not a direct bash invocation.
```

### Task 19 — Write pilot report

**File to create:** `docs/website/pilots/wedge-b-followup-w4a-library-routes.md`

Shape α per W2/W3 precedent + ADR 0064. Sections:

1. **What shipped** — 6 routes migrated; Library hub created; docs no-drift maintained; biome/typecheck/unit/e2e all green.
2. **Estimates vs. actuals** — pre-flight 80–100 / actual ~30 edits.
3. **W3 doctrine review** — R1 caught `/objectives` as 6th rollup + 6 JSDoc drift sites; R2 structural disambiguator distinguished routes from assets + detail routes; R3 N/A.
4. **Surprises** — `/objectives` discovery via second-pass grep (Explore agent's 5-route count was an undercount); JSDoc route drift in component code; ADR 0038 inline example needed update; layout chrome verified CLEAN.
5. **Doctrine refinements** — whether URL-string renames warrant their own doctrine line distinct from W3's field-name pattern.
6. **Handoff to W4b** — Library hub exists; W4b's topic-registry + bridge rooms + SkillReview resolver land on this foundation.

### Task 20 — Commit pilot report + open PR

```bash
git add docs/website/pilots/wedge-b-followup-w4a-library-routes.md
git commit -m "docs(W4a): pilot report"

# AT THIS POINT: pause for Anna's explicit text confirm before `gh pr create`.
# Per feedback_no_questions_mode_scope — PR open is a side-effect, not autonomous.

# When confirmed:
gh pr create --title "feat(W4a): wedge B-followup W4a — Library room route migration + hub" --body "..."
```

PR body shape (Shape α framing per ADR 0064):

```
## Summary

Wedge B-followup W4a — first of three sub-wedges closing W4
([meta-plan](.../sophie-wedge-b-followup-w4-tranquil-glade.md)).
Hard-renames 6 course-level rollup routes to /library/<X>/ under
ADR 0067's Library room hierarchy. Adds Library hub at /library/.

- 6 routes migrated via `git mv` (history preserved)
- Library hub at `/library/index.astro` (minimal; W4c expands)
- 6 e2e specs updated
- 9 lines in `chapter-components.md` + 6 JSDoc/comment refs + ADR
  0038 inline example all updated in same PR (docs no-drift policy)

## Risk

Mechanical URL-string rename; no schema/component/audit changes.
W3 doctrine R1/R2 applied; structural disambiguator distinguished
route-paths from asset-paths from prose mentions.

## Test plan

- [x] biome zero-warning gate (grep full output)
- [x] turbo typecheck --force
- [x] full unit suite (1,943 tests)
- [x] full e2e suite (162 specs)
- [x] smoke build with /library/<X>/ + /library/ routes
- [x] Pagefind index covers new URLs

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Verification — End-to-end summary

After every batch, before next batch begins:

1. `git status` — confirm scope of changes is in the planned files only.
2. Biome zero-warning gate — `pnpm exec biome check` full-output grep.
3. Typecheck — `pnpm turbo run typecheck --force` clean.
4. Relevant test slice green (e2e for Batch 3, unit + e2e for Batch 5).

End-to-end at Batch 5:
- biome 0/0
- typecheck 11/11
- unit suite full green (~1,943 tests)
- e2e suite full green (~162 specs)
- smoke build with new `/library/` routes
- Pagefind index includes new URLs

---

## References

- [W4 meta-plan](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md) — locked Meta-Q0 + Q1–Q6 decisions.
- [W4a design doc](2026-05-22-wedge-b-followup-w4a-design.md) — full design + touchpoint inventory + W3 doctrine application.
- [W3 design doc](2026-05-22-wedge-b-followup-w3-design.md) — D1-D6 + Slug normalization (precursor; doctrine source).
- [W3 pilot report](../website/pilots/wedge-b-followup-w3-callsite-rename.md) — R1/R2/R3 doctrine refinements + surprises log.
- [W3 plan](2026-05-22-wedge-b-followup-w3.md) — TDD-shaped batch-by-batch precedent.
- [ADR 0067 — Section/Subsection/Unit/Artifact](../website/decisions/0067-section-level-artifacts.md) — §2.1 Library room hierarchy.
- [ADR 0064 — Chapter-Migration Playbook](../website/decisions/0064-chapter-migration-playbook.md) — pilot-report Shape α.
- [ADR 0055 — Squash-merge](../website/decisions/0055-squash-merge-convention.md) — code PRs.
