# Wedge B-followup W4c — Library shell + 3 OMIFlow rooms + 8 Spec routes + PRA-2 + audit cleanup — Design

**Status:** Brainstorm complete (9 design questions answered
2026-05-23). Audit findings from
[2026-05-23-post-w4b-audit.md](../reviews/2026-05-23-post-w4b-audit.md)
inlined as Batch 0. Ready for engineer-plan authoring +
ExitPlanMode-equivalent Anna confirm.

**Branch base:** `feat/wedge-b-followup-w4c` tracking
`origin/main` at `e128316` (W4b squash-merge, 2026-05-23).

**Worktree:** `/Users/anna/Teaching/sophie/.worktrees/wedge-b-followup-w4c/`.

---

## 1. Goal & context

**Goal.** Close Wedge B-followup by:

1. Filling the remaining Library room chrome — extract a hybrid
   `<LibraryCollectionShell>` and refactor 5 existing CourseX
   components into it (CourseObjectives stays outside; structural
   exception, see D1 below).
2. Adding 3 new CourseX siblings (`CourseObservables`,
   `CourseModels`, `CourseInferences`) rolling up OMIFlowEntry
   slot data per ADR 0058's eight-role contract.
3. Adding 8 per-entry Spec routes (5 W4a-era — Equations,
   Misconceptions, Glossary, Figures, KeyInsights — + 3 new from
   OMIFlow; Topic Spec gains card-body render per W4b R+CR N5).
4. Updating the Library hub at `/library/index.astro` to surface
   all 9 rooms with counts.
5. Graduating PRA-2 to honor `audit_overrides` per ADR 0053
   (mirror PRA-1 W4b shape).
6. Closing the pre-W4c audit's actionable findings as Batch 0
   (R6 anchor fixes, R9 NavChapter import refactor + doctrine
   codification, R7 comment fixes, A1-X1 smoke runbook,
   AGENTS.md ADR count).

After W4c lands, **Wedge B-followup closes.** Next milestone is
the ADR-0064 chapter pilot in `astr201-sp26/` — curriculum-side
work, separate session.

**Why now.** W4b shipped the topic-registry + bridge-room +
SkillReview-resolver stack. W4c fills the missing Library chrome
so the platform's Library-room story is end-to-end complete. Per
the W4 meta-plan Q4a/Q4b locks (2026-05-22), this is the planned
final sub-wedge. The audit cleanup folded in addresses Anna's
"clean, well-designed state including implementing minor fixes so
that they don't grow into issues" directive (2026-05-23).

**Audit baseline (per A1):** all gates PASS on
`origin/main` `e128316` — biome 0/0 (715 files), typecheck OK,
unit suite 4/4 tasks, smoke build 16 pages, MyST clean, e2e
157 passed / 5 skipped / 0 failed. W4c starts from a
known-green baseline.

**Roadmap cross-check (per A7 mandatory Phase C step):** no
blockers from the 27-decision course-website roadmap. Three
forward-compat constraints surface (applied in D8 below).

---

## 2. Locked design decisions (this brainstorm session)

### D1 — CourseObjectives stays outside the shell

