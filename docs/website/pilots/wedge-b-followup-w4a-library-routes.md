---
title: 'Pilot report: Wedge B-followup W4a — Library room route migration + hub'
short_title: 'Pilot: W4a Library routes'
description: 'W4a platform self-migration pilot — hard-renaming 6 course-level rollup routes from bare paths to /library/<X>/ under the ADR 0070 Library room hierarchy; adding a Library hub at /library/index.astro. Shape α — platform self-migration framing per ADR 0064 §4.'
authors:
  - name: Anna Rosen
date: 2026-05-23
---

## Pilot context

**What this pilot migrated.** Six existing course-level rollup
routes in the Sophie smoke target moved from their bare-path
locations (`/glossary`, `/equations`, `/figures`,
`/misconceptions`, `/key-insights`, `/objectives`) to their
`/library/<X>/` equivalents under ADR 0070's Library room
hierarchy. A new Library hub page at `/library/index.astro`
lists the 6 rooms. No new components shipped; no schema
changes; no audit changes; no `astro.config.mjs` redirects.
Purely a URL-string rename + a new index page.

**Why now.** W4a is the first of three sub-wedges closing
Wedge B-followup W4 (per the W4 meta-plan at
`~/.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md`).
W4 splits into:

- **W4a** (this pilot) — mechanical route migration + Library hub.
- **W4b** — net-new affordances (topic-registry, bridge rooms,
  `<SkillReview>` self-closing resolver, PRA-1 graduation).
- **W4c** — missing CourseX chrome (Observables, Models,
  Inferences from OMIFlowEntry slot data) + per-entry Spec pages
  + shared `<LibraryCollectionShell>` extraction.

W4a is the smallest and most mechanical of the three — it
exercises the W3 doctrine on a focused URL-string-rename
surface while clearing the route namespace for W4b/W4c's
net-new affordances to land cleanly. Pre-launch posture
(`feedback_no_backcompat_prelaunch`): zero production
students; hard-rename with no 301 redirects, no shim routes;
every consumer migrates in this PR.

**Per ADR 0064 §4 — structural-density-diversity criterion.**
This pilot is a **platform self-migration**, not a consumer-
chapter migration. The synthetic smoke fixture changes are
purely route paths — 6 file renames + 1 new hub + ~30 line
edits across docs/website/ + JSDoc. The structural-density
profile differs from M2-L3 (the ADR 0064 reference pilot,
which was reading-MDX-heavy with OMIFlow + biography), from
W2 (file-layout migration), and from W3 (per-callsite schema
rename). W4a's profile is pure URL-string + co-located
documentation drift — a thin slice of the platform-migration
spectrum that gives us a calibration data point.

**What's explicitly out of scope.** W4b's topic-registry +
bridge rooms + SkillReview self-closing resolver + PRA-1
graduation (separate sub-wedge); W4c's missing CourseX
chrome + per-entry Spec pages + shell extraction (separate
sub-wedge); historical `docs/plans/2026-05-1X-*.md` and
`docs/reviews/2026-05-15-*.md` files (intentionally not
updated per `feedback_docs_no_drift` historical-record
policy).

## Shortcode → component dictionary

W4a touched no components. The 6 existing course-level rollup
components (`<CourseGlossary>`, `<CourseEquations>`,
`<CourseFigures>`, `<CourseMisconceptions>`,
`<CourseKeyInsights>`, `<CourseObjectives>`) all kept their
implementation unchanged. Only their `pages/<X>.astro` host
file location moved — to `pages/library/<X>.astro` — and the
6 host files updated their relative `../content/figures`
import to `../../content/figures` to account for the
one-directory-deeper path.

## Migration touchpoint inventory

### Layer 1 — Route files (6 file renames + 1 new file)

