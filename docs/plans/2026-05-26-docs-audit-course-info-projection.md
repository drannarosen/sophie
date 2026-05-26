# Audit stale docs after course-info projection sprint

- **Date**: 2026-05-26
- **Status**: plan approved (Phases A + B + C complete); Phase D
  execution in progress
- **Workflow**: 4-phase audit template
  ([`docs/prompts/audit-stale-docs-after-sprint.md`](../prompts/audit-stale-docs-after-sprint.md))
- **Related sprint**: course-info projection (PR #199, commit
  `4e0730e`) — design at
  [`2026-05-26-course-info-projection-design.md`](./2026-05-26-course-info-projection-design.md),
  implementation at
  [`2026-05-26-course-info-projection-implementation.md`](./2026-05-26-course-info-projection-implementation.md),
  review at
  [`../reviews/2026-05-26-course-info-projection-phases-1-4.md`](../reviews/2026-05-26-course-info-projection-phases-1-4.md)

## Context

The course-info projection sprint merged via PR #199 (commit `4e0730e`,
2026-05-26) and shipped Tier-2 course-website chrome — `course.sophie.yaml`
v0.2 schema, prose-fragment collection, 5 info-page layouts, course +
section landing routes, and a 5-component "course-management chrome"
pack (`<Due>`, `<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`).
The implementation deviated from the original design doc on several
axes (H1–H7 decisions resolved mid-implementation) and expanded scope
in two places (review C2 added a 6th React sub-component; review I3
added a second cross-refine). The docs surface — ADRs, reference docs,
memory, roadmap, status, AGENTS.md — has not yet been brought back
into sync.

This session uses the 4-phase audit workflow Anna saved as a template
at `docs/prompts/audit-stale-docs-after-sprint.md`. Each phase pauses
for explicit review; no writing happens before Phase D, and no docs
get written in this plan-mode session at all (plan-mode constraints
permit only this plan file to be edited).

## Sprint context (canonical references)

- **PR**: https://github.com/drannarosen/sophie/pull/199 (squash-merged
  2026-05-26 as commit `4e0730e`)
- **Design doc**: `docs/plans/2026-05-26-course-info-projection-design.md`
- **Implementation plan**: `docs/plans/2026-05-26-course-info-projection-implementation.md`
  (revised on main before code landed to integrate Anna's H1–H7
  architectural decisions)
- **Code review**: `docs/reviews/2026-05-26-course-info-projection-phases-1-4.md`
  (graded A−; C1/C2/I1-I4 + 3 minors all fixed pre-merge)

## Most-affected ADRs

- **0080** (course-spec format v0.1) — needs v0.2 amendment
  (`grade_weights` removed, `grading.categories` added,
  `info_pages`/`landing`/`objectives`/`prereqs`/`contact`/
  `accessibility`/`office_hours` clusters added, strict-union compose,
  reserved-slug refine, `landing.layout: "custom"` enum value, two
  cross-refines)
- **0058** (epistemic component contract) — chrome-vs-pedagogy boundary
  now structurally enforced via the `makeChromeComponents` vs
  `makeStaticComponents` factory split
- **0061** (AI-optimized codebase design) — sibling-file LOC budget
  validated heavily (8 new `course-spec-v02-*.ts` files, none over 91 LOC;
  `course-spec.ts` grew 371 → 404 LOC, within budget)
- **0082** (chapter-layout extraction) — route-injection +
  virtual-module precedent repeated for `virtual:sophie/course-spec`
  + 7 new injected routes
- **0004** (component contract) — axe-on-render mandate held;
  R11 still 58/58
- **0030** (AI authoring) — H7 deviation strengthens "AI-authorable
  end-to-end" (`info_pages.compose` literally describes what's on
  the page in YAML)

## Known architectural deviations to document

These must show up in the docs amendments. The agents are briefed on
all 10; the final plan must cover each.

1. **H7 = Option B** — `.astro` layout orchestrators in
   `packages/astro/src/components/` + small React sub-components in
   `@sophie/components` (not React `<SyllabusPage>` exports as the
   design doc said).
2. **`CourseInfoFragmentSchema` location**: shipped in `@sophie/core/schema`
   (not `@sophie/astro`) — "all Zod schemas in core" consistency;
   `@sophie/astro` doesn't take a direct zod dep.
3. **Phase 5 deferred per H6**: `SchedulePage.astro` ships as v0.2
   placeholder; iCal + `schedule.yaml` deferred to a follow-up sprint
   with its own ADR.
4. **`useCourseSpec` hook**: SSR-setter + script-tag pattern, not
   direct virtual-module import — honors `pedagogy-store.ts:14-22`
   doctrine (`@sophie/components` must NEVER import
   `virtual:sophie/...` because bare-Node imports hit
   `ERR_UNKNOWN_URL_SCHEME`).
5. **`OfficeHoursChrome → OfficeHours` rename at the barrel**: file
   internally named to disambiguate from `OfficeHoursTable`; aliased
   at export.
6. **`landing.layout: "custom"`** enum value added per H2 — schema
   declares the integration-override path explicitly.
7. **Strict union for `info_pages.compose`** per H4/B5 — typos rejected
   at schema-validate time (not compose-evaluator runtime).
8. **6 React sub-components, not 5** — `PrereqsList` added per review
   C2 to avoid silent-skip foot-gun.
9. **Two cross-refines on `CourseSpecSchema`**:
   `assessment.category_refs → grading.categories[*].id` AND
   `objectives[*].assessed_by → grading.categories[*].id` (second added
   per review I3).
10. **Clean break on `assessment.grade_weights`**: REMOVED;
    replaced by required top-level `grading.categories` (weights sum
    to 1.0 ±0.001, not 100). Fixture rename
    `weights-not-100.yaml → category-weights-not-one.yaml`.

## Phase A — Discovery (read-only) — COMPLETE

All 3 Explore agents returned. Consolidated triage below. **Pause for
Anna's review before Phase B.**

### Two flags worth calling out before the table

1. **ADR-number decision is open.** The original design doc planned ADR
   0086 for the projection pattern + chrome-vs-pedagogy boundary.
   Agent 1 (ADR audit) recommends **consolidating into "ADR 0080
   Amendment 2"** rather than writing a new ADR, on the grounds that
   the projection pattern extends ADRs 0080/0082/0058/0061 rather than
   introducing a genuinely new decision. This is a Phase B decision
   point — Anna should pick.

2. **Two distinct "chrome" families need precise vocabulary in docs.**
   Both agents 1 and 2 use "5 chrome components" loosely. The shipped
   reality is:
   - **MDX-authorable chrome (5 components, public)**: `<Due>`,
     `<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>` — these are
     what authors type in prose fragments or chapter MDX.
   - **React layout sub-components (6 components, internal to info-page
     layouts)**: `ObjectivesSection`, `GradingTable`, `OfficeHoursTable`,
     `ContactCard`, `AccessibilitySection`, `PrereqsList` — these are
     not directly author-typed; they compose under the 5 `.astro`
     layout orchestrators.
   - Plus a **chrome component set in prose fragments** = the
     chapter-component subset (`<Callout>`, `<GlossaryTerm>`,
     `<KeyEquation>`, `<EquationRef>`, `<FigureRef>`, `<Aside>`) — the
     "allowed in prose fragments" set, gated by the new
     `makeChromeComponents` factory.
   - All three need separate naming in the chapter-components.md
     reference doc to avoid future drift.

### Consolidated triage table

