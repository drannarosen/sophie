---
date: 2026-05-22T00:00:00.000Z
tags:
  - design
  - wedge-b-followup
  - w4
  - w4a
  - library-room
  - url-migration
  - mechanical-rename
status: accepted-design
related:
  - "[Wedge B-followup W1 Design](2026-05-22-wedge-b-followup-design.md)"
  - "[Wedge B-followup W3 Design](2026-05-22-wedge-b-followup-w3-design.md)"
  - "[Wedge B-followup W3 Pilot Report](../website/pilots/wedge-b-followup-w3-callsite-rename.md)"
  - "[ADR 0070 — Library room + registry-driven Spec pages](../website/decisions/0070-library-room-and-registry-spec-pages.md)"
  - "[ADR 0067 — Section / Subsection / Unit / Artifact](../decisions/0067-section-level-artifacts.md)"
  - "[ADR 0064 — Chapter-Migration Playbook](../decisions/0064-chapter-migration-playbook.md)"
  - "[ADR 0055 — Squash-merge convention](../decisions/0055-squash-merge-convention.md)"
---

# Wedge B-followup W4a — Design (Library room route migration + hub)

## 1. Goal & context

**Goal.** Hard-rename the 6 course-level rollup routes from bare
Course-root paths to `/library/<collection>/` under the ADR 0067
Library "room" hierarchy. No new components; no schema changes;
no audit changes. Add a Library hub at `/library/index.astro`
linking the 6 rooms together. Purely a W3-doctrine rename
dress-rehearsal on a focused surface, ahead of W4b's
new-affordance work (topic-registry + bridge rooms + SkillReview
self-closing resolver).

**Routes renaming:**

| Old path | New path |
|---|---|
| `/glossary` | `/library/glossary` |
| `/equations` | `/library/equations` |
| `/figures` | `/library/figures` |
| `/misconceptions` | `/library/misconceptions` |
| `/key-insights` | `/library/key-insights` |
| `/objectives` | `/library/objectives` |