| Old path | New path |
|---|---|
| `examples/smoke/src/pages/glossary.astro` | `examples/smoke/src/pages/library/glossary.astro` |
| `examples/smoke/src/pages/equations.astro` | `examples/smoke/src/pages/library/equations.astro` |
| `examples/smoke/src/pages/figures.astro` | `examples/smoke/src/pages/library/figures.astro` |
| `examples/smoke/src/pages/misconceptions.astro` | `examples/smoke/src/pages/library/misconceptions.astro` |
| `examples/smoke/src/pages/key-insights.astro` | `examples/smoke/src/pages/library/key-insights.astro` |
| `examples/smoke/src/pages/objectives.astro` | `examples/smoke/src/pages/library/objectives.astro` |
| (new) | `examples/smoke/src/pages/library/index.astro` |

All 6 moves used `git mv` to preserve file history. The hub
page (Library landing) lists the 6 rooms with title +
1-line description + link.

### Layer 2 — E2e specs (7 files, ~27 line edits)

- 6 const declarations (`GLOSSARY_URL`, `EQUATIONS_URL`,
  etc.) at line 4 of each `course-<X>.spec.ts` + `objectives.spec.ts`.
- 6 `test.describe` titles updated to reference `/library/<X>`.
- 7 `test()` names referencing axe-clean `/<X>` paths +
  chapter-routes-stay-separate.
- 2 JSDoc/inline comment references (`objectives.spec.ts`
  header + `chapter-misconceptions.spec.ts:57` cross-context
  comment).

Spec file `equation-ref.spec.ts` was deliberately untouched
— it tests `/equations/<id>` detail routes (W4c territory).

### Layer 3 — Live docs in `docs/website/` (10 files)

Initial design doc enumerated 5 sites in `chapter-components.md`
+ 1 in ADR 0038 + 6 JSDoc/comment refs in component code (10
sites). Pre-PR code review caught 9 additional stale references
in active prose:

- `docs/website/decisions/0038-pedagogy-index-pattern.md:195`
- `docs/website/how-to/author-equation-biographies.md:35,147`
- `docs/website/reference/equation-biography-schema.md:231,265,272,282`
- `docs/website/vision/design/registry-ecosystem.md:81-82`
- `docs/website/vision/features/accepted.md:227,229`
- `docs/website/status/roadmap.md:93`
- `docs/website/status/course-website-roadmap.md:250-257,564,1224-1225`

