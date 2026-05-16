---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - status
  - versioning
  - semver
  - course-shell
  - lds
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: test
      ref: packages/core/src/schema/chapter.test.ts
      date: "2026-05-12"
      notes: "ChapterSchema requires status: draft|review|stable; CS1 enforced upstream at the Zod layer."
    - kind: test
      ref: packages/astro/src/lib/get-student-chapters.test.ts
      date: "2026-05-13"
      notes: "Draft-exclusion filter tested end-to-end (TextbookLayout pre-filters before setChapters)."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit.test.ts
      date: "2026-05-15"
      notes: "CS2 INFO finding tested (status: draft surfaces in audit even though excluded from build)."
    - kind: audit
      ref: packages/astro/src/lib/pedagogy-audit.ts
      date: "2026-05-15"
      notes: "CS2 INFO live; chapter status surfaces in the audit report."
  notes: "Chapter status shipped end-to-end (PR #49: feat(core,astro): chapter.status frontmatter + draft-exclusion). Sibling status surface to ADR 0056 validation status — see reference/validation-tracker.md `See also` block."
---

# ADR 0051: Chapter Status + Course Versioning

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The LDS conformance foundation (ADRs 0040–0046) made *chapter
authorship* structurally rigorous: chapters declare concepts,
misconceptions, AI contributions, TDRs, equation biographies; the
audit verifies cross-references; the diff classifies changes.
What the foundation did **not** address:

1. **Chapter draft-vs-stable distinction.** A half-written chapter
   that fails 12 audit invariants is not "broken" — it is
   *in-progress*. v1 had no mechanism to declare "this chapter is
   not yet meant to ship" except by removing it from the route
   tree, which loses the audit signal entirely.

2. **Course versioning.** When ASTR 201 fa26 launches with one
   set of chapters and ASTR 201 sp27 launches with a substantively
   different set, there is no canonical way to reference "the
   pedagogy state of ASTR 201 as it was for fa26." Per-chapter
   git SHAs work for individual revisions but don't capture
   course-level coherence (which chapters belonged, which TDRs
   were applicable, which version of which plugin was loaded).

The 2026-05-14 foundation review's CS / CV gaps surfaced both.
This ADR locks the chapter-status field and the course-level
semver-via-git-tag convention as a coupled solution: chapters
declare maturity; courses tag coherent snapshots.

## Decision

Sophie ships **chapter `status`** as a required frontmatter field
and **course-level semver via git tags** with a standardized
naming convention. Five new audit invariants in the CS + CV
families.

### Chapter `status`

Required frontmatter field on every chapter MDX file:

```yaml
---
title: Flux, Luminosity, Distance
status: stable
ai_contribution:
  ai_workflow:
    models: [claude-opus-4-7]
    generation_share: ai-primary
  instructor_reviewed:
    by: anna
    date: "2026-05-14"
    depth: line-by-line
    against: [pedagogy_contract, scientific_accuracy]
---
```

Enum values:

| Value | Meaning | Student build |
|---|---|---|
| `draft` | In progress; structure may be incomplete; not for students. | **EXCLUDED entirely** from student build. |
| `review` | Structurally complete; under review (instructor or external). | Included; surfaces with a "Under review" badge. |
| `stable` | Reviewed; ready for students; revisions land via TDRs. | Included; no badge. |

### `exam_key_for:` chapter frontmatter (optional)

Chapters that contain an exam's answer key declare which exam
they belong to via an optional `exam_key_for:` frontmatter field
naming the exam event in `schedule.yaml` (per
[ADR 0054](./0054-course-schedule-calendar.md)):

```yaml
---
title: Exam 1 Answer Key
status: stable
exam_key_for: exam-2026-10-21      # matches schedule.yaml event id
publishes_at: 2026-10-21T18:00:00-07:00
---
```