**Trigger.** Wedge B-followup W3 ([PR #160](https://github.com/drannarosen/sophie/pull/160), `ade2696`)
closed the per-callsite parent-ref `chapter` → `unit` rename
across schema + extractors + persistence + components + smoke +
e2e. W4 is the final wedge of the W1→W4 sequence. The
[W4 meta-plan](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md)
split W4 into three sequential sub-wedges (W4a/W4b/W4c) after
Phase-1 exploration found that the W1-doc's "Library + bridge
rooms + 8 Spec pages + SkillReview resolver" wedge bundled
three operationally-different efforts with very different risk
profiles. W4a is the first, smallest, and most mechanical.

**Pre-launch posture.** Per `feedback_no_backcompat_prelaunch`:
zero production students; every consumer of the old URLs
migrates inside W4a's single PR. No 301 redirects; no shim
routes; no "if-old-route fallback" logic.

**Why now.** ADR 0067 §2.1 frames Library as a *room* containing
typed-collection artifacts. Bare `/glossary` paths flatten the
room metaphor and risk future Section/Unit slug collisions (a
Course Section literally titled "Glossary of Symbols" would
collide with `/glossary` at the URL level — namespacing under
`/library/` prevents the collision by construction). W4a moves
the existing 6 rollup routes into the room ahead of W4b's net-
new affordances landing in the same namespace.

## 2. Locked design decisions (Meta-Q0 + Q1 from W4 meta-brainstorm)

### D1 — Hard-rename to `/library/<collection>/` with no redirects

Settled in [W4 meta-plan Q1](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md):
`/library/<collection>/<slug>` hard-rename. No 301 redirects; no
shim routes. Smoke + e2e + Pagefind facet config + cross-link MDX
all migrate in W4a's single PR.

**Rationale:** ADR 0067 "room" framing; prevents future Section/
Unit slug collision; exercises W3 rename doctrine R1/R2/R3 on a
narrower surface than W3 itself (~30 atomic edits vs. W3's ~340);
no-backcompat policy makes redirect shims unnecessary.

### D2 — `/objectives` included as the 6th rollup

Phase-1 second-pass enumeration found `examples/smoke/src/pages/
objectives.astro` (LO course rollup, shipped in PR-C4) is a
structural sibling to the other 5 rollups. The W1 design doc and
the initial Explore-agent survey both worked from a 5-route scope;
the chapter-components.md table (line 175) and prose lists (lines
178, 389) explicitly include `objectives`. Including it in W4a
keeps the Library room metaphor internally consistent and avoids a
one-off `/objectives` route surviving as the lone non-Library
rollup post-W4.

**Out of W4a scope:** Q4b's "ship 9 rooms" decision (which CourseX
components get *Library hub cards*) is independent. W4a moves the
existing route; the Library hub in W4a lists all 6 of the moved
rooms. The W4c Library-hub update may add Topics/Observables/
Models/Inferences cards.

### D3 — Library hub page is minimal in W4a

`examples/smoke/src/pages/library/index.astro` lists the 6
migrated rooms with title + 1-line description + link. No
sophisticated chrome; no count badges; no faceted nav. W4c will
expand the hub when more rooms come online and the shell is
extracted (per W4-meta Q4a). W4a's hub is a placeholder that
satisfies the route's existence and provides a single nav anchor.

### D4 — Documentation refs follow no-drift policy

Per `feedback_docs_no_drift`: `docs/website/reference/chapter-components.md`
updates land in W4a's PR (route references at lines 170-175, 178,
299, 389). JSDoc in component code referencing `/objectives` etc.
updates in the same PR (TextbookLayout.astro, Objective.tsx,
Objective.schema.ts, Objective.stories.tsx, objectives-store.ts,
LearningObjectives.tsx). ADR 0038 line 504 example URL updates.

**Out of scope:** historical `docs/plans/2026-05-1X-*.md` and
`docs/reviews/2026-05-15-*.md` files. These are the historical
record per `feedback_docs_no_drift` precedent — they describe
what was planned/shipped at the time, not what currently is.

## 3. Phase-1 touchpoint enumeration

Applied W3 doctrine R1: grep multiple patterns (URL literals;
href= attributes; markdown-link `](`; Playwright nav calls;
template literals; backtick strings) across packages/ + examples/ +
docs/. Initial Explore-agent count: 11 edits + 5 file renames.
Second-pass direct grep found `/objectives` as a 6th rollup and
caught 4 additional JSDoc/comment refs. **Final count: ~30 atomic
edits across ~15 files.**

### 3.1 Route file renames (6 files)

| File | New location |
|---|---|
| `examples/smoke/src/pages/glossary.astro` | `examples/smoke/src/pages/library/glossary.astro` |
| `examples/smoke/src/pages/equations.astro` | `examples/smoke/src/pages/library/equations.astro` |
| `examples/smoke/src/pages/figures.astro` | `examples/smoke/src/pages/library/figures.astro` |
| `examples/smoke/src/pages/misconceptions.astro` | `examples/smoke/src/pages/library/misconceptions.astro` |
| `examples/smoke/src/pages/key-insights.astro` | `examples/smoke/src/pages/library/key-insights.astro` |
| `examples/smoke/src/pages/objectives.astro` | `examples/smoke/src/pages/library/objectives.astro` |

### 3.2 New file (1 file)

- `examples/smoke/src/pages/library/index.astro` — Library hub page.

### 3.3 E2e const updates (6 specs)

| File | Line | Old | New |
|---|---|---|---|
| `examples/smoke/e2e/course-glossary.spec.ts` | 4 | `"/glossary"` | `"/library/glossary"` |
| `examples/smoke/e2e/course-equations.spec.ts` | 4 | `"/equations"` | `"/library/equations"` |
| `examples/smoke/e2e/course-figures.spec.ts` | 4 | `"/figures"` | `"/library/figures"` |
| `examples/smoke/e2e/course-misconceptions.spec.ts` | 4 | `"/misconceptions"` | `"/library/misconceptions"` |
| `examples/smoke/e2e/course-key-insights.spec.ts` | 4 | `"/key-insights"` | `"/library/key-insights"` |
| `examples/smoke/e2e/objectives.spec.ts` | 4 | `"/objectives"` | `"/library/objectives"` |

### 3.4 Documentation (chapter-components.md — 9 lines)

| Line | Context |
|---|---|
| 170 | `<CourseGlossary />` table row — route cell |
| 171 | `<CourseEquations />` row |
| 172 | `<CourseFigures />` row |
| 173 | `<CourseKeyInsights />` row |
| 174 | `<CourseMisconceptions />` row |
| 175 | `<CourseObjectives />` row |
| 178 | File-path prose mentioning `examples/smoke/src/pages/{glossary,equations,...}.astro` — update to `pages/library/{...}` |
| 299 | Code-block comment with example path |
| 389 | "Course-wide pages" row listing all 6 routes |

### 3.5 Component JSDoc / code-comment refs (6 files)

These describe the runtime behavior of the LO rollup route in
component documentation comments. Update to keep docs accurate:

| File | Line | Context |
|---|---|---|
| `packages/astro/src/components/TextbookLayout.astro` | 252 | Comment mentioning `/objectives` page |
| `packages/components/src/components/Objective/Objective.tsx` | 13 | JSDoc mentioning `/objectives` |
| `packages/components/src/components/Objective/Objective.schema.ts` | 12 | JSDoc |
| `packages/components/src/components/Objective/Objective.stories.tsx` | 16 | Stories comment |
| `packages/components/src/components/Objective/objectives-store.ts` | 10 | Module-level comment |
| `packages/components/src/components/LearningObjectives/LearningObjectives.tsx` | 44 | JSDoc |

### 3.6 ADR refs (1 line)

| File | Line | Context |
|---|---|---|
| `docs/website/decisions/0038-pedagogy-index-pattern.md` | 504 | Inline example referencing `/objectives.astro` — update path to `pages/library/objectives.astro` |

### 3.7 Confirmed clean (no rename needed)

- **No 301 redirects currently configured.** No vercel.json, no
  .htaccess, no Astro redirect config affected.
- **Pagefind converters** emit dynamic URLs (`/equations/${id}`,
  `/units/${unit}/reading#anchor`) — none reference the rollup
  routes. Unaffected.
- **Sitemap** — auto-discovered from Astro pages; no hardcoded
  rollup paths.
- **Layout chrome** (`ChapterLayout.astro`) — only imports the
  figures registry; no hardcoded rollup links.
- **Detail routes** (`/equations/<id>` Pagefind URLs +
  `equation-ref.spec.ts` href= selectors) — these are NOT the
  rollup routes; they belong to W4c's Spec-page work. **Leave
  untouched in W4a.**
- **Asset paths** (`src/content/figures.ts` 40+ entries with
  `src: "/figures/foo.png"`) — these reference the `/public/
  figures/` static-asset directory, NOT the `/figures` route.
  **Do not rename.**
- **MyST docs glossary** (`docs/website/status/validation.md:156`
  link to `[docs/website/reference/glossary.md](/glossary/)`) —
  orthogonal: MyST-rendered docs site, not the smoke-app route.
  **Do not rename.**

### 3.8 Touchpoint count check

- Files touched: 14 (excluding the 6 file renames) + 6 file renames + 1 new file = **21 total file ops**.
- Edit lines: 6 (e2e) + 9 (chapter-components.md) + 6 (JSDoc) + 1 (ADR) = **22 line edits**.
- File renames (no content change): 6.
- New files: 1 (library/index.astro).

Total: ~30 atomic operations. W4a pre-flight estimate was 80-100;
actual is ~30. Tighter than projected because Sophie's modularity
keeps URLs out of breadcrumbs/nav-builders/CI-config (verified
clean in Phase-1 grep).

## 4. W3 doctrine application

### R1 — Phase-1 enumeration ✅ done

Grep covered: bare-string URL literals (`"/glossary"`, `'/glossary'`),
href= attributes (`href="/glossary"`), markdown links (`](/glossary)`),
Playwright nav (`page.goto('/glossary')`), template literals
(`` `/glossary` ``). All 5 patterns surfaced touchpoints; declaration-
only grep would have missed the JSDoc refs and the ADR-0038 example.

### R2 — Regex + structural disambiguator

Bulk rewrite via python regex over `examples/smoke/e2e/*.spec.ts`
+ chapter-components.md + JSDoc refs. Disambiguator: match must
be in a quoted-URL context (`"/X"` or `'/X'`) OR an href=
attribute OR a markdown-link `]\(/X\)` pattern. Reject matches in
prose (e.g., "see the glossary") and in asset paths (`"/figures/
foo.png"` — match pattern requires the URL to END after the
slug, not be followed by another `/`).

Counter-pass test: grep the post-rewrite tree for any remaining
bare `/glossary`, `/equations`, `/figures`, `/misconceptions`,
`/key-insights`, `/objectives` references; manually classify each
hit as "intentionally NOT renamed" (asset path, MyST docs,
detail route, historical doc) or "missed rename." Expect zero
of the latter.

### R3 — JSX value-expression caveat

**N/A here.** URL renames are pure string substitution in
attribute values. No `prop={var}` patterns where LHS rename
without RHS rename would produce `unit={chapter}` bugs.

## 5. Implementation strategy

Following W3's TDD red/green/commit-per-task discipline within
the 3-task batching convention from `superpowers:executing-plans`.

### Batch 1 — File renames + Library hub creation

1. **Create `examples/smoke/src/pages/library/` directory** + move
   the 6 .astro files into it (git mv to preserve history).
2. **Create `examples/smoke/src/pages/library/index.astro`** —
   minimal hub listing the 6 rooms.
3. **Verify smoke builds at all 6 new URLs** via local
   `pnpm turbo run build --filter=@sophie/astro-smoke`.

### Batch 2 — E2e const + Playwright spec updates

4. **Update the 6 e2e const declarations** to new URLs.
5. **Run e2e specs** (from worktree root per W3 surprise #5):
   `pnpm exec playwright test`. Expect all 6 to pass on first
   green (no behavior change, only URL path).
6. **Verify port 4321 was clean** before e2e (per
   `project_local_dev_pagefind_e2e_pitfall`).

### Batch 3 — Documentation + JSDoc + ADR drift

7. **Update chapter-components.md** at lines 170-175, 178, 299, 389.
8. **Update 6 JSDoc/comment refs** in TextbookLayout.astro +
   Objective component files + LearningObjectives.tsx.
9. **Update ADR 0038 line 504** example path.

### Batch 4 — Pre-PR gates

10. **Pre-PR lockfile check** (`pnpm install --frozen-lockfile`).
11. **Biome zero-warning gate** — grep full output for warnings
    + errors (per `feedback_biome_verification`).
12. **Pre-PR typecheck force** (`pnpm turbo run typecheck --force`
    per W3 surprise #6).
13. **Unit test suite green** across all 5 packages.
14. **Counter-pass grep** for missed renames (R2 disambiguator
    verification).
15. **R+CR via `superpowers:requesting-code-review`**, address
    Critical + Important findings.

## 6. Verification

End-to-end (after Batches 1-3, before PR open):

1. `pnpm install --frozen-lockfile` clean.
2. `pnpm exec biome check 2>&1 | grep -E "(warning|error)"` —
   0 lines.
3. `pnpm turbo run typecheck --force` — clean across 11 turbo
   tasks.
4. `pnpm turbo run test --filter='@sophie/*'` — full unit suite
   green (baseline 1,943 tests).
5. `pnpm turbo run build --filter=@sophie/astro-smoke` — smoke
   builds; 6 new `/library/<X>/` routes render; old paths return
   404.
6. `pnpm exec playwright test` from worktree root — 6 course-
   rollup specs + objectives spec pass at new URLs; equation-ref
   detail-route spec unaffected.
7. Pagefind index regenerated post-build covers the 6 new
   `/library/<X>/` routes.
8. Manual smoke (optional, per `feedback_aesthetic_unlocked_prelaunch`):
   open `/library/` hub; navigate to each room; verify the page
   renders identically to its pre-W4a counterpart.

## 7. Risk + mitigation

- **Risk: Pagefind index doesn't catch new URLs.** Pagefind runs
  postbuild and indexes the static output; new pages should be
  picked up automatically. Mitigation: verify `dist/pagefind/`
  contains records with `url: "/library/glossary"` etc.
- **Risk: counter-pass grep misses an asset-path-shaped false
  positive.** The R2 regex must distinguish URL-end-of-string
  from URL-followed-by-slash. Mitigation: explicit counter-pass
  for `/figures/[a-z]` (asset path) which MUST remain unchanged.
- **Risk: JSDoc/comment drift gets missed because biome doesn't
  enforce comment content.** Mitigation: the second-pass grep
  enumerated all 6 JSDoc sites; the plan explicitly lists each
  file:line.
- **Risk: turbo cache silently skips files that depend on path
  literals.** Per W3 surprise #6: always run typecheck with
  `--force` before pre-PR.
- **Risk: A historical doc/plan reference creates confusion.**
  Mitigation: explicit out-of-scope policy in §2 D4. Pilot
  report documents the exclusion.

## 8. Pilot report (Shape α)

Per ADR 0064 + W2/W3 precedent. After W4a merges, draft the
pilot report at `docs/website/pilots/wedge-b-followup-w4a-library-routes.md`
with sections:

1. **What shipped.** 6 routes migrated; Library hub created;
   docs no-drift maintained.
2. **Estimates vs. actuals.** Pre-flight 80-100 / actual ~30
   edits; why estimate was conservative (W3-doctrine R1 fan-out
   patterns produced an over-count for URL-string renames vs.
   field-name renames).
3. **W3 doctrine review.** R1 caught Objectives + JSDoc drift; R2
   structural disambiguator distinguished route-paths from
   asset-paths cleanly; R3 N/A.
4. **Surprises.** `/objectives` as 6th rollup (chapter-
   components.md naming discrepancy with W4 meta-plan); JSDoc
   route references in component code; ADR 0038 inline example
   needing update; layout chrome confirmed CLEAN (no
   navigation-helper rename surface).
5. **Doctrine refinements (if any).** Whether the URL-string
   rename pattern needs its own doctrine line (R4?) distinct
   from W3's field-name rename pattern.
6. **Handoff to W4b.** Library hub now exists; topic-registry
   collection + bridge rooms + SkillReview resolver land next on
   top of the W4a foundation.

## 9. Discipline reminders (W4a-specific)

- **Playwright from worktree root** (W3 surprise #5) — not
  `examples/smoke/`.
- **Port 4321 clean before e2e** (`project_local_dev_pagefind_e2e_pitfall`).
- **Biome full-output grep** (`feedback_biome_verification`),
  not tail-only.
- **Turbo typecheck force** (`feedback_W3-surprise-6`).
- **Pre-PR lockfile** (`feedback_pre_pr_lockfile_check`).
- **No back-compat shims** (`feedback_no_backcompat_prelaunch`).
- **Squash-merge** (ADR 0055).
- **Side-effects need explicit text confirm** per occurrence
  (`feedback_no_questions_mode_scope`): worktree creation, PR
  open, merge.
- **Docs in same PR** (`feedback_docs_no_drift`) — chapter-
  components.md + JSDoc + ADR 0038 + pilot report + this design
  doc + plan + (validation.md if ADR validation block touched —
  none expected for W4a since no ADR `validation:` blocks
  change).