Plus the **ADR 0070 amendment** (the canonical Library ADR)
adding a revision-history entry locking `/library/<X>/` as
the URL convention going forward + slug-alignment rationale
(`/library/key-insights/` matches `KeyInsightEntry` rather
than ADR 0070's original `/insights/` shorthand).

### Layer 4 — Component JSDoc + ADR 0038 example (8 sites)

- `packages/astro/src/components/TextbookLayout.astro:252`
- `packages/astro/src/components/BiographyRender.astro:17`
- `packages/components/src/components/Objective/Objective.{tsx:13,schema.ts:12,stories.tsx:16}`
- `packages/components/src/components/Objective/objectives-store.ts:10`
- `packages/components/src/components/LearningObjectives/LearningObjectives.tsx:44`
- `docs/website/decisions/0038-pedagogy-index-pattern.md:504` (inline file-path example).

### Layer 5 — Smoke index landing affordance (R+CR I1)

`examples/smoke/src/pages/index.astro` gained an `<h2>Library</h2>`
section linking to `/library/`. Closes the discoverability gap
flagged by the R+CR — without it, the Library hub was only
reachable by typing the URL.

### Layer 6 — Counter-pass clean

Final `rg -n` of source code (packages/ + examples/smoke/src
+ examples/smoke/e2e) for bare-path string literals, backtick
references, and "on /X" comment patterns returned **zero
hits**. Detail routes `/equations/<id>` are preserved
intact in 5 callsites (W4c territory). Asset paths
`/figures/<X>.png` are preserved (27 references in
`src/content/figures.ts`). MyST docs glossary URL in
`docs/website/status/validation.md` is orthogonal
(docs-site, not smoke-app route).

## Estimates vs. actuals

| Phase | Pre-flight estimate | Actual |
|---|---|---|
| Phase-1 surface (initial Explore agent) | 11 line edits + 5 file renames | 11 ✓ (undercounted Objectives + JSDoc refs) |
| Phase-1 surface (second-pass grep) | ~30 atomic edits / ~15 files | ~30 ✓ (matched) |
| Post-R+CR surface (after live-doc sweep) | n/a | ~50 atomic edits / ~22 files (R+CR added 9 doc + I1 + I2 + I3 + M1 + M4) |
| PR commits | 4–5 commits | 5 commits (design+plan, file moves, e2e, docs, ADR-amendment) |
| Time to pre-PR R+CR-clean | ~2 hours | ~3 hours (R+CR caught critical ADR conflict; +1hr amendment + drift sweep) |

The pre-flight estimate of 80–100 sites in the W4a meta-plan
was overcounted (URL-string renames are tighter than W3's
field-name renames). The second-pass grep estimate of ~30
matched the implementation surface; the R+CR added ~20 more
(ADR 0070 amendment + 9 stale doc refs + smoke-index link +
4 polish items).

## W3 doctrine review

### R1 — Phase-1 multi-pattern enumeration ✓

The initial Explore-agent search found 11 line edits + 5 file
renames using URL-literal patterns. The second-pass direct
grep added:

- `/objectives` as a 6th rollup route (Explore agent worked
  from the W4 meta-plan's 5-route scope).
- 7+ JSDoc/comment references in component code that
  describe runtime route behavior.
- 1 ADR 0038 inline example.

The R+CR added another ~9 live-doc references that even the
second-pass grep missed because the grep was scoped to
`packages/` and `examples/smoke/`; live `docs/website/`
prose references weren't in that scope. **Doctrine
refinement R4 (proposed below) extends R1's scope to
`docs/website/`.**

### R2 — Regex + structural disambiguator ✓

Bulk grep + Edit pattern distinguished URL-context occurrences
(`"/glossary"`, `href="/glossary"`, `` `/glossary` ``) from
prose-context (chapter content discussing "the glossary") and
from asset-path-context (`"/figures/foo.png"`). Zero
over-application — `/figures/<X>.png` asset paths in
`src/content/figures.ts` (27 references) and
`/equations/<id>` detail routes (W4c territory; 5 callsites)
were correctly preserved.

The structural-disambiguator pattern was less load-bearing
than in W3 — URL strings have less ambiguous local context
than schema-field names. The doctrine still applies but with
lower stakes for this category of rename.

### R3 — JSX value-expression caveat — N/A here

URL renames are pure attribute-value string substitution. No
`prop={var}` patterns where LHS rename without RHS rename
would produce undefined-binding bugs.

## Surprises

### Surprise #1: `/objectives` as a 6th rollup the W4 meta-plan missed

The initial W4 meta-plan brainstorm Q1 scoped W4a's rename
target to 5 routes (`/glossary`, `/equations`, `/figures`,
`/misconceptions`, `/key-insights`). The actual smoke
target also has `/objectives` (LO course rollup, PR-C4),
which is structurally a 6th sibling. Second-pass grep
caught this; the design doc was updated mid-Phase-1 to
include it.

**Lesson.** Phase-1 enumeration must include a direct
filesystem-walk of the route-host directory
(`examples/smoke/src/pages/`), not just rely on the wedge's
named-rename target list. The meta-plan brainstorm worked
from "what does ADR 0070 list as rooms" — but the actual
implementation surface differed from that list.

### Surprise #2 (CRITICAL): ADR 0070 conflict caught by R+CR

The W4 meta-plan brainstorm's Q1 recommendation locked
`/library/<X>/` as the URL convention. The brainstorm cited
"ADR 0067 §2.1 Library room hierarchy" as rationale. ADR
0067 has no §2.1 and no Library framing — the actual
Library ADR is **0070**, which the brainstorm never
consulted and which originally specified **bare-URL routes**
directly contradicting W4a's implementation.

This was caught by `superpowers:requesting-code-review` at
the pre-PR gate, *after* all 4 Batch 1–4 commits had
landed and all tests were green. The HITL mandate failure
mode (per CLAUDE.md: "revisit and confirm the relevant
ADR(s) … Do not assume alignment from prior conversation,
verify, propose, get explicit approval, then implement")
was reproduced exactly: the brainstorm assumed alignment
from a phantom citation, the implementation followed the
brainstorm, and only the code-reviewer subagent independently
read ADR 0070.

**Resolution (Anna, 2026-05-23):** amend ADR 0070 in this PR
to adopt `/library/<X>/` URLs. The collision-with-Section-
slugs argument (a Section literally titled "Glossary of
Symbols" cannot conflict with `/library/glossary` at the URL
level) + the room-metaphor-legibility argument both land in
ADR 0070's new revision-history. Slug alignment also
shipped: `/library/key-insights/` matches `KeyInsightEntry`
vocabulary instead of ADR 0070's original `/insights/`
shorthand.

**Doctrine bump.** See R5 below.

### Surprise #3: JSX `test.describe` and `test()` strings count as drift

Beyond const-value updates, the e2e spec files had 6
`test.describe()` titles and 7 `test()` names referencing
old paths (e.g., `"PR-C1: <CourseGlossary /> on /glossary"`).
These don't affect test correctness — the URL value comes
from the const, not the test name — but they DO affect
test output legibility. Updated in the same Batch 3 commit.

**Lesson.** Mechanical-rename batches should include test
metadata (describe titles, test names) co-located with the
const updates, since they're the same authoring intent and
diverge under partial-rename.

### Surprise #4: Live-doc cross-references in `docs/website/`

Second-pass grep was scoped to `packages/` and
`examples/smoke/` and missed 9 live-doc cross-references in
`docs/website/` (how-to, reference, vision/design,
vision/features, status, decisions/0038-line-195). All in
active prose describing current rendering surfaces, all
covered by `feedback_docs_no_drift`'s "update docs in the
SAME PR" rule, all missed in Phase-1.

**Lesson.** Phase-1 enumeration must explicitly scope to
`docs/website/` for any code rename that's not purely
internal — see Doctrine R4 below.

### Surprise #5: ADR 0070's `/insights/` slug doesn't match data

ADR 0070's original Library hierarchy table specified
`/insights/` for the Key Insights room. Every other Sophie
surface uses "key-insights" (`KeyInsightEntry`,
`CourseKeyInsights.astro`, `key-insights.astro` route file,
`@sophie/components/.../KeyInsight/`). The original ADR's
`/insights/` shorthand was unattested. W4a's amendment
realigned the slug to `/library/key-insights/` to match the
data vocabulary, avoiding a URL/entity-name split.

## Doctrine refinements

### R4 — Phase-1 enumeration must include `docs/website/` for non-purely-internal renames

W3 doctrine R1 scoped Phase-1 grep to `packages/` and
`examples/smoke/`. W4a's R+CR found 9 stale doc references
in `docs/website/` that this scoping missed. Recommendation:
when a rename touches URL paths, component names, or any
author-facing vocabulary, Phase-1 grep MUST include
`docs/website/` (excluding `docs/website/decisions/00XX-`
files older than the 6-month memo-no-drift window, which
are historical record per `feedback_docs_no_drift`).

### R5 — Brainstorm must verify cited ADRs exist + locked decisions before scope locks

The W4 meta-plan brainstorm cited "ADR 0067 §2.1" as
rationale for Q1's `/library/<X>/` URL decision. ADR 0067
has no §2.1; the actual relevant ADR (0070) was never read.
**Rule:** any brainstorm citation of an ADR must be
verified by reading the ADR before the decision locks.
Cheap insurance: a `Read` of the cited ADR section is
under-budget for a brainstorm round. Without this check,
HITL becomes a phantom — Anna confirms a decision that's
based on imaginary ADR text, and the failure mode only
surfaces at R+CR.

Suggested addition to the brainstorming-skill: when an ADR
is cited, the responding agent should `Read` the cited
section in the same exchange and quote the load-bearing
text. This is one Read tool call per cited ADR section —
trivial overhead, structural defense against the W4a
failure mode.

## R+CR findings + resolutions

The pre-PR `superpowers:requesting-code-review` subagent
returned a "Push back on review" verdict with the following
findings:

| Severity | Finding | Resolution |
|---|---|---|
| Critical (C1) | `/library/<X>/` contradicts ADR 0070 | Amended ADR 0070 in same PR (Anna's choice 2026-05-23) |
| Critical (C2) | 9 stale live-doc refs in `docs/website/` | Updated all 9 in same PR |
| Important (I1) | Smoke `/` has no link to `/library/` | Added `<h2>Library</h2>` section to `index.astro` |
| Important (I2) | ADR 0038:504 path consistency | Changed to full `examples/smoke/src/pages/library/objectives.astro` |
| Important (I3) | ADR 0070 missing from design-doc `related:` | Added to W4a design-doc frontmatter |
| Minor (M1) | Pre-existing `/chapters/X` in chapter-components.md:175 | Fixed to `/units/<unit-id>/reading` while editing the row |
| Minor (M2) | W4a→W4c detail-route inconsistency window | Acknowledged in design doc §3.7; W4c timeline expected to keep window short |
| Minor (M3) | Library hub `rooms` array data shape | Noted for W4c (shell extraction) |
| Minor (M4) | Objective.stories.tsx:16 lacks backticks | Added backticks |
| Gotcha (G1) | W4a design doc cited non-existent ADR 0067 §2.1 | Implicit fix via ADR 0070 amendment (citation now points to ADR 0070); see R5 doctrine bump |
| Gotcha (G2) | `/key-insights/` vs ADR 0070's `/insights/` | Slug alignment to `/library/key-insights/` (matches data) shipped in ADR 0070 amendment |
| Gotcha (G3) | No e2e for hub-link resolution | Deferred to W4b (hub gains topic + bridge link affordances, e2e lands there) |

## Handoff to W4b

The W4a infrastructure that W4b inherits:

1. **Library hub at `/library/index.astro`.** W4b adds Topics
   to the rooms list once the topic-registry ships.
2. **`/library/<X>/` URL convention locked.** W4b's Topics
   land at `/library/topics/<slug>/`, bridge rooms at
   `/<bridge-slug>/` (Course root, not under `/library/`
   per W4 meta-plan Q3).
3. **ADR 0070 amended.** W4b's net-new rooms (Topics +
   future Deep Dives, Interventions, OMI) automatically
   adopt the prefix.
4. **Counter-pass-clean source tree.** No bare-path
   references to migrate during W4b's net-new work.
5. **R+CR doctrine bumps (R4, R5)** ready to apply to W4b's
   brainstorm — verify cited ADRs by reading them, scope
   Phase-1 grep to `docs/website/` too.

The next pilot in the B-followup sequence is W4b, the
highest-design-pressure sub-wedge (net-new topic-registry
collection + new ADR draft + bridge-room rendering +
SkillReview self-closing resolver). The W4 meta-plan
[locks Q2–Q6 + Meta-Q0 sub-wedge split](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md) — W4b inherits those decisions and drafts the
topic-registry ADR as an Anna-sign-off-blocking docs commit
before scoping implementation.

After W4b + W4c land, Wedge B-followup is closed. The
post-W4 milestone is the next ADR-0064 chapter pilot, which
will exercise the full Library + bridge + topic-registry +
SkillReview-resolver stack end-to-end against a real
curriculum surface.