| Surface | File | Class | Drift evidence | Recommended action |
|---|---|---|---|---|
| **ADR 0080** (course-spec v0.1) | `docs/website/decisions/0080-course-spec-format-v0-1.md` | **must** | `:86` "grade weights must sum to 100"; `:146-149` "`assessment.grade_weights` must sum to exactly 100" | Amendment 2 block documenting v0.2 clean break (clusters + strict union + reserved-slug refine + cross-refines + landing.layout="custom") |
| **ADR 0058** (epistemic contract) | `docs/website/decisions/0058-…md` | **must** | No mention of chrome-vs-pedagogy component-set split now structurally enforced | Cross-reference paragraph: "Course-info prose fragments are chrome, not pedagogy — `makeChromeComponents` factory enforces the allowed-component subset" |
| **ADR 0061** (AI-optimized codebase) | `docs/website/decisions/0061-…md` | **must** | Sibling-file LOC budget rule was heavily exercised by 8 new `course-spec-v02-*.ts` files (none >91 LOC; main schema 371→404, within budget) — but ADR doesn't acknowledge this validation | "Validated in course-info sprint" annotation in §Consequences or as Amendment 1 |
| **ADR 0082** (chapter-layout extraction) | `docs/website/decisions/0082-…md` | **must** | Lists "future routes" but doesn't mention the now-shipped course-info route-injection extension (course-landing, section-landing, 5 info-page routes, all spec-driven) | Cross-reference paragraph extending the route-injection precedent + virtual-module precedent (`virtual:sophie/course-spec` is the second instance) |
| **ADR 0004** (component contract) | `docs/website/decisions/0004-…md` | **must** | No mention of chrome-component family (`<Due>` etc.); axe-on-render mandate held but unchallenged | Brief cross-reference paragraph + pointer to chrome-vs-pedagogy boundary at ADR 0058 |
| **ADR 0030** (AI authoring) | `docs/website/decisions/0030-…md` | **must** | Establishes AI-primary authoring for content; this sprint validated it for platform code (14 commits, 92 files AI-authored under HITL) | Footnote: "AI authorship applies to platform code under HITL; 2026-05-26 course-info sprint exemplifies." |
| **ADR 0023** (vertical-slice) | `docs/website/decisions/0023-…md` | should | Second example of "refactor outward" pattern just landed | Add example reference (course-info as Tier-2 refactor-outward instance) |
| **ADR 0067** (section-level artifacts) | `docs/website/decisions/0067-…md` | should | Course-info prose fragments are course-level singletons, not artifacts in the Section/Unit/Artifact hierarchy — boundary clarification missing | Cross-reference note distinguishing the two |
| **ADR 0003** (Zod source of truth) | `docs/website/decisions/0003-…md` | should | Implicit drift: `CourseInfoFragmentSchema` lives in `@sophie/core/schema` (single-consumer schema in core barrel) — clarifying when single-consumer schemas vs. astro-only stay where | Brief placement-rule clarification (or skip if Anna prefers convention stays implicit) |
| **ADR 0001** (platform shape) | `docs/website/decisions/0001-…md` | nice | Virtual-module pattern as the bridge mechanism not mentioned in originating ADR | Optional pointer note |
| **ADR 0031** (compound layout primitives) | `docs/website/decisions/0031-…md` | nice | Info-page layouts (`SyllabusPage.astro` etc.) are layout primitives in the same family but not cross-referenced | Optional pointer note |
| **ADR 0086 (new, contested)** | `docs/website/decisions/0086-…md` | **decision-pending** | Design doc planned this; Agent 1 recommends folding into ADR 0080 Amendment 2 instead | **Phase B AskUserQuestion**: new ADR vs Amendment-2-only |
| **Other ADRs** (0002, 0005–0029 minus 0023, 0032–0057, 0059–0060, 0062–0079, 0081, 0083–0085) | various | no-op | Orthogonal to sprint | None |
| **`chapter-components.md`** (chrome section) | `docs/website/reference/chapter-components.md:96-104` | **must** | "Chrome primitives (PR 5, Phase B)" lists 4 layout primitives but no mention of the 5 new MDX-authorable course-management chrome components | New subsection "Course-management chrome" listing the 5 components with props + the chrome-vs-pedagogy boundary note |
| **`positioning.md`** | `docs/website/strategy/positioning.md` | **must** | 30-second elevator + differentiator one-liners don't mention Tier-2 course-website chrome — material capability jump for the tenure-case narrative | Decision: extend elevator with chrome line, OR add differentiator row "vs course-LMS integration", OR skip (Anna's call — positioning prose is sensitive) |
| **`myst.yml`** TOC | `docs/website/myst.yml` | should | New how-to / reference doc needs TOC slot; potential new ADR slot | Add entries after Phase C plan locks new doc paths + ADR number |
| **NEW reference doc** (course-info schema OR how-to) | `docs/website/reference/course-info-schema.md` OR `docs/website/how-to/author-course-info-pages.md` | **must** | Authors have zero reference for: prose-fragment location convention, frontmatter shape, allowed/forbidden components, page-layout enum, the 5 chrome components in detail, the `info_pages.compose` shape | Phase B picks reference vs how-to (or both); Phase C plans the content |
| **`vision/reasoning-os/index.md`** | `docs/website/vision/reasoning-os/index.md:99-136` | nice | "What's locked" section doesn't note that the chrome ≠ pedagogy boundary is now structurally enforced via factory split | 1–2 sentence addition under Claim 1 |
| **`explanation/scientific-reasoning-os.md`** | `docs/website/explanation/scientific-reasoning-os.md` | nice | Same chrome-vs-pedagogy enforcement note worth a callout | Optional 1–2 sentence addition |
| **Pilot reports** (`pilots/wedge-b-followup-w4c-rooms.md` etc.) | `docs/website/pilots/*` | no-op | Historical records of completed pilots; do not need to mention post-sprint reality | None |
| **`docs/website/status/roadmap.md`** | `docs/website/status/roadmap.md` | **must** | `:27` "Current status (2026-05-15)" — pre-sprint; PR #199 not in PR table | Add "Current status (2026-05-26)" entry + append PR-Info row to bucket table |
| **`docs/website/status/validation.md`** | `docs/website/status/validation.md` | **must** | ADR 0080 row needs status refresh + amendment marker; new-ADR row needed if Phase B picks "new ADR" path | Regen via `pnpm tsx scripts/regenerate-validation-index.mts` after every ADR change (per `feedback_validation_dashboard_regen`) |
| **`docs/website/status/course-website-roadmap.md`** | `docs/website/status/course-website-roadmap.md` | no-op | Multi-sprint program tracker; course-info is the first sprint, not a new program | None (or optional progress marker) |
| **AGENTS.md "Locked decisions" table** | `AGENTS.md:152-171` | should | ADR 0061 row could get a "validated by 8-file course-spec split" annotation; ADR 0080 row should reference v0.2 amendment after it lands | Phase B locks specific language |
| **AGENTS.md R6–R11 standing rules** | `AGENTS.md:317-389` | **decision-pending** | Agent 3 floats R12 candidate: "type-narrow virtual-module consumers at dispatcher entry" (from review C1 pattern). Two virtual modules now exist (`figures` + `course-spec`) — class-of-issue defense | **Phase B AskUserQuestion**: write R12 now, defer until 3rd instance, or skip |
| **AGENTS.md elsewhere** | `AGENTS.md` | no-op | Conventions, HITL mandate, working principles all in force and unchallenged | None |
| **`feedback_codebase_optimized_for_ai.md`** memory | `~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_codebase_optimized_for_ai.md` | **must** | Anticipates split of `pedagogy-index.ts`; course-info sprint validated the pattern with 8 new schema sibling files | Add "ADR 0061 pattern validated 2026-05-26" pin |
| **`reference_course_website_roadmap.md`** memory | `~/.claude/projects/-Users-anna-Teaching-sophie/memory/reference_course_website_roadmap.md` | should | "Implementation begins after roadmap's 9 ADRs land" — Tier-2 Phases 1–4 shipped 2026-05-26 | Status marker update |
| **NEW memory** (always-register virtual-module pattern) | new file | should | Code review C1 surfaced this; pattern is the template for ScheduleSchema follow-up sprint | Phase B AskUserQuestion: write or defer |
| **NEW memory** (chrome ≠ pedagogy component-set split) | new file | should | Operationalizes ADR 0058 boundary into a code-level rule | Phase B AskUserQuestion: write or defer |
| **NEW memory** (pedagogy-store doctrine extended to course-spec-store) | new file | should | Second instance of the SSR-setter + script-tag pattern; codifies as Sophie convention | Phase B AskUserQuestion: write or defer |
| **NEW memory** (type-narrow virtual-module consumers at dispatcher entry) | new file | **redundant if R12 ships** | Pattern from review C1 | Phase B AskUserQuestion: codify as R12 standing rule OR codify as memory feedback (not both) |
| **Other memories** (project_sophie, project_authoring_model, all other feedback_*.md) | various | no-op | Standing disciplines unchallenged | None |
| **Design doc post-impl appendix** | `docs/plans/2026-05-26-course-info-projection-design.md` | should | Design doc placed `CourseInfoFragmentSchema` in `@sophie/astro` (shipped in `@sophie/core/schema`); design doc line for "5 chrome components" is right at the MDX layer but doesn't note the 6 React sub-components added | Brief "post-implementation amendments" appendix |
| **Implementation plan + review docs** | `docs/plans/2026-05-26-…-implementation.md`, `docs/reviews/2026-05-26-…-phases-1-4.md` | **no-op** | Historical audit-trail records; updating them would erase the trail (Agent 1's grep flagged "5 chrome components" mentions but those are correct *for the MDX layer* — should not be rewritten) | None — preserve as-shipped |

### Stale-term grep summary

| Term | Hits | Action |
|---|---|---|
| `grade_weights` in `docs/website/` | only ADR 0080:86, :146-149 | covered by ADR 0080 must-update above |
| `grade_weights` elsewhere in `docs/` | implementation plan, design doc, review (historical) | no-op per Agent 1 |
| `weights must sum to 100` | ADR 0080:86, :146-149 | covered by ADR 0080 must-update |
| `v0.1` (course-spec context) | ADR 0080 frontmatter + title | retain (historical-correct); new docs reference v0.2 |
| `<SyllabusPage>` etc. in author docs | none | correct — H7 = Option B means these are `.astro`, not React exports |
| `OfficeHoursChrome` in author docs | none | correct — internal name doesn't leak |
| `<Due>`, `<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>` in author docs | **none** | this is the central staleness gap — must add to chapter-components.md |
| `info_pages.compose` in author docs | none | needs to land in new reference/how-to doc |
| "5 chrome components" loose phrasing | mainly in implementation plan + review (historical) | no-op for historical docs; new docs should distinguish the 5 MDX chrome / 6 React sub-components / 6-component prose-fragment subset |

### Pause point (Phase A review)

**Phase A done.** Awaiting Anna's review of the triage table before Phase B.

Phase B will use `AskUserQuestion` to lock:
- **Q1**: Amendment 2 to ADR 0080 only, OR new ADR 0086 in addition?
  (Per Agent 1's recommendation: consolidation. Per design doc + your
  original brief: new ADR 0086. Either is defensible; this is yours.)
- **Q2**: For the new author-facing course-info doc, reference doc
  (`reference/course-info-schema.md`) or how-to
  (`how-to/author-course-info-pages.md`) or both?
- **Q3**: R12 ("type-narrow virtual-module consumers at dispatcher
  entry") — write now, defer until 3rd instance, or skip?
- **Q4**: Positioning doc update — extend 30s elevator, add
  differentiator row, or skip (positioning prose is sensitive)?
- **Q5**: New memory candidates — which to write
  (always-register-virtual-module / chrome-vs-pedagogy /
  pedagogy-store-doctrine), and which (if any) collapse into R12 vs
  stay as separate memory entries?

---

## Phase B — Triage + decision lock — COMPLETE

Answers via `AskUserQuestion` 2026-05-26:

| # | Question | Locked answer |
|---|---|---|
| Q1 | ADR number strategy | **Amendment 2 to ADR 0080 only.** No new ADR 0086. Single decision trail; consolidates v0.2 schema break + projection pattern + chrome-vs-pedagogy boundary into one amendment block. |
| Q2 | New author-facing doc | **Reference doc only.** `docs/website/reference/course-info-schema.md`. Schema-forward; parallels `equation-registry-schema.md` / `chapter-components.md`. No separate how-to in this sprint. |
| Q3 | R12 standing rule | **Codify R12 now.** Two virtual modules (`figures` + `course-spec`) establish the class; defends the deferred ScheduleSchema virtual module (3rd instance) in advance. |
| Q4 | `positioning.md` | **Add 'vs course-LMS integration' differentiator row** to the table at `positioning.md:72-82`. No elevator change. |
| Q5 | New memory entries | **All three:** `feedback_always_register_virtual_module.md`, `feedback_chrome_not_pedagogy_component_split.md`, `feedback_pedagogy_store_doctrine.md`. R12 supersedes the fourth candidate (type-narrowing) — that pattern lives in AGENTS.md, not memory. |

Existing must-update memories (locked from Phase A, no further question
needed): `feedback_codebase_optimized_for_ai.md` (ADR 0061 validation
pin) + `reference_course_website_roadmap.md` (Tier-2 status marker).

---

## Post-merge state (pre-flight 2026-05-26 12:40 PT)

PR #202 (multi-chapter glossary definitions, ADR 0086, `a538d72`)
merged to main during Phase B/C. Pre-flight confirmed:

- We are on `main`, tree clean, fully synced with `origin/main`
- ADR 0086 is now **taken** by PR #202 — Phase B Q1's
  "Amendment-2-only" path is unchanged (and is also the only available
  path; the alternate "new ADR 0086" option would have collided)
- PR #202 touched 3 audit-plan target files but with **no edit
  overlap**:
  - `chapter-components.md` — line 81 (`<Aside kind="definition">`
    row expanded for ADR 0086); my Commit 4 adds a new lower
    subsection
  - `myst.yml` — added 0086 to `decisions:` list (line 241); my
    Commit 5 adds entry under `reference:` list (different list)
  - `validation.md` — regenerated with 0086 row; my Commit 1 will
    regen again to add 0080 v0.2 status (both ADRs coexist)
- Positioning table shape verified: **2 columns**
  (`| vs. | Sophie's distinct contribution |`), not 3 as I drafted.
  Commit 6 prose adapted: `| vs. course-LMS integration (Canvas,
  Blackboard, Moodle) | Schema-driven course-website chrome
  (course.sophie.yaml v0.2) auto-generates syllabus, schedule,
  instructor, policies, and accommodations pages; single source
  updates web + iCal + PDF in lockstep. Lighter-weight than LMS
  plugins, more structured than plain-Markdown syllabi. |`

---

## Phase C — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to implement this plan task-by-task. After Anna approves via
> `ExitPlanMode`, the **first action** of Phase D is to copy this plan
> section to `docs/plans/2026-05-26-docs-audit-course-info-projection.md`
> (plan-mode constrained writes to this scratch file; Phase D moves it
> to the canonical home).

**Goal:** Bring `docs/website/`, AGENTS.md, and project memory back in
sync with what shipped in PR #199 (course-info projection sprint,
commit `4e0730e`, 2026-05-26). Cover 6 ADR must-updates, 1 author-
facing reference doc creation, 4 status/strategy touches, 5 memory
operations, and 1 design-doc appendix.

**Architecture:** Ten commits landing directly on `main` per
`feedback_branch_pr_scope` (docs-only changes skip the PR flow). Order
front-loads the foundational amendment (ADR 0080 v0.2) since
downstream cross-references cite it. AGENTS.md table batched late so
the "Locked decisions" surface stays atomic. Memory updates are local
filesystem operations (not git). Verification gates run between every
commit: MyST build (0 ⚠), Biome check (0/0), R6 anchor verification,
plus `validation.md` regen on the ADR-0080 status touch.

**Tech Stack:** Markdown + MyST (`docs/website/`), Biome 2 (format),
`scripts/regenerate-validation-index.mts` (validation dashboard).

### Pre-reading (don't skip)

- `docs/plans/2026-05-26-course-info-projection-design.md` — the
  validated design this audit reconciles against
- `docs/plans/2026-05-26-course-info-projection-implementation.md` —
  revised plan that landed
- `docs/reviews/2026-05-26-course-info-projection-phases-1-4.md` —
  graded A−; C1/C2/I1-I4 fixes all merged
- `docs/website/decisions/0080-course-spec-format-v0-1.md` — current
  v0.1 spec doc being amended; note Amendment 1 footer convention
- `AGENTS.md` — HITL mandate; W1-W4 working principles; R6-R11 (R12
  added in Commit 9); Conventions section
- `~/.claude/projects/-Users-anna-Teaching-sophie/memory/MEMORY.md` —
  index of all memory files; preserves the linking convention this
  plan extends

### Branch + landing strategy

Per `feedback_branch_pr_scope`: all 9 git commits land directly on
`main`. No worktree, no PR, no merge. (Memory updates in Commit 10 are
not git — they're filesystem writes to `~/.claude/projects/.../memory/`.)

Verify the working tree is clean before starting:

```bash
cd /Users/anna/Teaching/sophie
git status -s
git fetch origin main --quiet
git log --oneline -1 origin/main  # should match 4e0730e or later
```

### Verification gates (run between every commit)

```bash
# Gate 1: MyST build clean (0 content warnings)
cd /Users/anna/Teaching/sophie/docs/website
npx mystmd build --html 2>&1 | tee /tmp/myst.log
grep -c "⚠" /tmp/myst.log  # expect 0

# Gate 2: Biome check (0 errors, 0 warnings)
cd /Users/anna/Teaching/sophie
pnpm exec biome check docs/website/ AGENTS.md 2>&1 | tee /tmp/biome.log
grep -E "(error|warning)" /tmp/biome.log  # expect no output
```

**Final R6 closure gate (run after Commit 9):**

```bash
cd /Users/anna/Teaching/sophie
grep -rE "#L[0-9]+" docs/website/ --include="*.md"  # expect no output
```

Any hit means an ADR cross-reference used a GitHub line-anchor
(`#L42`) instead of a MyST heading-slug — fix before declaring done.

---

### Commit 1 — ADR 0080 Amendment 2 (v0.2 + projection pattern)

**Files:**
- Modify: `docs/website/decisions/0080-course-spec-format-v0-1.md`
- Regen: `docs/website/status/validation.md`

**Why first.** Every downstream ADR cross-reference (Commits 2–3) cites
this amendment. The validation dashboard regen rule
(`feedback_validation_dashboard_regen`) demands the regen lands in the
same commit as the ADR status touch.

**Step 1: Read ADR 0080 end-to-end** to confirm Amendment 1's footer
convention and locate the validation block + assessment table line.

```bash
wc -l docs/website/decisions/0080-course-spec-format-v0-1.md
grep -n "Amendment\|grade_weights\|sum to 100\|status:\|validation:" docs/website/decisions/0080-course-spec-format-v0-1.md
```

**Step 2: Update the assessment-table line (around line 86).** Find
the row mentioning `grade_weights` and rewrite it. Exact replacement
text (preserves the existing column structure):

> `| assessment | philosophy + category_refs (audit-coverage pointer into grading.categories) + workflow + exam_policy |`

**Step 3: Update the body validation example (around lines 146–149).**
Find the prose claiming "`assessment.grade_weights` must sum to exactly
100" and rewrite to point at the v0.2 invariant. Exact replacement:

> Schema enforces that `grading.categories[*].weight` values sum to
> `1.0 ± 0.001` (Zod cross-refine). `assessment.category_refs[]` must
> reference declared `grading.categories[*].id` values (second
> cross-refine). `objectives[*].assessed_by[]` likewise must reference
> declared category ids (third cross-refine, added in Phase 1 review
> remediation I3).

**Step 4: Append Amendment 2 block** at the bottom of the ADR
(immediately after Amendment 1 if present; otherwise after the
Consequences section). Use this exact prose:

```markdown
## Amendment 2 — 2026-05-26: v0.2 clean break + projection pattern

**Sprint**: course-info projection
([PR #199](https://github.com/drannarosen/sophie/pull/199), commit
`4e0730e`).
**Status**: shipped.
**Reference**: `docs/plans/2026-05-26-course-info-projection-design.md`
(design) + `docs/plans/2026-05-26-course-info-projection-implementation.md`
(implementation) + `docs/reviews/2026-05-26-course-info-projection-phases-1-4.md`
(code review).

### Clean break: `assessment.grade_weights` removed

Per `feedback_no_backcompat_prelaunch`. The v0.1 shape (`grade_weights:
[{ category, weight, label }]` summing to 100) is **removed** from
`AssessmentSectionSchema`. Replacements:

- **Required**: top-level `grading: { categories: [...], letter_scale:
  [...], curve_policy_ref? }`. Each category carries `{ id, name,
  weight, count?, drop_lowest?, late_policy_ref? }`. Weights sum to
  `1.0 ± 0.001` (Zod refine, not 100).
- **Required**: `assessment.category_refs: [string]` as an
  audit-coverage pointer into `grading.categories[*].id`. Enables
  audit invariants (QB6/QB7) the previous `grade_weights` shape
  couldn't express.
- **Fixture migration**: `weights-not-100.yaml` →
  `category-weights-not-one.yaml` (test fixture rename).

### New optional clusters (additive; courses opt in incrementally)

| Cluster | Schema file | Notes |
|---|---|---|
| `objectives` | `course-spec-v02-objectives.ts` | course-level LOs with `assessed_by?: [category_id]` |
| `prereqs` | `course-spec-v02-prereqs.ts` | course / skill / topic refs |
| `office_hours` | `course-spec-v02-office-hours.ts` | modality enum, HH:MM regex, by_appointment |
| `contact` | `course-spec-v02-contact.ts` | email validation, async_channel |
| `accessibility` | `course-spec-v02-accessibility.ts` | DRC link, request_deadline_weeks |
| `info_pages` | `course-spec-v02-info-pages.ts` | drives route injection + layout composition |
| `landing` | `course-spec-v02-landing.ts` | pluggable landing layout |

Per ADR 0061 sibling-file LOC budget: 8 new files (20–91 LOC each);
main `course-spec.ts` grew 371 → 404 LOC (within 500-warn budget).

### `info_pages` strict-union `compose:` + reserved slugs

`info_pages.compose: ComposeEntry[]` where `ComposeEntry =
KNOWN_COMPOSE_DATA_KEYS | /^prose\/<kebab-slug>$/`. Typos fail at
schema-parse time, not in the compose evaluator at render time
(defends the class at the schema layer per H4/B5 decision). Reserved
slugs (`units`, `sections`, `library`, `_astro`, `_server`, `_image`,
`pagefind`) are rejected by a second refine.

### `landing.layout: "custom"` enum value

Explicit schema declaration that the integration-override path
(`defineSophieIntegration({ landings: { course, section } })`) is in
effect. Otherwise enum defaults to `"simple-list"`. Per H2 decision.

### Three cross-refines

| Source | Target | Catches |
|---|---|---|
| `assessment.category_refs[]` | `grading.categories[*].id` | unreferenced grading category vs. unreferenced assessment surface |
| `objectives[*].assessed_by[]` | `grading.categories[*].id` | objective claims assessment by a category that doesn't exist (added per review I3) |
| `info_pages` keys + reserved-slug refine | reserved set | slug collision with Sophie-injected routes |

### Projection pattern (operationalizes ADR 0082 precedent)

Course-info is a projection from `course.sophie.yaml` + named MDX prose
fragments at `src/content/course-info/<slug>.mdx`. `@sophie/astro`
injects 7 routes from the spec at `astro:config:setup`:

- `/` (course landing — dispatcher to `hero-with-modules` |
  `simple-list` | `prose-with-toc` | `"custom"`-override)
- `/sections/[section]/` (section landing)
- `/<info_page_slug>/` per declared `info_pages` entry (5 ship today:
  `/syllabus/`, `/schedule/`, `/instructor/`, `/policies/`,
  `/accommodations/`)

Layouts are **`.astro` orchestrators** in
`packages/astro/src/components/` composing **React sub-components** in
`@sophie/components` (`ObjectivesSection`, `GradingTable`,
`OfficeHoursTable`, `ContactCard`, `AccessibilitySection`,
`PrereqsList` — six sub-components). Decision per H7 Option B —
matches the `ChapterLayout` precedent and lets prose fragments use
the full chrome-component set via `<Content components={...}>`.

### Chrome vs. pedagogy: component-set split (ADR 0058 boundary
operationalized)

Prose fragments at `src/content/course-info/` use
`makeChromeComponents({ figures })` (a new factory shipping alongside
the existing `makeStaticComponents`). Allowed in fragments:
`<Callout>`, `<GlossaryTerm>`, `<KeyEquation>`, `<EquationRef>`,
`<FigureRef>`, `<Aside>`. **Excluded** (pedagogy primitives whose
meaning depends on chapter context): `<OMIFlow>`, `<WorkedExample>`,
`<MultiRep>`, `<Intervention>`.

A separate family of 5 **MDX-authorable course-management chrome
components** lives at `@sophie/components/chrome/`: `<Due>`,
`<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`. These read course
data via the `useCourseSpec()` hook (SSR-setter + script-tag pattern
per `pedagogy-store.ts:14-22` doctrine — no `virtual:` imports in
`@sophie/components`). They are chrome, not pedagogy; no epistemic
role per ADR 0058.

### Schema location

`CourseInfoFragmentSchema` (Astro content-collection frontmatter
validator) ships in `@sophie/core/schema`, not `@sophie/astro`. All
Zod schemas co-locate in core; `@sophie/astro` takes no direct Zod
dep.

### Deferred (out of v0.2)

iCal export (`/schedule.ics`) and `schedule.yaml` source-of-truth
deferred to a follow-up sprint per H6. `SchedulePage.astro` ships as
v0.2 placeholder. ScheduleSchema gets its own design pass + ADR when
the follow-up sprint starts.

### Code review verdict

Graded A−; C1 (dispatcher unguarded null deref), C2 (`prereqs`
silent skip), I1 (layout enum tightening), I2 (useId for headings),
I3 (objectives cross-refine), I4 (stub TODO tracking) — all merged.

```

**Step 5: Update the ADR's `status:` / `validation:` frontmatter
blocks** so the validation dashboard regen reflects v0.2. If the
existing frontmatter has `status: locked` or similar, append a
`validation:` entry referencing PR #199 + commit `4e0730e` per the
existing convention. (Read the ADR header first to learn the exact
field shape — Anna's `feedback_validation_dashboard_regen` says any
touch to these blocks triggers regen.)

**Step 6: Regen the validation dashboard.**

```bash
cd /Users/anna/Teaching/sophie
pnpm tsx scripts/regenerate-validation-index.mts
git diff docs/website/status/validation.md  # should show 0080 row update
```

If the script complains, read its source first
(`scripts/regenerate-validation-index.mts`) to confirm input expectations.

**Step 7: Verify (MyST + Biome gates).**

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"  # 0
cd .. && pnpm exec biome check docs/website/decisions/0080-course-spec-format-v0-1.md docs/website/status/validation.md 2>&1 | tail -5
```

**Step 8: Commit.**

```bash
git add docs/website/decisions/0080-course-spec-format-v0-1.md docs/website/status/validation.md
git commit -m "docs(adr): ADR 0080 Amendment 2 — v0.2 clean break + projection pattern

Documents what shipped in PR #199 (course-info projection sprint, commit
4e0730e, 2026-05-26):

- Clean break: assessment.grade_weights REMOVED; replaced by required
  top-level grading.categories (weights sum to 1.0 ±0.001) + new
  assessment.category_refs audit-coverage pointer.
- 7 new optional clusters (objectives, prereqs, office_hours, contact,
  accessibility, info_pages, landing) shipped as 8 sibling-file schemas
  per ADR 0061 LOC budget.
- info_pages strict-union compose + reserved-slug refine.
- landing.layout: 'custom' enum value (H2).
- Three cross-refines: category_refs + objectives.assessed_by +
  reserved slugs.
- Projection pattern operationalizes ADR 0082 precedent; H7 = Option B
  shipped (.astro orchestrators + React sub-components).
- Chrome-vs-pedagogy boundary structurally enforced via
  makeChromeComponents factory split (ADR 0058 operationalized).
- iCal + schedule.yaml deferred per H6.

Regenerated docs/website/status/validation.md per the
feedback_validation_dashboard_regen discipline."
```

---

### Commit 2 — Cross-reference paragraphs on ADRs 0082, 0058, 0061, 0004, 0030

**Files:**
- Modify: `docs/website/decisions/0082-chapter-layout-extraction.md`
- Modify: `docs/website/decisions/0058-epistemic-component-contract.md`
- Modify: `docs/website/decisions/0061-ai-optimized-codebase-design.md`
- Modify: `docs/website/decisions/0004-component-contract.md` (or whatever 0004's exact filename is — verify with `ls docs/website/decisions/000*`)
- Modify: `docs/website/decisions/0030-audience-ai-authoring.md` (verify exact filename)

**Why batched.** Each is a 1–3 paragraph cross-reference back to ADR
0080 Amendment 2. Same rationale across all five. Bundling preserves
atomic "what shipped, where it's documented" surface.

**Step 1: Read each ADR's existing Consequences / Notes section** to
pick the right insertion point. For each, find a section header
near-the-end where the cross-reference fits naturally:

```bash
for adr in 0082 0058 0061 0004 0030; do
  echo "=== ADR $adr ==="
  grep -n "^##\|^###" docs/website/decisions/${adr}-*.md
done
```

**Step 2: Author each cross-reference.** Use these exact templates
(adapt the section heading per the ADR's existing structure):

**ADR 0082** (chapter-layout extraction — route-injection precedent):

```markdown
### Course-info route-injection extension (2026-05-26)

The course-info projection sprint
([PR #199](https://github.com/drannarosen/sophie/pull/199)) extends
this ADR's route-injection precedent to plural course-info routes.
`defineSophieIntegration` injects up to 7 additional routes at
`astro:config:setup`: `/`, `/sections/[section]/`, and one
`/<slug>/` per declared `info_pages` entry. Each is spec-driven and
dispatcher-based, mirroring the `/units/[unit]/reading` precedent.
`virtual:sophie/course-spec` is the second instance of the
virtual-module pattern (first: `virtual:sophie/figures`); see
[ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern)
for the projection-pattern decision.
```

**ADR 0058** (epistemic component contract — chrome-vs-pedagogy
operationalized):

```markdown
### Chrome vs. pedagogy component-set split (2026-05-26)

The course-info projection sprint operationalizes this contract's
chrome-vs-pedagogy boundary at the code level. Two factories ship:
`makeStaticComponents({ figures })` (chapter MDX; includes all eight
epistemic-role primitives) and `makeChromeComponents({ figures })`
(course-info prose fragments at `src/content/course-info/`; excludes
the pedagogy primitives `<OMIFlow>`, `<WorkedExample>`, `<MultiRep>`,
`<Intervention>`). A separate family of 5 MDX-authorable
course-management chrome components (`<Due>`, `<Points>`,
`<Reading>`, `<OfficeHours>`, `<Week>`) ships at
`@sophie/components/chrome/`; these are chrome with no epistemic role.
See [ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**ADR 0061** (AI-optimized codebase design — sibling-file LOC budget
validated):

```markdown
### Course-info schema split — pattern validation (2026-05-26)

The course-info projection sprint validated Rule 1 (focused files) +
Rule 3 (LOC budget) at scale: 8 new sibling-file schemas
(`course-spec-v02-{objectives,prereqs,grading,office-hours,contact,accessibility,info-pages,landing}.ts`)
shipped at 20–91 LOC each; main `course-spec.ts` grew 371 → 404 LOC
(well within the 500-warn budget). AI-author navigation by filename
worked end-to-end through the 14-commit sprint. See
[ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**ADR 0004** (component contract — chrome family + axe-on-render
unchallenged):

```markdown
### Course-management chrome family (2026-05-26)

The course-info projection sprint shipped a 5-component chrome family
at `@sophie/components/chrome/` (`<Due>`, `<Points>`, `<Reading>`,
`<OfficeHours>`, `<Week>`) plus 6 React layout sub-components
(`ObjectivesSection`, `GradingTable`, `OfficeHoursTable`, `ContactCard`,
`AccessibilitySection`, `PrereqsList`). All carry the
chrome-not-pedagogy classification per
[ADR 0058](./0058-epistemic-component-contract.md). Axe-on-render
coverage held: 58/58 components pass `pnpm lint:axe-render` post-sprint.
The shared `useCourseSpec()` hook reads from a SSR-setter +
script-tag store (`pedagogy-store.ts:14-22` doctrine), not from a
`virtual:` import in `@sophie/components`. See
[ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**ADR 0030** (audience + AI authoring — platform-code authorship
example):

```markdown
### Platform-code AI authorship example (2026-05-26)

The course-info projection sprint exemplifies AI-primary authoring of
platform code under HITL supervision: 14 AI-authored commits, 92 files,
+4826 / −255 LOC, landing as PR #199 against a coordinated design doc
+ implementation plan + code review. H1–H7 architectural decisions
were resolved via in-thread `AskUserQuestion` rather than asynchronous
review. Phases 1–4 graded A− at the closure review. See
[ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**Step 3: R6 anchor verification.** The cross-references above use MyST
heading-slug anchors (`#amendment-2-2026-05-26-v02-clean-break-projection-pattern`)
not GitHub `#L42`-style line anchors. Verify the slug actually matches
the Amendment 2 heading MyST will generate:

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -i "amendment"
```

If the generated slug differs, fix the cross-references before commit
(MyST slugifies headings as `lowercase-with-dashes`; punctuation gets
dropped).

**Step 4: Verify (MyST + Biome).**

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"  # 0
cd .. && pnpm exec biome check docs/website/decisions/ 2>&1 | tail -5
```

**Step 5: Commit.**

```bash
git add docs/website/decisions/0004-*.md docs/website/decisions/0030-*.md docs/website/decisions/0058-*.md docs/website/decisions/0061-*.md docs/website/decisions/0082-*.md
git commit -m "docs(adr): cross-reference ADRs 0004, 0030, 0058, 0061, 0082 to 0080 Amendment 2

Each gets a short cross-reference paragraph documenting how the
course-info projection sprint (PR #199, 4e0730e) extends or validates
its decision: route-injection precedent (0082), chrome-vs-pedagogy
operationalization (0058), sibling-file LOC budget validation (0061),
course-management chrome family (0004), AI-authored platform code under
HITL (0030).

All cross-references use MyST heading-slug anchors (R6)."
```

---

### Commit 3 — Should-update ADRs 0023, 0067, 0003

**Files:**
- Modify: `docs/website/decisions/0023-vertical-slice-build-order.md` (verify filename)
- Modify: `docs/website/decisions/0067-section-level-artifacts.md` (verify filename)
- Modify: `docs/website/decisions/0003-zod-source-of-truth.md` (verify filename)

**Why separate from Commit 2.** These are should-updates not
must-updates; bundling them with Commit 2's must-update set blurs the
audit trail. Same shape (short cross-reference) but each is optional
nice-to-have.

**Step 1: Author each cross-reference.**

**ADR 0023** (vertical-slice build order):

```markdown
### Course-info projection — second refactor-outward instance (2026-05-26)

Following the chapter-layout extraction (ADR 0082), the course-info
projection sprint is the second example of this ADR's
"refactor-outward as patterns emerge" pattern. The reading-route
shape was lifted out of consumer repos into `@sophie/astro/routes/`
+ `@sophie/components/`; course-info chrome follows the same path
after astr201 validates the projection pattern. See
[ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**ADR 0067** (section-level artifacts — boundary clarification):

```markdown
### Boundary: course-info prose fragments are not artifacts (2026-05-26)

Course-info prose fragments at `src/content/course-info/<slug>.mdx`
are **course-level singletons**, not pedagogical artifacts. They are
not subject to the Section/Unit/Artifact hierarchy this ADR defines;
they are referenced by string ref (`"prose/<slug>"`) from
`course.sophie.yaml`'s `info_pages.compose:` block. See
[ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**ADR 0003** (Zod source of truth — placement rule clarification):

```markdown
### Schema placement rule (2026-05-26 clarification)

`CourseInfoFragmentSchema`, the Astro content-collection frontmatter
validator for course-info prose fragments, ships in
`@sophie/core/schema` (not `@sophie/astro`). All Zod schemas
co-locate in core; `@sophie/astro` takes no direct Zod dep. The
clarified rule: schemas live in `@sophie/core/schema` even when only
one package consumes them. See
[ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**Step 2: Verify + commit.**

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"  # 0
cd .. && pnpm exec biome check docs/website/decisions/ 2>&1 | tail -5
git add docs/website/decisions/0003-*.md docs/website/decisions/0023-*.md docs/website/decisions/0067-*.md
git commit -m "docs(adr): should-update cross-references on ADRs 0003, 0023, 0067 → 0080 Amendment 2

Three short cross-references documenting how the course-info sprint
interacts with adjacent decisions: vertical-slice second example
(0023), course-info-fragment-vs-artifact boundary (0067), Zod schema
placement-rule clarification (0003)."
```

---

### Commit 4 — `chapter-components.md`: add "Course-management chrome" subsection

**Files:**
- Modify: `docs/website/reference/chapter-components.md` (insert new
  subsection after existing "Chrome primitives" section ~line 104)

**Why critical.** Agent 2's audit flagged this as the single most
material staleness gap: 5 author-typed components shipped with zero
author-facing documentation. Authors writing the first real syllabus
page have no reference today.

**Step 1: Read the existing "Chrome primitives" section** to match
voice + structure:

```bash
sed -n '90,200p' docs/website/reference/chapter-components.md
```

**Step 2: Insert the new subsection** after the existing chrome
primitives block. Use this exact prose:

```markdown
## Course-management chrome (5 components, course-info projection)

Shipped 2026-05-26 in PR #199. These components are **MDX-authorable
chrome** — typed by authors in chapter MDX or course-info prose
fragments to render course-management metadata (due dates, point
values, reading assignments, office hours, week labels). They are
**chrome, not pedagogy**: no epistemic role per
[ADR 0058](../decisions/0058-epistemic-component-contract.md); not
indexed by `PedagogyIndex`.

All five read course data via the `useCourseSpec()` hook, which is
backed by a SSR-setter + script-tag store (no `virtual:` imports in
`@sophie/components`). The hook throws a curated error if rendered
in a consumer without a `course.sophie.yaml`.

### `<Due>`

Renders an upcoming or past due date.

```mdx
<Due />                                       {/* schema lookup by chapter context */}
<Due date="2026-09-15" of="reading" />        {/* explicit override */}
```

**Props (all optional, hybrid props-or-schema):**

| Prop | Type | Default |
|---|---|---|
| `date` | `YYYY-MM-DD` string | resolved from chapter context |
| `of` | `"reading" \| "problem-set" \| "exam" \| "growth-memo"` | resolved from context |

UTC parsing avoids SSR/client TZ shift. Hostile case `2026-12-31` in a
US-eastern environment renders consistently as `Dec 31, 2026` in both
SSR and hydration.

### `<Points>`

Renders a points-or-percentage badge for an assessment surface.

```mdx
<Points value={20} category="problem-set" />
```

**Props (required):**

| Prop | Type | Notes |
|---|---|---|
| `value` | `number` | absolute points, not percentage |
| `category` | string | must reference `grading.categories[*].id` in spec |

Throws a curated error listing known category ids if `category`
doesn't resolve.

### `<Reading>`

Renders a textbook reading reference (prose-string-typed in v1 per
YAGNI; structured shape deferred until a textbook-reading-list page
exists).

```mdx
<Reading source="Carroll & Ostlie §6.3" pages="247-260" />
```

**Props (required):**

| Prop | Type |
|---|---|
| `source` | `string` (prose, e.g. textbook short-name + section) |
| `pages` | `string` (e.g. `"247-260"`) |

No schema lookup at v1 — `source` is required. Future graduation to
`{ textbook_id, chapter, pages: { start, end } }` waits for a real
second-caller consumer.

### `<OfficeHours>`

Renders the next upcoming office-hours slot from `course.sophie.yaml`'s
`office_hours[]` cluster.

```mdx
<OfficeHours />
```

No props. If the spec has no `office_hours:` block, renders the
author-visible empty state `Office hours: not set`. (Internally the
file is named `OfficeHoursChrome` to disambiguate from
`OfficeHoursTable`, the React sub-component used inside
`InstructorPage.astro` — the barrel aliases the export to
`<OfficeHours>`.)

### `<Week>`

Renders a week label (e.g. `Week 4`).

```mdx
<Week n={4} />
```

**Props (required):**

| Prop | Type |
|---|---|
| `n` | positive integer |

Throws on `NaN`, negative, or non-integer values.

### Boundary: chrome vs. pedagogy

The 5 chrome components above are **allowed in chapter MDX AND
course-info prose fragments**. Conversely, pedagogy primitives
(`<OMIFlow>`, `<WorkedExample>`, `<MultiRep>`, `<Intervention>`) are
**only allowed in chapter MDX** — they are excluded from course-info
prose fragments because their meaning depends on chapter context (per
[ADR 0058](../decisions/0058-epistemic-component-contract.md)).

The component-set boundary is structurally enforced via two
factories:

- `makeStaticComponents({ figures })` — chapter MDX (full set)
- `makeChromeComponents({ figures })` — course-info prose fragments
  (chrome subset only)

See [course-info-schema.md](./course-info-schema.md) for the
prose-fragment authoring reference.
```

**Step 3: Verify (MyST + Biome).**

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"  # 0
cd .. && pnpm exec biome check docs/website/reference/chapter-components.md 2>&1 | tail -5
```

**Step 4: Commit.**

```bash
git add docs/website/reference/chapter-components.md
git commit -m "docs(reference): chapter-components.md — Course-management chrome subsection

Documents the 5 MDX-authorable course-management chrome components
shipped in PR #199 (Due, Points, Reading, OfficeHours, Week) plus
the chrome-vs-pedagogy boundary (makeStaticComponents vs
makeChromeComponents factory split). Addresses the single most
material author-facing staleness gap surfaced in the post-sprint
docs audit."
```

---

### Commit 5 — NEW `docs/website/reference/course-info-schema.md` + MyST TOC entry

**Files:**
- Create: `docs/website/reference/course-info-schema.md`
- Modify: `docs/website/myst.yml` (add TOC entry under reference/)

**Why critical.** No reference exists for `course.sophie.yaml` v0.2
shape, `src/content/course-info/` location convention, the
`info_pages.compose` strict union, prose-fragment frontmatter, or
the allowed/forbidden component subsets. This is the authoring entry
point for the second Sophie course (ASTR 101 or COMP 521 when they
land).

**Step 1: Read the existing reference docs** to match voice + structure
(parallel intent: `equation-registry-schema.md` is the closest model):

```bash
ls docs/website/reference/
head -50 docs/website/reference/equation-registry-schema.md
head -50 docs/website/reference/chapter-components.md
```

**Step 2: Create the new reference doc.** Use this outline (each section
gets concrete content drawn from the design doc + Amendment 2):

```markdown
# Course-info schema reference

Reference for authoring Sophie course-info pages: `course.sophie.yaml`
v0.2 + prose fragments at `src/content/course-info/`. Shipped in PR
#199 (course-info projection sprint, 2026-05-26).

Related: [chapter-components.md](./chapter-components.md) for the 5
MDX-authorable chrome components;
[ADR 0080 Amendment 2](../decisions/0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern)
for the locked-decision audit trail.

## Three layers

1. **`course.sophie.yaml` v0.2** — structural data: identity, grading,
   objectives, prereqs, contact, office hours, accessibility,
   `info_pages`, `landing`.
2. **Prose fragments** at `src/content/course-info/<slug>.mdx` —
   authored prose for sections the schema deliberately leaves
   unstructured (policies, instructor bio, accommodations specifics,
   late-work prose, course thesis).
3. **Composition layouts** (`@sophie/astro/src/components/<Page>.astro`)
   — read both, render pages. Authors don't touch these; they're
   shipped by `@sophie/astro`.

## `course.sophie.yaml` v0.2 — full shape

(Section reproduces the v0.2 YAML example from the design doc lines
62–100 verbatim, then walks each cluster with field-by-field
reference.)

### Identity (v0.1, unchanged)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | slug | yes | course id, lowercase-kebab |
| `title` | string | yes | display title |
| `code` | string | yes | e.g. `ASTR 201` |
| `term` | string | yes | e.g. `Spring 2027` |
| `institution` | string | yes | display name |
| `instructor` | string | yes | display name |
| `voice`, `voice_register` | string | yes | authoring-voice anchors |

### Grading (required at v0.2; replaces v0.1 `assessment.grade_weights`)

```yaml
grading:
  categories:
    - { id: "hw", name: "Homework", weight: 0.30, drop_lowest: 1, late_policy_ref: "prose/late-policy" }
    - { id: "exams", name: "Exams", weight: 0.40, count: 2 }
    - { id: "final", name: "Final Project", weight: 0.30 }
  letter_scale:
    - { grade: "A", min: 93 }
    - { grade: "A-", min: 90 }
    # ...
  curve_policy_ref: "prose/grading-curve"   # optional
```

**Invariants:**
- `categories[*].weight` values sum to `1.0 ± 0.001`.
- `assessment.category_refs[]` must reference declared
  `categories[*].id`.
- `objectives[*].assessed_by[]` (when present) must reference declared
  `categories[*].id`.
- All three invariants enforced at schema-parse time.

### Objectives, prereqs, office_hours, contact, accessibility

(Field-by-field tables. Each cluster: required-or-optional, types,
example, edge cases.)

### `info_pages` — strict-union `compose:`

```yaml
info_pages:
  syllabus:
    layout: SyllabusPage
    compose:
      - objectives
      - prereqs
      - grading
      - office_hours
      - accessibility
      - schedule_overview     # throws at render — deferred per H6
      - "prose/policies"
      - "prose/course-thesis"
  policies: { layout: PoliciesPage, prose: "prose/policies" }
  instructor: { layout: InstructorPage, prose: "prose/instructor-bio" }
  accommodations: { layout: AccommodationsPage, prose: "prose/accommodations" }
  schedule: { layout: SchedulePage }   # v0.2 placeholder per H6
```

**`compose:` entries are a strict union:**

- Known data keys: `objectives | prereqs | grading | office_hours |
  accessibility | contact | schedule_overview`. (`schedule_overview`
  parses clean but throws at render — deferred per H6.)
- Prose refs matching `/^prose\/[a-z][a-z0-9-]*$/`. The `prose/`
  prefix is reserved by Sophie to mean "named prose fragment in
  `src/content/course-info/`."

Typos like `"objetctives"` fail at `pnpm vitest` parse time, not at
render time. (Per H4/B5 decision; defends the class at the schema
layer.)

**Reserved `info_pages` slugs** (rejected at parse time): `units`,
`sections`, `library`, `_astro`, `_server`, `_image`, `pagefind`.
Future bridge slugs reserve themselves when their bridge ADRs land.

**Available layouts (v0.2):** `SyllabusPage`, `SchedulePage`,
`InstructorPage`, `PoliciesPage`, `AccommodationsPage`.

### `landing` — pluggable

```yaml
landing:
  layout: "hero-with-modules"   # or "simple-list" | "prose-with-toc" | "custom"
  hero?: { title?, tagline?, image_ref?, cta? }
  show_announcements?: bool
```

Three built-in layouts ship at v0.2 (`hero-with-modules`,
`simple-list`, `prose-with-toc`); default is `"simple-list"`. The
`"custom"` enum value is **explicit declaration** that the consumer
is overriding via `defineSophieIntegration({ landings: { course,
section } })` — the schema enum guards against typos in the override
declaration. Per H2.

## Prose fragments at `src/content/course-info/`

(File-location convention; frontmatter shape; allowed-component
subset; example end-to-end.)

### Location convention

```
src/content/course-info/
├── policies.mdx
├── instructor-bio.mdx
├── accommodations.mdx
├── late-work.mdx
└── course-thesis.mdx
```

Filename slug **is** the id; no `id:` frontmatter field. Referenced
from `course.sophie.yaml` as `"prose/<slug>"`.

### Frontmatter (validated by `CourseInfoFragmentSchema`)

```yaml
---
title: "Course policies"
description: "Late-work, attendance, academic integrity."  # optional
last_revised: "2026-05-26"                                  # optional, YYYY-MM-DD
ai_contribution:                                            # optional, ADR 0042 mirror
  visibility: "public"
  models: ["claude-opus-4-7"]
  review_depth: "manual"
---
```

Schema lives in `@sophie/core/schema` (not `@sophie/astro` — all Zod
co-locates in core).

### Allowed components

The `makeChromeComponents({ figures })` factory exposes this subset:

- `<Callout>`, `<GlossaryTerm>`, `<KeyEquation>`, `<EquationRef>`,
  `<FigureRef>`, `<Aside>` — from the chapter-component set.
- The 5 MDX-authorable course-management chrome components from
  [chapter-components.md](./chapter-components.md#course-management-chrome-5-components-course-info-projection):
  `<Due>`, `<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`.

### Excluded components (chrome ≠ pedagogy boundary)

The factory deliberately omits pedagogy primitives — they're excluded
from course-info because their meaning depends on chapter context:

- `<OMIFlow>` — observable / model / inference flow primitive
- `<WorkedExample>` — solved-example primitive
- `<MultiRep>` — multi-representation primitive
- `<Intervention>` — misconception-intervention primitive

Per [ADR 0058](../decisions/0058-epistemic-component-contract.md).

## Layouts (overview, not author-facing API)

(Brief overview of what each .astro layout composes; full layout
contract is internal to `@sophie/astro` and not author-facing.)

| Layout | Source | Composes |
|---|---|---|
| `SyllabusPage.astro` | `packages/astro/src/components/SyllabusPage.astro` | spec data + prose fragments via `info_pages.syllabus.compose` |
| `SchedulePage.astro` | same dir | v0.2 placeholder; full impl deferred per H6 |
| `InstructorPage.astro` | same dir | `spec.contact` + `office_hours` + `prose/instructor-bio` |
| `PoliciesPage.astro` | same dir | `prose/policies` + `grading.late_policy_ref` |
| `AccommodationsPage.astro` | same dir | `spec.accessibility` + `prose/accommodations` |

Each composes 6 React sub-components from `@sophie/components`:
`ObjectivesSection`, `GradingTable`, `OfficeHoursTable`,
`ContactCard`, `AccessibilitySection`, `PrereqsList`. Authors don't
touch these directly.

## Deferred (out of v0.2)

| Item | Status | Trigger |
|---|---|---|
| iCal export (`/schedule.ics`) | deferred per H6 | own design pass + ADR |
| `schedule.yaml` source-of-truth | deferred per H6 | iCal sprint |
| `<Canvas>` chrome component | deferred | LTI integration |
| PDF syllabus | deferred | layouts stabilize first |
| Structured `<Reading>` shape | YAGNI deferred | second consumer |

## Related ADRs

- [ADR 0080 Amendment 2](../decisions/0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern) — the projection pattern + clean break decision
- [ADR 0082](../decisions/0082-chapter-layout-extraction.md) —
  route-injection precedent
- [ADR 0058](../decisions/0058-epistemic-component-contract.md) —
  chrome-vs-pedagogy boundary
- [ADR 0061](../decisions/0061-ai-optimized-codebase-design.md) —
  sibling-file LOC budget
```

**Step 3: Add the TOC entry to `docs/website/myst.yml`.**

```bash
grep -n "reference:\|chapter-components" docs/website/myst.yml
```

Insert a new entry under the `Reference` section, alphabetically
positioned (likely after `chapter-components.md`, before
`equation-registry-schema.md` or wherever the existing convention
places it):

```yaml
        - file: reference/course-info-schema.md
```

**Step 4: Verify (MyST + Biome).**

```bash
cd docs/website && npx mystmd build --html 2>&1 | tee /tmp/myst.log | grep -c "⚠"  # 0
grep -i "course-info" /tmp/myst.log | head -5  # confirm new doc indexed
cd .. && pnpm exec biome check docs/website/reference/course-info-schema.md docs/website/myst.yml 2>&1 | tail -5
```

**Step 5: Commit.**

```bash
git add docs/website/reference/course-info-schema.md docs/website/myst.yml
git commit -m "docs(reference): add course-info-schema.md — author reference for v0.2 + projection

New reference doc covering course.sophie.yaml v0.2 (three-layer
architecture, grading invariants, info_pages strict-union compose,
landing pluggable layouts, reserved slugs) + prose-fragment authoring
(src/content/course-info/ location convention, CourseInfoFragmentSchema
frontmatter, allowed/forbidden component subset via
makeChromeComponents).

Parallels equation-registry-schema.md structure. Added to MyST TOC
under reference/. Authors writing the first real syllabus page after
the course-info projection sprint now have a single canonical
reference."
```

---

### Commit 6 — `positioning.md`: add 'vs course-LMS integration' differentiator row

**Files:**
- Modify: `docs/website/strategy/positioning.md` (~lines 72–82, the
  differentiators table)

**Step 1: Read the existing differentiators table** to match the
column structure exactly:

```bash
sed -n '60,90p' docs/website/strategy/positioning.md
```

**Step 2: Add a new row** to the table. Use this exact prose (adapt
column count to whatever the existing table uses — likely
`Competitor | Their thing | Sophie's thing`):

```markdown
| vs. course-LMS integration (Canvas, Blackboard, Moodle) | LMS plugins or manually-authored Markdown pages; per-course rebuild required | Schema-driven course-website chrome (`course.sophie.yaml` v0.2) auto-generates syllabus, schedule, instructor, policies, and accommodations pages; single source updates web + iCal + PDF in lockstep |
```

**Step 3: Verify (MyST + Biome).**

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"  # 0
cd .. && pnpm exec biome check docs/website/strategy/positioning.md 2>&1 | tail -5
```

**Step 4: Commit.**

```bash
git add docs/website/strategy/positioning.md
git commit -m "docs(strategy): positioning.md — add course-LMS-integration differentiator row

Per Phase B Q4 decision: positions Sophie's schema-driven Tier-2
course-website chrome (PR #199) as lighter-weight than Canvas/Blackboard
plugins but more structured than plain-Markdown syllabi. No elevator
prose change (positioning stays stable until a second course validates
the multi-course claim)."
```

---

### Commit 7 — `roadmap.md`: 2026-05-26 status entry + PR-Info row

**Files:**
- Modify: `docs/website/status/roadmap.md`

**Step 1: Read the existing roadmap** to find the "Current status" header + the bucket/PR table:

```bash
grep -n "^## Current status\|^| .*PR" docs/website/status/roadmap.md | head -20
```

**Step 2: Append a "Current status (2026-05-26)" section** below the
existing "Current status (2026-05-15)" header (DO NOT replace the
2026-05-15 entry — preserve as audit trail). Use this prose:

```markdown
## Current status (2026-05-26)

Tier-2 course-website chrome shipped via PR #199 (course-info
projection sprint, commit `4e0730e`). Phases 1–4 complete:

- `course.sophie.yaml` v0.2 schema + 8 sibling-file schemas
- 5 info-page layouts (Syllabus, Schedule, Instructor, Policies,
  Accommodations) as `.astro` orchestrators
- Course-landing + section-landing dispatchers
- 5 MDX-authorable course-management chrome components (`<Due>`,
  `<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`)
- 6 React layout sub-components
- 2 virtual modules in use (`figures`, `course-spec`)

Phase 5 (iCal + `schedule.yaml`) deferred per H6 to a follow-up sprint
with its own design pass + ADR. See
[ADR 0080 Amendment 2](../decisions/0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).
```

**Step 3: Append a PR-Info row** to the bucket/PR table (the table
listing PRs 1–10):

```markdown
| PR-Info (#199) | ✓ merged 2026-05-26 | Course-info projection Phases 1–4 — v0.2 schema, info-page layouts, chrome components, route injection |
```

(Match the existing column shape — adapt if the table uses 4 columns
instead of 3.)

**Step 4: Verify + commit.**

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"  # 0
cd ..
git add docs/website/status/roadmap.md
git commit -m "docs(status): roadmap.md — 2026-05-26 entry + PR #199 row

Marks Tier-2 course-website chrome as shipped. Preserves 2026-05-15
entry as audit trail."
```

---

### Commit 8 — Design doc post-implementation amendments appendix

**Files:**
- Modify: `docs/plans/2026-05-26-course-info-projection-design.md`

**Step 1: Append the amendments appendix** at the bottom of the design
doc (the doc currently ends at line 285 per Phase A's Read). Use this
prose:

```markdown
---

## Post-implementation amendments (appended 2026-05-26 post-merge)

Reconciliation between this design doc and what shipped in PR #199.
Authoritative source for what shipped:
[ADR 0080 Amendment 2](../website/decisions/0080-course-spec-format-v0-1.md#amendment-2-2026-05-26-v02-clean-break-projection-pattern).

### Layouts ship as `.astro`, not React (H7 = Option B)

Design doc § "Layer 3" said "`@sophie/components` exports
`<SyllabusPage>`, `<SchedulePage>`, etc." **Shipped reality**: layouts
are `.astro` orchestrators in `packages/astro/src/components/`. React
sub-components (`ObjectivesSection`, `GradingTable`, `OfficeHoursTable`,
`ContactCard`, `AccessibilitySection`, `PrereqsList`) ship in
`@sophie/components`. Decision per H7 Option B — matches the
`ChapterLayout` precedent and lets prose fragments use the full chrome
component set via `<Content components={chromeComponents}>`.

### `CourseInfoFragmentSchema` location

Design doc § "Layer 2" said schema is "shipped from `@sophie/astro`."
**Shipped reality**: `@sophie/core/schema`. Consistency rule: all Zod
schemas co-locate in core; `@sophie/astro` takes no direct Zod dep.

### Six React sub-components, not five

Phase 3 enumerated 5 sub-components. Phase 4 review C2 added a 6th
(`PrereqsList`) to avoid a silent-skip foot-gun in
`SyllabusPage.astro` when a consumer declared `prereqs:` in the spec
and `"prereqs"` in compose.

### `landing.layout: "custom"` is a schema enum value (H2)

Design doc § "Pluggable landings" described `custom` as
"integration-arg override." **Shipped reality**: also a schema enum
value, explicitly declaring the override is in effect. Defends the
class — typos in the override declaration fail at parse time.

### `info_pages.compose:` is a strict union (H4/B5)

Design doc § "Schema design" described `compose:` permissively.
**Shipped reality**: `ComposeEntrySchema = z.union([KNOWN_DATA_KEYS,
prose/<kebab-slug> regex])`. Typos like `"objetctives"` fail at
parse time, not at compose-evaluator render time.

### Two cross-refines on `CourseSpecSchema`

Design doc described one cross-refine (category_refs). **Shipped
reality**: two, the second added per review I3:

- `assessment.category_refs[]` → `grading.categories[*].id`
- `objectives[*].assessed_by[]` → `grading.categories[*].id`

### `useCourseSpec()` SSR-setter pattern (not direct virtual-module
import)

Design doc § "Chrome components" said the hook reads "spec data via a
new `useCourseSpec()` hook backed by `virtual:sophie/course-spec`."
**Shipped reality**: SSR-setter + script-tag pattern per
`pedagogy-store.ts:14-22` doctrine. The store sits in
`@sophie/components`; the setter is called from `TextbookLayout.astro`
(`@sophie/astro`). `@sophie/components` never imports `virtual:...`
(bare-Node imports would hit `ERR_UNKNOWN_URL_SCHEME` outside Vite).

### `OfficeHoursChrome → OfficeHours` rename at the barrel

The MDX chrome component's source file is named `OfficeHoursChrome`
internally to disambiguate from `OfficeHoursTable` (a React
sub-component used inside `InstructorPage.astro`). The
`@sophie/components` barrel aliases the export to `<OfficeHours>` —
authors type the shorter form.

### Phase 5 (iCal + `schedule.yaml`) deferred per H6

Design doc § "Sprint sequencing" listed iCal under Phase 5.
**Shipped reality**: deferred. `SchedulePage.astro` ships as a v0.2
placeholder. ScheduleSchema gets its own focused design pass + ADR
when the follow-up sprint starts.

### Pluggable landing override via integration arg

Design doc described `defineSophieIntegration({ landings: { course,
section } })`. **Shipped reality**: same shape — confirmed as the only
override path (no `src/pages/<slug>.astro` shadow allowed for landing
routes; shadow-warn pattern is reserved for info-pages per ADR 0082
§A2.6).
```

**Step 2: Commit.**

```bash
git add docs/plans/2026-05-26-course-info-projection-design.md
git commit -m "docs(plans): design doc post-implementation amendments appendix

Reconciles the 2026-05-26 design doc with what shipped in PR #199.
Documents the 9 known deviations (H7 = Option B layouts; schema
location; 6 React sub-components; landing.layout custom enum;
strict-union compose; two cross-refines; useCourseSpec SSR-setter
pattern; OfficeHours barrel alias; Phase 5 deferral). Authoritative
source is ADR 0080 Amendment 2 — appendix is reading-convenience for
sprint-context readers."
```

---

### Commit 9 — AGENTS.md: R12 + Locked decisions table amendments (batched late)

**Files:**
- Modify: `AGENTS.md`

**Why batched late.** Per the workflow template: "AGENTS.md table
updates batched into one commit at the end so the 'Locked decisions'
surface stays atomic." All AGENTS.md edits land in this single commit.

**Step 1: Read AGENTS.md** to find exact line numbers for the
Locked-decisions table + the R6-R11 block:

```bash
grep -n "^| Concern\|^### R[0-9]\|^### Hard rules\|^### Discipline" AGENTS.md
```

**Step 2: Amend the ADR 0061 row** in the Locked-decisions table.
Find the existing row (currently lines ~170 area; text starts with
`**AI-optimized codebase design**`). Replace the cell content. Exact
new row text (preserves column widths):

```markdown
| **AI-optimized codebase design** | 0061 | **AI is primary author of platform code, not just content**: 6 rules (focused files, Write-over-Edit, LOC budget 300/500/800, filename routing, atomic docs, tests split with source); amends 0023/0030. **Validated by 8-file course-spec v0.2 split in PR #199** (sibling files 20–91 LOC; main schema 371→404 LOC within budget). |
```

**Step 3: Amend the ADR 0080 row** if it exists in the table (search
for it — it may not have been added yet). If absent, **add a new row**
between the existing 0058 and 0061 rows (preserving the ADR-number
chronological-ish order):

```markdown
| **Course-spec format** | 0080 | **v0.2 (Amendment 2, PR #199, 2026-05-26)**: clean-break removal of `grade_weights` → required `grading.categories` (sum to 1.0); 7 new optional clusters (objectives, prereqs, office_hours, contact, accessibility, info_pages, landing); strict-union `info_pages.compose`; reserved-slug refine; `landing.layout: "custom"` enum; 3 cross-refines; projection-pattern + chrome-vs-pedagogy boundary operationalized. |
```

**Step 4: Add R12** to the Discipline section, after R11. Use this
exact prose:

```markdown
- **R12 — Virtual-module type-narrowing at dispatcher entry.**
  Every dispatcher route (`.astro` file in
  `packages/astro/src/routes/`) that imports from
  `virtual:sophie/<name>` must open its frontmatter with
  `if (!<name>) throw new Error(...)` to narrow the
  `T | null` export type. The throw is structurally unreachable when
  the integration null-guards route injection (the upstream
  invariant), but documents the invariant in code AND defends against
  future mutations (if the injection guard is removed, the throw
  surfaces it). Pre-merge grep gate:

  ```bash
  grep -L "if (!.*throw" $(grep -lE 'from "virtual:sophie/' packages/astro/src/routes/*.astro 2>/dev/null) 2>/dev/null
  ```

  Returns empty when clean (every virtual-module-importing dispatcher
  has a paired throw guard). Originating finding:
  course-info-projection sprint review C1
  (`docs/reviews/2026-05-26-course-info-projection-phases-1-4.md`).
  Three dispatchers fixed pre-merge: `course-landing.astro`,
  `section-landing.astro`, `info-page.astro`. Class established by
  two virtual modules (`figures`, `course-spec`); defends the
  deferred ScheduleSchema virtual module in advance.
```

**Step 5: Verify (MyST not relevant for AGENTS.md; Biome only).**

```bash
cd /Users/anna/Teaching/sophie
pnpm exec biome check AGENTS.md 2>&1 | tail -5
```

**Step 6: Run R12 against the current codebase** (sanity check — should
already pass since all three dispatchers were fixed pre-merge):

```bash
grep -L "if (!.*throw" $(grep -lE 'from "virtual:sophie/' packages/astro/src/routes/*.astro 2>/dev/null) 2>/dev/null
# expect empty output
```

If non-empty, that's a real R12 violation hiding in the codebase — fix
in a separate commit (W3 — touch only what you must — does NOT cover
"happens to violate the new rule you just wrote"; the new rule's
existence is the touch).

**Step 7: Commit.**

```bash
git add AGENTS.md
git commit -m "docs(agents): R12 + Locked-decisions table amendments

R12 — Virtual-module type-narrowing at dispatcher entry. Every
.astro dispatcher importing from virtual:sophie/<name> opens with
if (!<name>) throw to narrow the T | null type and document the
integration-level invariant. Two virtual modules establish the class
(figures, course-spec); deferred ScheduleSchema is the predicted
third instance. Pre-merge grep gate included.

Locked-decisions table amendments:
- ADR 0061 row: 'validated by 8-file course-spec v0.2 split in PR
  #199' annotation.
- New row for ADR 0080 capturing v0.2 Amendment 2 in the most-cited
  surface.

Originating finding: course-info-projection sprint review C1."
```

---

### Commit 10 — Memory updates (local filesystem, NOT git)

**Files (all under `~/.claude/projects/-Users-anna-Teaching-sophie/memory/`):**
- Modify: `feedback_codebase_optimized_for_ai.md`
- Modify: `reference_course_website_roadmap.md`
- Create: `feedback_always_register_virtual_module.md`
- Create: `feedback_chrome_not_pedagogy_component_split.md`
- Create: `feedback_pedagogy_store_doctrine.md`
- Modify: `MEMORY.md` (add 3 new pointer lines)

**Why last + not git.** Memory files live OUTSIDE the Sophie repo; they
take effect immediately as filesystem writes. Doing them last means
the prior 9 commits are landed + verified before any new memory entry
references them.

**Step 1: Read existing memory files to match voice + frontmatter shape.**

```bash
cat ~/.claude/projects/-Users-anna-Teaching-sophie/memory/MEMORY.md
cat ~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_codebase_optimized_for_ai.md | head -20
cat ~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_review_rules_r6_r10.md | head -20  # standing-rules format precedent
```

**Step 2: Update `feedback_codebase_optimized_for_ai.md`.** Add a
"Validated 2026-05-26" line at the end of the body, before any
trailing links. Exact text:

> **Validated 2026-05-26 in course-info projection sprint** (PR #199):
> 8 new sibling-file schemas (`course-spec-v02-*.ts`) shipped at 20–91
> LOC each; main `course-spec.ts` grew 371 → 404 LOC (within
> 500-warn budget). AI-author navigation by filename worked
> end-to-end through 14 commits. Rule 1 + Rule 3 + filename routing
> all load-bearing. See `[[reference_course_website_roadmap]]` for
> sprint context.

**Step 3: Update `reference_course_website_roadmap.md`.** Add a status
marker near the top of the body (after the existing
"27 decisions settled 2026-05-21" line):

> **2026-05-26 status update**: Tier-2 course-website Phases 1–4
> shipped via PR #199 (course-info projection sprint, commit
> `4e0730e`). Validates the projection pattern (data + prose →
> layouts). Phase 5 (iCal + `schedule.yaml`) deferred per H6 to a
> follow-up sprint. Next milestone: ASTR 201 first real syllabus
> page authored end-to-end against v0.2 spec.

**Step 4: Create `feedback_always_register_virtual_module.md`.**

```markdown
---
name: always-register-virtual-module
description: Sophie virtual modules export T | null always — dispatcher consumers narrow at entry per R12; integration guards via injectRoute conditional
metadata:
  type: feedback
---

When wiring a new virtual module for `@sophie/astro`, always register
the plugin AND always export the full union (`T | null`), not
conditionally. Guard against `null` at dispatcher entry via R12's
type-narrowing throw, not via `if (spec) { register(...) }` at config-
setup.

**Why:** Review C1 of the course-info-projection sprint surfaced the
class. The conditional-registration shape (`if (spec)
courseSpecVirtualModule(spec)`) means consumer code that imports
`virtual:sophie/course-spec` breaks at build time when the consumer
lacks a `course.sophie.yaml`. The always-register shape with `null`
payload lets the import succeed; the consumer code narrows at use.
`JSON.stringify(null) → "null"` round-trips structurally through the
SSR-setter + script-tag store.

**How to apply:** When adding a new virtual module (the deferred
ScheduleSchema is the predicted third):

1. The plugin factory takes `T | null`, returns the plugin
   unconditionally.
2. The integration calls the factory unconditionally (no
   `if (spec)` wrap around the plugin push).
3. The integration conditionally calls `injectRoute` (this is where
   the guard lives — routes don't exist when the spec doesn't, but
   the virtual module always resolves).
4. Dispatcher routes consume the export via R12: `if (!value) throw`
   at frontmatter top.

See `[[feedback_review_rules_r6_r10]]` for related standing-rules
context (R12 is the dispatcher-side companion to this memory's
publisher-side rule). See `[[feedback_codebase_optimized_for_ai]]`
for the AI-codebase-shape framing.
```

**Step 5: Create `feedback_chrome_not_pedagogy_component_split.md`.**

```markdown
---
name: chrome-not-pedagogy-component-split
description: makeChromeComponents vs makeStaticComponents factory split structurally enforces ADR 0058 boundary — pedagogy primitives excluded from course-info prose fragments
metadata:
  type: feedback
---

`makeStaticComponents({ figures })` exposes the full chapter-component
set (including the 8 epistemic-role pedagogy primitives:
`<OMIFlow>`, `<WorkedExample>`, `<MultiRep>`, `<Intervention>`,
plus chrome subset). `makeChromeComponents({ figures })` exposes only
the chrome subset (`<Callout>`, `<GlossaryTerm>`, `<KeyEquation>`,
`<EquationRef>`, `<FigureRef>`, `<Aside>`) plus the 5
course-management chrome components (`<Due>`, `<Points>`,
`<Reading>`, `<OfficeHours>`, `<Week>`).

**Why:** Pedagogy primitives' meaning depends on chapter context (the
OMI flow, the worked example, the multi-rep, the intervention).
Course-info prose fragments are chrome — they describe course
metadata, not learning content. Allowing `<OMIFlow>` in a
syllabus-prose-fragment would create unresolvable cross-references
back to non-existent chapter context. Operationalizes ADR 0058's
eight-role contract into a code-level rule.

**How to apply:** When adding a new component:

- If it's a pedagogy primitive (carries an epistemic role per ADR
  0058), it goes in `makeStaticComponents` ONLY. Document the
  epistemic role in the component's `serialize` output.
- If it's chrome (no epistemic role; course-management metadata or
  general inline formatting), it goes in BOTH factories.
- When designing a new info-page-only component (rare),
  `makeChromeComponents` is the home. Do not propose a third factory
  unless ADR 0058 is amended.

The factories live in `@sophie/astro/src/components.tsx`. Cross-refer
to `[[project_authoring_model]]` for the AI-authoring boundary
implications (AI authors prose fragments under `makeChromeComponents`
constraints; chapter MDX uses the full set).
```

**Step 6: Create `feedback_pedagogy_store_doctrine.md`.**

```markdown
---
name: pedagogy-store-doctrine
description: Global cross-chapter stores in @sophie/components use SSR-setter + script-tag pattern; never import virtual:sophie/* (ERR_UNKNOWN_URL_SCHEME in bare Node)
metadata:
  type: feedback
---

Global stores in `@sophie/components` (definitions store,
figure-registry store, course-spec store, future student-profile
store) follow this pattern:

1. Store + setter live in `@sophie/components` (no `virtual:` import
   in this package).
2. The integration's `TextbookLayout.astro` (or equivalent shell)
   imports the spec value from `virtual:sophie/<name>` and calls the
   store's `__set<Name>` setter.
3. A `<script id="sophie-<name>">` block emits the value via
   `set:html={JSON.stringify(value)}` for client-side hydration.
4. Components consume the store via a public hook
   (`useCourseSpec()`, `useFigures()`, etc.).

**Why:** `@sophie/components` is framework-pure (ADR 0001) — it must
build and resolve in plain Node contexts (vitest, axe tests,
typecheck). Importing `virtual:sophie/<name>` from inside this
package crashes at module-load with `ERR_UNKNOWN_URL_SCHEME` outside
Vite. The SSR-setter pattern keeps the virtual-module dependency
inside `@sophie/astro` only. See `pedagogy-store.ts:14-22` for the
canonical doctrine comment that this memory codifies.

**How to apply:** When adding a new global store:

- Store + setter file in `@sophie/components/src/runtime/`.
- Setter exported with `__set` prefix (existing convention).
- Hook + `__reset<Name>ForTesting` exported from `runtime/index.ts`
  unless the reset is intentionally internal.
- `TextbookLayout.astro` (or relevant layout) imports
  `virtual:sophie/<name>` and calls the setter.
- Use `set:html={JSON.stringify(value)}` for the hydration script
  (always emits a value — `"null"` for absent state — so the store's
  `didSet=true` path is reachable).

Three instances exist 2026-05-26: `definitions-store`,
`figure-registry-store`, `course-spec-store`. The pattern is now
canonical Sophie convention. See `[[always-register-virtual-module]]`
for the publisher-side memory.
```

**Step 7: Update `MEMORY.md`** to index the 3 new entries. Add these
lines in semantically-appropriate positions (alphabetical within
the type or following the existing implicit ordering):

```markdown
- [Always-register virtual-module pattern](feedback_always_register_virtual_module.md) — Sophie virtual modules export T | null always; dispatcher narrows at entry per R12; companion to publisher-side guard logic
- [Chrome ≠ pedagogy via component-set split](feedback_chrome_not_pedagogy_component_split.md) — makeChromeComponents vs makeStaticComponents factory split operationalizes ADR 0058 boundary at code level
- [Pedagogy-store doctrine](feedback_pedagogy_store_doctrine.md) — global stores in @sophie/components use SSR-setter + script-tag; never import virtual:sophie/* (3 instances: definitions, figures, course-spec)
```

**Step 8: Verify `MEMORY.md` stays under 200 lines** (the index has a
truncation cliff at line 200 per AGENTS.md's auto-memory section):

```bash
wc -l ~/.claude/projects/-Users-anna-Teaching-sophie/memory/MEMORY.md
```

If approaching 200, propose trimming an older entry — but DO NOT trim
in this session without Anna's approval; surface as a follow-up.

**No git commit.** These are local filesystem writes. They take
effect immediately on save.

---

### Final R6 closure gate (run after all 10 commits)

```bash
cd /Users/anna/Teaching/sophie
grep -rE "#L[0-9]+" docs/website/ --include="*.md"  # expect 0 hits
```

Any hit = a cross-reference accidentally used GitHub line-anchor
syntax. Fix in a follow-up commit before declaring the audit done.

### Final MyST + Biome gates (full repo)

```bash
cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"  # 0
cd .. && pnpm exec biome check 2>&1 | tee /tmp/biome-final.log
grep -E "(error|warning)" /tmp/biome-final.log  # expect no output
```

---

### End-of-session report (Phase D closure)

When Phase D completes, produce this report (paste into the working
session):

- **Commits landed (9 git + 1 memory op):**
  1. ADR 0080 Amendment 2 + validation.md regen
  2. ADR cross-refs (0082, 0058, 0061, 0004, 0030)
  3. ADR should-update cross-refs (0023, 0067, 0003)
  4. chapter-components.md chrome subsection
  5. NEW reference/course-info-schema.md + MyST TOC
  6. positioning.md differentiator row
  7. status/roadmap.md update
  8. design doc post-impl amendments appendix
  9. AGENTS.md R12 + table amendments
  10. (local) memory updates: 2 modified + 3 created + MEMORY.md index

- **ADRs amended:** 0080 (Amendment 2 + status block); cross-refs on
  0003, 0004, 0023, 0030, 0058, 0061, 0067, 0082
- **Reference docs added:** `course-info-schema.md`
- **AGENTS.md changes:** R12 standing rule; Locked-decisions table
  rows for 0061 (amended) + 0080 (new or amended)
- **Memory updates:** 2 modified + 3 created + index updated
- **Outstanding follow-ups:** ScheduleSchema virtual-module ADR
  (deferred sprint); positioning elevator update (deferred until
  second course validates multi-course claim)

---

## Phase D — Execute via superpowers:executing-plans

*Not started. Awaits Anna's `ExitPlanMode` approval. Will use
`superpowers:executing-plans` for commit-by-commit landing on `main`
per `feedback_branch_pr_scope`.*