CourseObjectives uses a 3-level Module→Chapter→Objectives
grouping with `<section>`/`<article>`/`<ul>` markup, structurally
distinct from the flat-list `<dl>`/`<ol>` of the other 5 Course\*
components. **Decision:** shell stays YAGNI-clean (one shape: flat
list + chrome). CourseObjectives keeps its current shape;
exception documented in shell docstring + ADR 0070 revision-history
("rollups with multi-level grouping are out of v1 shell scope;
revisit when a second grouped consumer emerges").

**Reason:** generalizing the shell to support both flat and
grouped consumers would push structural responsibility back into
each consumer, defeating the shell-extraction motivation. W2
(minimum code) wins; SoTA shape preserved by documenting the
exception explicitly.

### D2 — Shell API: hybrid (text props + slots)

```astro
<LibraryCollectionShell
  collection="glossary"             {/* drives data-* + BEM root + breadcrumb label */}
  heading="Glossary"
  emptyText="No definitions yet."
  isEmpty={sorted.length === 0}
>
  <slot name="intro" />             {/* optional rich content */}
  <slot />                          {/* default: <dl>/<ol> content */}
  <slot name="secondary-nav" />     {/* optional rich content */}
</LibraryCollectionShell>
```

Shell renders `<main class="sophie-library-collection
sophie-library-collection--glossary"
data-sophie-library-collection="glossary">` outer landmark with
proper aria. Each consumer's existing BEM (`sophie-course-X`)
nests inside the default slot. Idiomatic Astro pattern (text
props for primitives, named slots for composition).

**Reason:** mirrors Astro's `<Layout>` idiomatic shape; avoids
forcing a uniform entry shape onto consumers that diverge
(Figures' two-tier registry/usage, Glossary's term lookup, etc.).

### D3 — Spec page content: rich-where-data-exists, defer-Tier-2

For each entry type, render every field the schema already
carries; defer fields that need new Tier-2 infrastructure.

| Spec route | Renders | Defers |
|---|---|---|
| Equations `/library/equations/<id>/` | title, KeyEquation LaTeX (via existing renderer), epistemic role (per ADR 0058), `<BiographyRender>` (assumptions, validity, common misuse, units per ADR 0046), back-link to introducing Unit, citations cross-refs | MultiRep links, related-equations graph, practice-problem cross-refs, FSRS RetrievalPrompt slot |
| Topics `/library/topics/<id>/` | title, summary, prereqs, **card list with Prompt/Answer body rendered inline** (fixes W4b R+CR N5), linked-equation/-misconception cross-refs | Per-card Spec routes; FSRS-based card-adaptive selection |
| Misconceptions `/library/misconceptions/<slug>/` | body, length variant, linked interventions, back-link, chapter-surfacing cross-refs | Misconception-graph viz; intervention cross-collection links |
| Glossary `/library/glossary/<slug>/` | term, body, back-link to defining Unit, usage cross-refs | — |
| Figures `/library/figures/<name>/` | caption, image, back-link to canonical Unit, all usage sites | — |
| KeyInsights `/library/key-insights/<slug>/` | title (or anchor fallback), body, back-link | — |
| Observables `/library/observables/<slug>/` | title, body (from OMIFlowEntry.observable slot), back-link to parent Unit + anchor | — |
| Models `/library/models/<slug>/` | same shape | — |
| Inferences `/library/inferences/<slug>/` | same shape | — |

**Reason:** "render what the schema already carries; defer what
needs new infrastructure" is the SoTA-but-W2 sweet spot. Reuses
existing `<BiographyRender>` (ADR 0046). Tier 2 follow-on PR
knows exactly what to add.

### D4 — KeyInsights Spec URL slug

Extend `KeyInsightEntry` schema with a derived `slug: Slug` field:

```typescript
// at extraction time:
slug: title ? slugify(title) : `${unit}-${anchor}`
```

URL: `/library/key-insights/<slug>/`. Add audit invariant
`KI-slug-unique` (sibling to existing key-insights invariants)
catching collisions.

**Reason:** consistency with the other 8 Spec rooms (every entry
gets a Spec URL) wins over title-required-only or
per-unit-grouped alternatives. Unit-prefix fallback is
deterministic; audit catches collisions.

### D5 — PRA-2 honors `audit_overrides`

Extend `TopicEntry` schema:

```typescript
audit_overrides: z.array(AuditOverrideSchema).optional()
```

Consumer-side fallback to `?? []` per W4b Surprise #2 lesson.
Both PRA-2 emission paths (extractor `extractTopicAndCards` for
body→frontmatter orphans; audit `checkPRA2` for
frontmatter→body orphans) check overrides before emitting.

Override anchor convention: **the card id** (the orphan card
whose frontmatter↔body mismatch triggers the finding). Mandatory
`tdr:` field per ADR 0053 CF2. No whole-topic wildcard —
suppressing all PRA-2 on a topic would invite drift.

PRA-2 stays ERROR (no severity downgrade). ADR 0079
revision-history entry + audit-baseline.md update document the
graduation.

**Reason:** mirrors PRA-1 W4b shape exactly. Same family, same
ADR, same pattern.

### D6 — Axe-core test colocation: per-component `.axe.test.ts` sibling

Each component gets its own sibling file
(`CourseGlossary.astro` → `CourseGlossary.axe.test.ts`). Test
renders via Astro's Container API against a fixture pedagogy
index, pipes output through `axe-core`, asserts zero violations.
Spec routes get siblings under
`examples/smoke/src/pages/library/<X>/[slug].axe.test.ts`
(or co-located `__tests__/` dir per existing convention).

~18 new test files; AI-template-authored from a single template
(likely from existing `admonition-plugin.axe.test.ts` precedent).

**Reason:** matches existing axe-test precedent + ADR 0061
filename-routing + ADR 0004 axe-mandatory. Failures map directly
to component file paths.

### D7 — R6–R9 doctrine codified in AGENTS.md + memory

Add a new "Standing PR-review rules (R6–R9)" subsection under
AGENTS.md's "Discipline (multi-line)" section. Each rule gets:

- One-line statement
- Originating finding (W4b R+CR C1/C2/C3/I1; A2 audit refinement)
- How to apply at review time

R9 split:

- **R9-production** (hard rule): every named interface has
  exactly one declaration in production source (`src/**/*.ts`
  excluding tests). Pre-merge grep gate.
- **R9-test** (preference + escape): test files prefer importing
  the canonical type over redeclaring; redeclare only when
  isolation is deliberate AND documented in a sibling comment.

Update `feedback_review_rules_r6_r9.md` memory to point at
AGENTS.md as canonical home + retain W4b R+CR origin story.

**Reason:** AGENTS.md is the discoverable home for PR-review
conventions; memory holds origin context. Mirrors the existing
"Anna's saved feedback preference" cross-reference pattern.

### D8 — Forward-compat data attributes: minimal set

Every Course\* list entry (and every Spec page back-link) emits:

```html
<dt data-section="<section-id>" data-unit="<unit>" data-anchor="<anchor>">...</dt>
```

Three attributes only. `data-epistemic-role` and `data-topic`
deferred — ADR 0058 §3 keeps role-tagging opportunistic; topic
tags don't have a stable cross-collection shape yet.

**Reason:** these three are already implicit in the markup
(backlinks encode them); promoting to data attrs is no-cost
forward-compat. Tier 2 filter UI knows exactly what to layer.

### D9 — Batch ordering: cleanup-first → schema → shell → consumers → Spec → docs

13 batches (see §4 Implementation strategy). Cleanup before
features establishes clean baseline. Schema before consumers.
Shell before consumers that use it. Spec routes after consumers
prove the pattern. Smoke fixture extension after the surfaces
they exercise. Docs sweep before pre-PR gates.

---

## 3. Phase-1 touchpoint enumeration

Applies W3 R1 (grep multi-pattern), W4a R4 (`docs/website/` in
Phase-1 scope), R6–R9 standing checklist.

### 3.1 `@sophie/core` schema changes

- `packages/core/src/schema/pedagogy-index-entries/key-insight.ts`
  — add `slug: Slug` field; extraction-time derived.
- `packages/core/src/schema/pedagogy-index-entries/topic.ts` —
  add `audit_overrides: z.array(AuditOverrideSchema).optional()`
  (mirrors `UnitEntry` shape).

### 3.2 `@sophie/astro` extractors

- `packages/astro/src/lib/pedagogy-index/extractors/key-insights.ts`
  — populate the new `slug` field from `title ?? unit+anchor`.
- `packages/astro/src/lib/pedagogy-index/extractors/topic.ts` —
  read `audit_overrides`; check before emitting PRA-2
  body→frontmatter findings.

### 3.3 `@sophie/astro` audit

- `packages/astro/src/lib/pedagogy-audit/invariants/key-insights.ts`
  — add `KI-slug-unique` invariant.
- `packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.ts`
  — read TopicEntry `audit_overrides`; check before emitting
  PRA-2 frontmatter→body findings.

### 3.4 `@sophie/astro` components

- New: `packages/astro/src/components/LibraryCollectionShell.astro`
  + `.axe.test.ts`.
- Refactor: `CourseGlossary.astro`, `CourseKeyInsights.astro`,
  `CourseEquations.astro`, `CourseMisconceptions.astro`,
  `CourseFigures.astro` to wrap content in shell + emit
  `data-section`/`data-unit`/`data-anchor` per entry; add
  sibling `.axe.test.ts`.
- New: `CourseObservables.astro`, `CourseModels.astro`,
  `CourseInferences.astro` from OMIFlow rollup template +
  sibling `.axe.test.ts`.
- Untouched: `CourseObjectives.astro` (D1 exception).

### 3.5 Astro routes — Spec pages

- New: `examples/smoke/src/pages/library/equations/[id].astro`
  (uses `<BiographyRender>`).
- New: `examples/smoke/src/pages/library/misconceptions/[slug].astro`.
- New: `examples/smoke/src/pages/library/glossary/[slug].astro`.
- New: `examples/smoke/src/pages/library/figures/[name].astro`.
- New: `examples/smoke/src/pages/library/key-insights/[slug].astro`.
- New: `examples/smoke/src/pages/library/observables/[slug].astro`,
  `library/models/[slug].astro`, `library/inferences/[slug].astro`.
- Modify: `examples/smoke/src/pages/library/topics/[topicId].astro`
  — render card body inline (N5 fix).
- Modify: `examples/smoke/src/pages/library/index.astro` — surface
  9 rooms with counts.

Each new Spec route gets a sibling `.axe.test.ts`.

### 3.6 Smoke fixture extension

- Author OMIFlow fixture entries sufficient to populate the 3 new
  rollup rooms (probably 1 OMIFlow in an existing reading.mdx).
- Author a KeyInsight WITHOUT title (exercises the slug fallback +
  KI-slug-unique audit).
- Author a deliberate PRA-2 fixture with `audit_overrides` entry
  (exercises new honoring path; mirrors W4b PRA-1 test
  fixture).

### 3.7 Audit cleanup (Batch 0)

- `docs/website/decisions/0004-component-contract-revisions.md:169`
  — fix `#L36-L53` anchor.
- `docs/website/reference/component-contract.md:424` — fix same
  anchor.
- `packages/astro/src/components/ModuleNav.astro:17,25` — import
  `NavChapter`, `NavModule` from `../lib/module-nav-helpers.ts`;
  drop local declarations.
- `AGENTS.md` — add "Standing PR-review rules (R6–R9)" subsection
  under Discipline; update ADR count from "77 ADRs, 0001–0078"
  to "78 ADRs, 0001–0079".
- `~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_review_rules_r6_r9.md`
  — refine R9 entry with production-strict + test-flexible split;
  point at AGENTS.md as canonical.
- `packages/astro/src/lib/pedagogy-index/extractors/topic.ts:51`
  — add disposition comment OR push extractor finding (TBD in
  Batch 0 task scoping).
- `packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts:56`
  — fix disposition comment to accurately describe what
  D4/E4/F2/C1 catch.
- (Standing runbook fix, captured in Batch 10 docs sweep) —
  smoke-build gate command: `@sophie/astro-smoke` →
  `--filter=smoke`.

### 3.8 Docs (per `feedback_docs_no_drift`)

- `AGENTS.md` — R6–R9 subsection + ADR count.
- `docs/website/decisions/0058-epistemic-component-contract.md`
  — revision-history entry: Observable/Model/Inference rollup
  chrome shipped (W4c); Assumption/Approximation/Numerical
  deferred per ADR 0058 §4 composite contract.
- `docs/website/decisions/0070-library-room-and-registry-spec-pages.md`
  — revision-history entry: shell-extraction + 3 new rooms + 8
  Spec routes + KI-slug-unique + CourseObjectives exception.
- `docs/website/decisions/0079-topic-registry-and-resolution-pattern.md`
  — revision-history entry: PRA-2 graduation to honor
  `audit_overrides`; Topic Spec page renders card body inline.
- `docs/website/reference/chapter-components.md` — Library
  section update (9 rooms, Spec page references).
- `docs/website/reference/audit-baseline.md` — PRA-2 graduation
  row update + new `KI-slug-unique` row.
- `docs/website/status/validation.md` — regenerate if any ADR
  validation block touched.

### 3.9 E2E tests

- New e2e specs for at least: Library hub (9 rooms appear with
  counts); one Spec page per registry type (smoke verify URL
  exists + body renders); KeyInsights Spec page with derived
  slug fallback case.
- Bridge-route + Topic Spec specs from W4b remain green.

---

## 4. Implementation strategy

### 4.1 Batch sequence (13 batches; see plan file for tasks)

| # | Batch | Files affected |
|---|---|---|
| 0 | Audit cleanup | ~6 files (docs + components + memory + AGENTS.md) |
| 1 | Schema extensions (TDD) | 2 schema files + 2 test files |
| 2 | Audit invariants (TDD) | 2 invariant files + 2 test files + extractor updates |
| 3 | Shell extraction (TDD) | 1 new component + 1 axe test |
| 4 | 5 Course\* refactor | 5 components + 5 axe tests + 1 docstring update on CourseObjectives |
| 5 | 3 new CourseX | 3 components + 3 axe tests |
| 6 | Library hub update | 1 route file |
| 7 | 5 W4a-era Spec routes | 5 routes + 5 axe tests |
| 8 | 3 OMIFlow Spec routes + Topic N5 | 3 routes + 3 axe tests + 1 route modification |
| 9 | Smoke fixture extension | ~4 fixture files (OMIFlow + KI-untitled + PRA-2-override) |
| 10 | Docs sweep | ~7 doc files (AGENTS.md + 3 ADRs + 2 references + validation.md regen) |
| 11 | Pre-PR gates | (no file changes; gates only) |
| 12 | R+CR follow-up | TBD per `superpowers:requesting-code-review` output |

### 4.2 Discipline

- TDD red/green/commit per task. Tests written first.
- Biome zero-warning per `feedback_biome_verification` — grep
  full output, not tail-only.
- Apply R6–R9 review rules continuously during implementation
  (now that they're codified in AGENTS.md per D7).
- W3 doctrine R1 (Phase-1 enumeration with multi-pattern grep)
  during each batch's task discovery.
- HITL: report after each batch; wait for Anna confirm.
- Side-effects (git push, gh pr create, merge) require
  explicit per-occurrence text confirm per
  `feedback_no_questions_mode_scope`.
- Squash-merge per ADR 0055.
- W4 success criteria (`AGENTS.md` W4): define done per batch;
  loop until verified.

### 4.3 Pre-PR gates (Batch 11)

Per `feedback_pre_pr_lockfile_check` + W3 surprise #6 + W3
surprise #5 + `project_local_dev_pagefind_e2e_pitfall`:

```bash
pnpm install --frozen-lockfile
pnpm exec biome check 2>&1 | grep -cE "(error|warning)"  # expect 0
pnpm turbo run typecheck --force
pnpm turbo run test --filter='@sophie/*' --force
pnpm --filter smoke build                     # (note: NOT @sophie/astro-smoke)
cd docs/website && npx mystmd build --html
pkill -f "astro preview" 2>/dev/null; sleep 1
pnpm exec playwright test                     # from worktree ROOT
```

Expected after W4c lands:
- `@sophie/core`: 473 + KI-slug + KI-slug-unique tests
- `@sophie/astro`: 832 + W4c-specific tests (shell axe, 9 Course\*
  axe, 8 Spec axe, PRA-2 override, KI-slug-unique audit, smoke
  fixture variants)
- e2e: 157 baseline + new Spec-page + Library-hub specs

### 4.4 R+CR (Batch 12)

`superpowers:requesting-code-review` subagent before PR open.
Address Critical + Important findings BEFORE the docs sweep
re-runs and PR opens. Critical → Important fixes get their own
fix commits; Minors documented in pilot report disposition table.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Shell extraction couples 5 components tighter than expected | TDD axe tests on shell first; refactor consumers one at a time with axe re-run between each |
| OMIFlow rollups lack visual differentiation (3 rooms look identical) | Per-room data-attribute + BEM modifier (`--observable`, `--model`, `--inference`) so consumer-app stylesheet can theme distinctly; v1 ships uniform shape, theme follows |
| KI-slug collisions break the build (e.g., two KeyInsights with same title) | KI-slug-unique audit catches at extraction time with curated error message naming the colliding entries |
| PRA-2 override anchor convention is too granular (per-card) | Wildcard whole-topic anchor is intentionally NOT supported per D5; if authoring friction emerges, revisit in a follow-on PR |
| Spec page templates duplicate too much | Hybrid shell + template re-use; if duplication is >50% across templates, extract Phase-D-internal helper (don't pre-extract) |
| Batch 0 audit cleanup churns the diff against later batches | Cleanup is small (~6 files) and orthogonal to W4c surface; isolated commits keep diffs readable |
| The 3 deferred Library rooms (Assumption / Approximation / Numerical) become silent gaps | Library hub renders only the 9 active rooms; deferred rooms documented in ADR 0058 §4 with a trigger (role-tagging extension OR new entry type) |
| AGENTS.md update conflicts with concurrent edits | AGENTS.md change is scoped to one subsection added in Batch 0; rebase-friendly |

---

## 6. References

- [W4 meta-plan (Q4a / Q4b)](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md)
  — locked the W4c scope at 2026-05-22
- [W4b pilot report](../website/pilots/wedge-b-followup-w4b-affordances.md)
  — predecessor sub-wedge; N5 + R+CR findings folded into W4c
- [2026-05-23 post-W4b audit](../reviews/2026-05-23-post-w4b-audit.md)
  — Phase A findings; Batch 0 inlined
- [ADR 0058](../website/decisions/0058-epistemic-component-contract.md)
  — eight-role taxonomy underwrites OMIFlow rollup rooms
- [ADR 0070](../website/decisions/0070-library-room-and-registry-spec-pages.md)
  — Library URL convention + Spec-page contract
- [ADR 0079](../website/decisions/0079-topic-registry-and-resolution-pattern.md)
  — Topic registry + PRA-2 graduation home
- [ADR 0046](../website/decisions/0046-equation-biography.md) —
  `<BiographyRender>` consumed by Equation Spec page
- [ADR 0053](../website/decisions/0053-conformance-failure-modes.md)
  — `audit_overrides` three-grain contract
- [Reasoning OS course-website roadmap](../../../.claude/plans/we-need-to-continue-lazy-ripple.md)
  — Tier 2 PDF export + filter UI = forward-compat constraints
  D8 applies
- Engineer plan: see
  [2026-05-23-wedge-b-followup-w4c.md](./2026-05-23-wedge-b-followup-w4c.md)
  for batched task breakdown