The field is **optional** — most chapters aren't exam keys. When
present, it triggers the SC5 audit invariant (per ADR 0054):
the chapter's `publishes_at` must be later than the referenced
exam's end time plus a grace period (default 30 minutes,
configurable via
`pedagogy-contract.yaml.scheduled_publish.exam_key_grace_minutes`).

Explicit declaration via `exam_key_for:` is preferred over
heuristic slug-matching ("chapter slug includes `key`"; "schedule
event title includes `Exam`"); heuristic matching produces
false positives and false negatives. Audit-as-presence: explicit
declaration triggers explicit check.

### `status: draft` excludes entirely from student build

This is **the** load-bearing semantic of the field. A draft
chapter:

- Is NOT routed in the student build (no URL renders).
- Does NOT appear in course-level indices (`<ChapterIndex>`,
  `<CourseEquations>`, etc.).
- Does NOT contribute to course-level audit invariants that
  count across chapters (M1 misconception coverage, MG3
  intervention coverage).
- DOES still run per-chapter audit (so authors get audit signal
  while drafting).
- DOES still ship in the instructor build (per the dual-profile
  precedent of ADR 0007 + ADR 0040's `<ChapterTDRs>` rendering).

The alternative considered — a "draft banner" rendering the
chapter but flagging it as in-progress — was rejected because
draft chapters can declare misconceptions / equations / TDRs that
are NOT yet ready to influence students' mental model. Excluding
the chapter from the student build is the correct semantics; a
banner would surface speculation as if it were curriculum.

### `status: review` includes with badge

A `review` chapter renders in the student build but with a
visible "Under review" badge near the chapter heading. The badge
signals to students that content may change before semester end.
Course-level indices include review chapters; audit invariants
treat them the same as stable.

### `status: draft` is the scaffold default; `stable` is the steady state

A new chapter scaffold defaults to `status: draft`. As authoring
proceeds, the author moves it to `review` then `stable`. Most
authored chapters end up `stable`; the `review` state is for
in-flight changes that the author wants visible-with-caveat.

### Course-level semver via git tags

Course versioning uses git tags following the convention:

```text
<course>-<semester>-v<semver>
```

Examples:

- `astr201-fa26-v1.0.0` — ASTR 201, fall 2026, initial release.
- `astr201-fa26-v1.0.1` — patch release (typo fixes, formatting).
- `astr201-fa26-v1.1.0` — minor release (new chapter, expanded
  intervention).
- `astr201-fa26-v2.0.0` — major release (chapter restructure,
  breaking pedagogical-diff change per ADR 0045's taxonomy).
- `astr201-sp27-v1.0.0` — fresh semester; version resets per
  semester.

Plus two **bookend convention tags** per semester:

- `<course>-<semester>-start` — start of the semester (anchors
  `sophie diff --semester=` resolution).
- `<course>-<semester>-end` — end of the semester (anchors
  `sophie metrics history --semester=`).

### `course_version` block in pedagogy-contract.yaml

Each course's `pedagogy-contract.yaml` declares the *current*
course version:

```yaml
# courses/astr201-fa26/pedagogy-contract.yaml
course:
  slug: astr201
  semester: fa26
course_version:
  current: v1.2.0
  released_at: 2026-09-01
  stale_review_days: 14            # optional; default 14; CS3 threshold
  semver_policy: |
    - PATCH: typos, formatting, non-pedagogical edits
    - MINOR: new chapter, expanded intervention, new misconception
    - MAJOR: chapter restructure, breaking diff (per ADR 0045 taxonomy)
```

The block's `current` field is the canonical course version
between tags. `sophie audit` validates that the latest git tag
matching `<course>-<semester>-v*` matches `current` — drift
between tag-and-block fires CV1 (see Audit invariants below).

Per-chapter `course_version` declaration is NOT supported.
Chapters do not version independently of the course; the course
is the smallest versioned unit. (Per-chapter SHAs are always
available via git log; semver applies at the course level.)

### Audit invariants

Five new invariants. CS (Chapter Status) and CV (Course Version)
families.

| ID | Level | Fires when |
|---|---|---|
| **CS1** | ERROR | Chapter MDX file lacks required `status:` frontmatter field. |
| **CS2** | INFO | Chapter has `status: draft` — surfaces in audit report so author knows what's excluded from student build. |
| **CS3** | WARNING | Chapter has `status: review` for >2 weeks since last commit. Catches "stuck in review" chapters that should be promoted or moved back to draft. The threshold is configurable via `pedagogy-contract.yaml.course_version.stale_review_days` (default 14). |
| **CV1** | WARNING | `course_version.current` in `pedagogy-contract.yaml` does not match the latest `<course>-<semester>-v*` git tag in the repo. |
| **CV2** | INFO | `<course>-<semester>-start` and `<course>-<semester>-end` tags are missing for the current semester. Surfaces so authors create the bookend tags. |

CS3's "stuck in review" threshold defends against `status:
review` becoming a permanent state. Real review takes time
(course development is months-long, not days-long), but a chapter
that has been `review` for a month is either ready to ship
(`stable`) or in transition to `draft` (significant rework
needed).

CV1/CV2 severity rationale: drift between `course_version.current`
and the latest git tag (CV1, WARNING) corrupts downstream
tooling that reads `current` for display (dashboards, schedule
metadata, etc.) — visible-but-wrong is worse than missing.
Missing bookend tags (CV2, INFO) breaks `sophie diff --semester=`
and `sophie metrics history --semester=` resolution loudly at
CLI runtime, so the audit signal is a soft surface — the loud
break is the bookend-tag prompt. Severities target the failure
modes asymmetrically because the failure modes are
asymmetrically self-announcing.

### Interaction with `sophie publish-state` (ADR 0052)

Chapter status interacts with scheduled publication in one
specific way: **`status: draft` OVERRIDES `publishes_at`.** A
chapter with `status: draft` and a future `publishes_at` does
NOT publish at that time — it remains excluded from the student
build until both (a) `status` advances to `review` or `stable`,
AND (b) any `publishes_at` is in the past.

The override is one-way: a chapter with `status: stable` and a
future `publishes_at` is gated by the timestamp (per ADR 0052's
SP semantics).

This rule is named in this ADR (CS over SP) and cross-referenced
in ADR 0052.

### Interaction with `sophie refactor` (ADR 0049)

A `sophie refactor` TDR-seed's `affects_versions:` field lists
the course versions the refactor applies to. Convention:

```yaml
affects_versions:
  - astr201-fa26-v1.2.0   # current version when refactor landed
  - astr201-fa26-v1.3.0   # any planned future version still
                          # in fa26 semester
```

`affects_versions` is informational; it does NOT trigger an
audit invariant. It is a search-key for "find all TDRs that
applied to ASTR 201 v1.2.0."

### Interaction with plugins (ADR 0048)

A course tag captures plugin versions transitively via the
`pnpm-lock.yaml` snapshot at tag time. The tag's commit is
identical to the lockfile snapshot. Reverting to a past tag
restores the past lockfile, including past plugin versions.

This makes "reproduce the code state of ASTR 201 fa26 v1.0.0" a
`git checkout <tag> && pnpm install --frozen-lockfile &&
pnpm build` operation. Lockfile-pin guarantees plugin-version
reproduction; tag-checkout guarantees source reproduction.

**Caveat — reproducing what students *saw* is a different
operation.** The build pipeline evaluates publication state
against `now()` at build time (per
[ADR 0052](./0052-scheduled-publication-visibility.md)): chapters
with `publishes_at` or `unpublishes_at` near a checkpoint render
differently depending on when the build runs. Re-building a
2026-fa tag in 2027 produces the same *code*, but
`publishes_at` timestamps in the future at tag-build time may now
be in the past, so the rendered student view differs.

To reproduce a specific point-in-time student view, the rebuilder
must additionally mock `now()` (via build-time env var, e.g.,
`SOPHIE_BUILD_NOW=2026-09-15T08:00:00-07:00 pnpm build`). The
v1 CLI does not ship a `--at-time` flag for this; if SoTL
reproduction work needs the affordance, it lands as a future
ADR. Course tags reproduce *code*; full point-in-time
reproduction requires *code + clock*.

## Rationale

### `status: draft` excludes entirely, not banner

The brainstorm considered three options:

1. **(A) Banner.** Draft renders with visible "in-progress"
   marking. Pros: audit signal preserved; chapter visible to
   instructor while drafting. Cons: students see speculative
   content; the "do not internalize this yet" UX burden falls
   on students.
2. **(B) Excluded from student build, included in instructor
   build.** What this ADR picks. Audit signal preserved (audit
   runs against the full corpus); student build sees only
   review+stable chapters; instructor build sees everything.
3. **(C) Excluded from both builds.** Pros: cleanest. Cons:
   loses audit signal; the instructor can't see what they're
   working on in a rendered form.

(B) wins on:

- **Pedagogical safety.** Students never see speculative content
  marked-as-such-but-still-readable. Marketing-class banners
  ("draft") are easy to dismiss; semantically misleading prose
  in a draft chapter that contradicts a later stable chapter
  causes real harm.
- **Audit signal preservation.** Authors get full audit feedback
  while drafting; CS2 INFO surfaces draft state explicitly.
- **Dual-profile precedent.** Sophie already plans instructor
  vs. student profile (per ADR 0007 + ADR 0040 `<ChapterTDRs>`
  rendering); draft visibility is the same pattern applied at
  chapter-routing level.

### Course-level semver, not chapter-level

The brainstorm rejected per-chapter versioning on three grounds:

1. **Pedagogical coherence is course-shaped.** Chapter A's
   evidence-quality depends on chapter B's prerequisites being
   declared consistently; versioning chapters independently
   would let A reference B-v2 while B-v1 is in the same course
   build.
2. **Authoring overhead.** Per-chapter semver means every chapter
   PR bumps a version; the cognitive load is unjustified.
3. **Existing tooling fits course-shape.** `sophie diff` operates
   across the course (compares two course states); `sophie
   metrics history` aggregates per-course; git tags are
   course-level by convention.

Per-chapter SHAs handle the per-chapter case (every commit
touches one or more chapters; `git log -- src/content/textbook/
<chapter>.mdx` gives chapter history). Semver applies at the
unit of coordinated release.

### Git-tag-based versioning, not a versions file

The brainstorm considered a `versions.yaml` file tracking course
versions in-tree vs. git tags as the source of truth. Tags won
on:

1. **Natural pnpm + git interop.** `git checkout <tag> && pnpm
   install --frozen-lockfile` reproduces the lockfile state
   exactly; an in-tree versions file would require parallel
   tooling.
2. **Tag conventions are platform-standard.** Sophie inherits
   the well-understood semver-via-git-tag convention; no
   custom format.
3. **`pedagogy-contract.yaml.course_version.current` is the
   in-tree declaration.** The tag is the canonical version;
   the contract block is the current-value declaration; CV1
   detects drift.

### Five invariants over more granular gating

The brainstorm considered CS-WARNING-on-draft (deterring draft
state). Rejected: drafts are a healthy authoring state; deterring
them would push authors to ship review-tier content as stable.
CS2's INFO surface is enough.

CS3 (WARNING after 14 days) is the only gate that's mildly
opinionated; it's configurable to handle authoring contexts
where weeks-long review is normal.

CV1 (WARNING on tag-block drift) is more about catching
"someone forgot to bump course_version.current after tagging"
than enforcing the bump; it's reviewable, not blocking.

## Consequences

**Easier:**

- Authors can ship in-progress chapters to the repo without
  surfacing them to students.
- Course versions are git-native; no parallel versioning
  scheme.
- "Reproduce semester X exactly" becomes a single git checkout.
- TDRs and refactors can reference `affects_versions:` cleanly.

**Harder:**

- Authors have to remember to update `course_version.current`
  in the contract when tagging (CV1 catches drift but the
  initial bump is manual).
- Authors have to bookend semesters with `start`/`end` tags
  (CV2 surfaces missing tags; tooling could later auto-create
  on first build of a semester).
- Draft-vs-review-vs-stable lifecycle adds a small authoring
  burden — but the discipline pays off in audit-trail clarity.

**Triggers:**

- v1 of this ADR ships docs-only on 2026-05-14.
- Implementation PR:
  - Schema: add `status` to chapter frontmatter Zod schema.
  - Build: exclude `status: draft` chapters from student build
    routes; preserve in instructor build.
  - Audit: implement CS1–CS3, CV1, CV2 in
    `packages/astro/src/lib/pedagogy-audit.ts`.
  - Contract: extend `pedagogy-contract.yaml` schema with
    `course_version` block.
  - CLI: `sophie audit` surfaces CS/CV findings in summary;
    `sophie metrics history --semester=` resolves bookend
    tags.
- ADR 0052 (Scheduled Publication) consumes the CS/SP
  interaction.
- ADR 0049 (sophie refactor) consumes `affects_versions:` field
  on TDR seeds.

## Alternatives considered

### Draft banner over excluded student build

*Rejected.* See Rationale. Pedagogical safety + audit-signal
preservation favor exclusion.

### Per-chapter semver

*Rejected.* Pedagogical coherence is course-shaped; per-chapter
versioning either coordinates implicitly (in which case it adds
overhead without gain) or coordinates explicitly (in which case
the course is already the versioning unit).

### `versions.yaml` file over git tags

*Rejected.* Git tags + lockfile pin together give exact
reproduction; an in-tree file would duplicate without adding.

### CS-WARNING-on-draft

*Rejected.* Drafts are healthy; deterring them is wrong.

### CS-ERROR on `status: review` for >N days

*Rejected.* CS3 WARNING is enough; ERROR would force authors to
flip arbitrary states to satisfy CI.

### Three-tier status (draft/review/stable) over four-tier

*Considered.* A fourth state (e.g., `archived` for chapters
removed from current semester but preserved in history) was
deferred. Git tags already preserve historical states; a chapter
removed from `myst.yml` route tree is effectively archived
without needing a status state. Future ADR if a real use case
surfaces.

## References

- [ADR 0007 — IndexedDB + ResponseStore](./0007-persistence-indexeddb.md)
  — dual-profile (instructor vs. student) precedent.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDR `affects_versions:` field consumes course-version tags;
  `visibility: internal | public` is parallel to chapter
  status semantics.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `pedagogy-contract.yaml` is where `course_version` block
  lives.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — `sophie diff --semester=` resolves bookend tags; MAJOR
  semver bumps correspond to breaking diff classification.
- [ADR 0047 — Empirical Validation Plan](./0047-empirical-validation-plan.md)
  — `sophie metrics history --semester=` resolves bookend tags.
- [ADR 0048 — Sophie LDS Content Plugin System](./0048-sophie-lds-content-plugins.md)
  — course tags pin plugin versions transitively via lockfile.
- [ADR 0049 — `sophie refactor` CLI Family](./0049-sophie-refactor-cli.md)
  — TDR-seed `affects_versions:` field.
- [ADR 0052 — Scheduled Publication & Visibility Windows](./0052-scheduled-publication-visibility.md)
  — `status: draft` overrides `publishes_at`; the CS/SP
  interaction is named here and in 0052.
- [ADR 0053 — Conformance Failure Modes](./0053-conformance-failure-modes.md)
  — chapter-level `audit_overrides` can bypass specific CS
  invariants per the override rules.
