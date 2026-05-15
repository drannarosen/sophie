---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decision-records
  - tdr
  - curriculum-design
  - sotl
  - lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0040: Teaching Decision Records (TDRs)

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie ships [ADRs](./) (Architecture Decision Records) for every
load-bearing architectural choice — the textbook/course-site split
([ADR 0001](0001-platform-not-monorepo.md)), the pedagogy-index
pattern ([ADR 0038](0038-pedagogy-index-pattern.md)), the
MDX-render-boundary prop-threading rule
([ADR 0027](0027-mdx-render-boundary-prop-threading.md)), and 38
others. ADRs answer the question *"why is the platform built this
way?"* as a version-controlled audit trail.

The analogous question — *"why is this course designed this way?"* —
has no codified answer. When Anna decides "introduce parallax before
standard candles because students need observable→inference
scaffolding first," that decision currently lives in her head, in a
Slack message, or in a chapter intro paragraph. Six months later,
when a chapter is revised (by Anna, by AI under instructor
supervision, by a future collaborator), the *rationale* isn't
visible — only the *outcome*.

This gap matters for four audiences identified in
[`vision/index.md`](../vision/index.md):

1. **Anna today** — drafting curriculum at scale; needs to remember
   why decisions were made.
2. **Anna next semester** — returning to a decision six months later;
   needs a working memory aid.
3. **Other instructors (post-launch)** — forking or adopting Sophie
   courses; need to understand *why* a course is designed this way
   before they remix it.
4. **Learning-science researchers** — treating Sophie courses as
   reproducible curriculum interventions; need access to the
   intentional-design audit trail.

[`vision/features/accepted.md`](../vision/features/accepted.md#a1-teaching-decision-records-tdrs)
entry A1 promoted TDRs to *accepted-pending-ADR* on 2026-05-14 with
the open question framed as: *where do TDRs live?*

This ADR resolves that question and ratifies TDRs as a Sophie
convention.

## Decision

Sophie introduces **Teaching Decision Records (TDRs)** as a
first-class curriculum-design artifact. TDRs are the pedagogy-decision
equivalent of [ADRs](./): a numbered, version-controlled, structured
audit trail of *why a course is designed this way*.

### Where TDRs live

**TDRs live in consumer repos, not in Sophie-the-platform docs.**

Concretely:

- ASTR 201's TDRs: `drannarosen/astr201/teaching-decisions/001-...md`,
  `002-...md`, etc.
- COMP 521's TDRs: `drannarosen/comp521/teaching-decisions/001-...md`,
  etc.
- Other instructors who adopt Sophie maintain TDRs in *their* course
  repos.

Sophie-the-platform docs hold only:

- This ADR (the convention).
- The [TDR template](../reference/tdr-template.md) (one canonical file
  consumer repos copy as their `teaching-decisions/template.md`).

### Numbering

**Folder-scoped, zero-padded 3-digit:** `001-<slug>.md`, `002-<slug>.md`,
etc., inside each course's `teaching-decisions/` directory. The folder
path encodes the course (`astr201/teaching-decisions/`); the file
numbering stays simple within that scope. No global numbering across
courses; each course is its own audit trail.

TDR slugs follow the same kebab-case-after-number convention as ADRs
(`001-parallax-before-standard-candles.md`).

### Schema

**TDRs mirror ADR conventions.** Same frontmatter shape, same body
admonition, same five canonical sections. Reasons for parity:

- Lowers cognitive overhead — readers familiar with ADRs can read TDRs
  without learning a new shape.
- Matches the post-PR-41 mystmd admonition pattern Sophie already uses
  for ADRs.
- Reuses Sophie's existing markdownlint + mystmd build pipeline; no
  new validators required.

Full schema (hardened 2026-05-14):

```markdown
---
date: YYYY-MM-DD
tags: [pedagogy, decision, ...optional course/topic tags]
evidence_type: <required: see 8-value enum below>
evidence_strength: <optional: strong | moderate | weak | exploratory>
evidence_summary: <optional 1-2 sentences anchoring the evidence>
scope: <optional, default chapter: chapter | module | course_shell | semester>
visibility: <optional, default internal: internal | public>
affects_anchors: [<optional pedagogy-index anchor list, e.g., misc-redshift-doppler>]
affects_versions: [<optional course version list, e.g., 1.0.0, 1.1.0>]
---

# TDR-NNN: Brief decision title

:::{admonition} TDR metadata
- **Status**: proposed | accepted | superseded
- **Deciders**: [instructor name(s)]
- **Course**: [course identifier]
:::

## Context
[Why this teaching situation prompted a decision]

## Decision
[The pedagogy choice made]

## Rationale
[Pedagogical reasoning; cite literature where it strengthens the case;
cite specific student-confusion patterns observed in past semesters]

## Consequences
[What this means for the course; what's constrained; what's deferred]

## Alternatives considered
[The teaching moves not made and why]

## References
[Related TDRs, ADRs, vision/pedagogy/ essays, external sources]
```

### Field-by-field semantics

**`evidence_type` (required)** — one of eight values; classifies the
*basis* for the decision. Required even when the basis is informal —
`instructor_observation` is a legitimate value that captures expert
judgment without forcing data the author doesn't have.

| Value | Use when |
|---|---|
| `course_eval` | Formal end-of-semester evaluations (rated items, free-response patterns) |
| `student_artifact` | Homework / exam / discussion-board responses showing a pattern |
| `participation_data` | Engagement metrics from prior runs (attendance, completion rates, time-on-task) |
| `literature` | Cited research applied to this course |
| `instructor_observation` | Pattern Anna noticed across office hours / class discussion / her own teaching memory |
| `student_feedback` | Informal — emails, office-hour comments, mid-semester feedback |
| `audit_signal` | Sophie's own audit caught the issue (e.g., NR1 + MR2 fires drove a registry refactor) |
| `forward_hypothesis` | Predictive / exploratory — trying something new with no prior evidence yet; pair with `evidence_strength: exploratory` |

**`evidence_strength` (optional)** — one of four values; the
author's self-disclosure of evidence *quality within its type*. A
TDR marked `evidence_strength: weak` doesn't fail any check; it
just signals "I'm acting on thin evidence, future-me should
re-evaluate." That self-disclosure is what makes the TDR corpus
useful as a SoTL artifact.

| Value | Use when |
|---|---|
| `strong` | High-n data, peer-reviewed citation, or pattern across multiple semesters |
| `moderate` | Modest-n data, recurring observation, or partial literature support |
| `weak` | Single anecdote, n=1 semester, or speculative-but-defensible |
| `exploratory` | No prior evidence; testing a hypothesis (pairs naturally with `evidence_type: forward_hypothesis`) |

**`evidence_summary` (optional)** — 1–2 sentences narratively
anchoring the evidence type to specifics. Cultural-norm
recommended; not schema-gated. Example:
*"sp25 evals (n=47, 73% response): Q12 flagged the Drake-equation
section as 'most confusing' by 18/47 students."*

**`scope` (optional, default `chapter`)** — one of four values.
Lets course-shell decisions (syllabus reorderings, due-date changes,
rubric tweaks, paper-swap decisions) live in the same TDR machinery
without conflating with chapter-bound pedagogical decisions.

| Value | Use when |
|---|---|
| `chapter` (default) | Decision affects one chapter |
| `module` | Decision spans multiple chapters in a module |
| `course_shell` | Schedule, assignment dates, rubric, paper-swap, recitation structure |
| `semester` | Semester-wide policy (grading scheme, AI policy adjustments mid-semester) |

**`visibility` (optional, default `internal`)** — one of two values.
**TDRs are internal-default**; opt-in publish is the *exceptional*
path. Frank reflection requires safety; forward-hypothesis TDRs
contaminate when public (priming the natural experiment); TDRs
often reference student data that has FERPA implications; some
pedagogical strategy works because it's not declared. The public-
facing accountability layer is the Pedagogy Contract + AI
Contribution Ledger ([ADR 0042](0042-pedagogy-contract-and-ai-contribution-ledger.md)),
not TDRs.

| Value | Behavior |
|---|---|
| `internal` (default) | Visible to instructor + AI primary author + course-build inspection; not rendered on student-facing chapter pages or in `<TDRRef>` cross-references in student build |
| `public` | Opt-in; renders on student-facing chapter pages; rendered in `<TDRRef>` hover cards; surfaces on `/teaching-decisions/` route when published |

The instructor opts in selectively — likely for SoTL citation,
departmental sharing, or tenure-case artifacts — once the TDR is
calibration-mature.

**`affects_anchors` (optional, list of pedagogy-index anchor slugs)** —
declares the chapter-level anchors this TDR claims to affect
(`eq-wiens-law`, `misc-redshift-doppler`, `def-luminosity`,
`lo-flux-vs-luminosity`, etc.). Two consumers integrate:

1. **`sophie diff` intentional-change demotion**
   ([ADR 0045](0045-pedagogical-diff-curriculum-ci.md)): a diff
   item whose anchor is listed in any HEAD TDR's `affects_anchors`
   is demoted one severity level and tagged with the source
   TDR-id. Honors intentional changes automatically.
2. **Audit-override coupling**
   ([ADR 0053](0053-conformance-failure-modes.md), forward-ref):
   chapter-frontmatter `audit_overrides` reference TDRs by id;
   the audit verifies the referenced TDR has the overridden anchor
   in its `affects_anchors`. Couples overrides to provenance
   structurally.

**`affects_versions` (optional, list of course version strings)** —
declares which course versions this TDR spans (e.g.,
`["1.0.0", "1.1.0"]`). Auto-populated by `sophie refactor`
([ADR 0049](0049-sophie-refactor-cli-family.md)) with
`[<current_version>]` based on the pedagogy contract's
`course_version` ([ADR 0051](0051-chapter-status-and-course-versioning.md)).
Author can edit if the decision genuinely spans multiple versions.

The full canonical template — with one fully-worked example — lives
at [`reference/tdr-template.md`](../reference/tdr-template.md).

### Status taxonomy

Same three states as ADRs:

- **proposed** — written but not yet committed; under discussion.
- **accepted** — committed; the course follows this decision.
- **superseded** — replaced by a later TDR (which is referenced via
  the `References` section of both).

Demoting an accepted TDR back to proposed isn't normal; a meaningful
revision authors a *new* TDR that supersedes the old one. The
supersession chain becomes its own audit trail.

### Authorship

TDRs are authored by the **instructor of record** for the course. AI
(Claude, ChatGPT, etc.) may draft TDR proposals or suggest TDR-worthy
decisions, but the *acceptance* signal comes from the instructor — the
same human-in-the-loop pattern Sophie's
[CLAUDE.md](../../../CLAUDE.md) Engineering Principles codify at the
platform level. The `Deciders` field records this explicitly.

### Discoverability — `<TDRRef>` cross-references

A TDR that no chapter points at is dead infrastructure. Sophie ships
two components that make TDRs discoverable from the chapters they
govern.

**`<TDRRef num="14">`** — interactive React island (hover-preview
pattern from PR-C2, parallel to `<EqRef>` / `<FigureRef>` /
`<GlossaryTerm>` / `<ChapterRef>`). Renders inline as `TDR-14: <title>`
linked to the TDR file; hover card shows title + evidence_type +
evidence_strength + 1-line summary. Self-closing or with children for
custom anchor text:

```mdx
The decision to introduce parallax before standard candles is recorded
in <TDRRef num="14" />. We pursue this scaffolding throughout
Module 1.
```

Single anchor source (`num=` only; no parallel `slug=` system). TDRs
are numbered per ADR 0040's folder-scoped numbering; renumbering
should be rare-to-never, and renumbering on commit can be done with
`sophie refactor tdr renumber`
([ADR 0049](0049-sophie-refactor-cli-family.md)) when needed.

**`<ChapterTDRs chapter="X">`** — Astro consumer (server-rendered
aggregator, parallel to `<ChapterEquations>` / `<ChapterMisconceptions>`).
Roll-up of TDRs referenced from the chapter, rendered at chapter-end.
Sources the references by walking `<TDRRef>` occurrences in the
chapter's MDX.

Both components respect `visibility`:

| Build profile | Internal TDR `<TDRRef>` | Public TDR `<TDRRef>` |
|---|---|---|
| **Student-facing** (default v1 build) | Not rendered (or rendered as `<span class="sr-only">` for screen-reader / instructor inspection of HTML source) | Renders as normal cross-reference with hover preview |
| **Instructor-build** (dual-profile v2+) | Full hover preview | Full hover preview |

`<ChapterTDRs>` in student-facing build surfaces only public TDRs
referenced from the chapter (often empty in v1); in instructor-build,
all referenced TDRs surface.

### Audit invariants

ADR 0040 ships two audit invariants in the foundation tranche:

**TDR-1** (WARNING, course-level) — *minimum TDR coverage proportional
to load-bearing-entity count*. Formal check: total-TDR-count /
load-bearing-entity-count must be ≥ a ratio configured in the
pedagogy contract.

- Load-bearing entities counted: `<KeyEquation>` instances,
  `<Aside kind="misconception">` instances, `<LearningObjectives>`
  items.
- Default ratio: `0.1` (one TDR per ten load-bearing entities).
  Configurable in `pedagogy-contract.yaml` at
  `tdr_coverage.min_ratio`.
- Operates on **total** TDR count regardless of visibility — the
  question is "do you have enough teaching-decisions documented?",
  not "have you published enough?".

Rationale: TDR fatigue is a known anti-pattern (teams stop writing
ADRs after initial enthusiasm); TDR-1 nudges against it without
gating CI on every chapter individually having a TDR. A course with
14 load-bearing entities should have ≥1 TDR; a course with 140
should have ≥14.

**TDR-2** (INFO) — *`affects_anchors` entries resolve in base
PedagogyIndex*. Each anchor in a TDR's `affects_anchors` should
resolve to an entity that *exists in the base ref's PedagogyIndex*
(i.e., the anchor existed before the TDR's effect was applied —
that's why it was changeable). Authoring-correctness nudge for the
intentional-change-annotation flow defined in
[ADR 0045](0045-pedagogical-diff-curriculum-ci.md).

## Rationale

### Why consumer repos, not platform docs

Three reasons option (c) (consumer-repo location) beats options (a)
(platform docs sub-dir of `decisions/`) and (b) (new platform docs
top-level section):

1. **Matches [ADR 0001](0001-platform-not-monorepo.md)'s textbook/
   course-site separation.** TDRs document course-specific pedagogy;
   Sophie-the-platform docs document platform architecture. Mixing
   these in one repo blurs the conceptual axes that ADR 0001
   deliberately separated.

2. **Scales to multi-instructor adoption.** When N instructors adopt
   Sophie, they each have their own TDRs in their own repos.
   Sophie-the-platform docs stay focused on the platform; they don't
   grow with every course's pedagogy decisions.

3. **TDRs are part of the course's published artifact.** Post-Phase-4
   launch, `drannarosen.github.io/astr201/teaching-decisions/` is
   publicly accessible. This is the SoTL audience surface and the
   tenure-case-citable artifact. Hiding TDRs inside Sophie-the-
   platform docs would orphan them from the courses they describe.

### Why ADR-shaped schema

A simpler schema (e.g., "title + decision + rationale only") loses
the **alternatives-considered + consequences** sections that make
ADRs valuable. Future readers — especially other instructors
considering adoption — need to see *what moves weren't made and why*,
not just what was chosen. ADR shape forces that articulation.

A more elaborate schema (declared cognitive-load metadata, learning-
objective FK fields, etc.) is ceremony — it asks authors to fill in
fields that derive nothing the prose can't say better. The
[`vision/features/speculative.md`](../vision/features/speculative.md)
*Learning Design Genome* entry argues this case in more detail.

### Why folder-scoped numbering

Global numbering across courses (`TDR-ASTR201-001`, `TDR-COMP521-001`)
embeds course identity in the filename. Folder-scoped numbering
(`astr201/teaching-decisions/001-...`) embeds course identity in the
path and keeps filenames clean. Path-encoded identity is the
prevailing pattern in Sophie's monorepos and consumer repos already;
keep it.

## Consequences

### Consumer repos gain a `teaching-decisions/` directory

Each consumer repo that adopts the TDR practice creates:

- `teaching-decisions/template.md` — copied from
  [`docs/website/reference/tdr-template.md`](../reference/tdr-template.md)
  in this platform repo.
- `teaching-decisions/001-<slug>.md`, `002-...`, etc. — the actual
  TDRs.
- (Optional) `teaching-decisions/index.md` — a course-specific landing
  page summarizing the TDR corpus.

### TDRs become part of the published course site

Post-Phase-4, when ASTR 201 ships at `drannarosen.github.io/astr201/`,
the TDR directory is part of the site routing. Students see the
teaching-decision audit trail (or instructors can dual-profile it per
[ADR 0001 + Phase 5 plans](../status/roadmap.md)). Researchers see
it. Future-Anna sees it. The artifact is publicly citable.

### Audit invariant code PR (TDR-1 + TDR-2)

This ADR ships **TDR-1** (course-level coverage WARNING) and
**TDR-2** (INFO on `affects_anchors` resolution) as part of the
foundation. Their full specifications appear in the *Audit
invariants* section above; the audit pass that fires them is
registered in `packages/astro/src/lib/pedagogy-audit.ts` in the
follow-up code PR. Future ADRs may add additional TDR-prefix
invariants as authoring data shows the need; v1 ships these two.

### Pedagogy index integration via `<TDRRef>` and `<ChapterTDRs>`

TDRs are reachable from the pedagogy index via the
`<TDRRef num="14">` cross-reference component and the
`<ChapterTDRs chapter="X">` chapter-end roll-up consumer (full
specs in the *Discoverability* section above). The pedagogy index
gains a new collection at `PedagogyIndex.tdrReferences` populated
by the remark extractor walking `<TDRRef>` occurrences in chapter
source; the audit consumes it for cross-chapter dangling-reference
checks (TDR-2). The code-PR layer is part of the same follow-up
that lands the audit invariant code.

### Other instructors

Adopting Sophie includes adopting (or not) the TDR practice. The
template is the canonical starting point. The
[`vision/pedagogy/`](../vision/pedagogy/) essays (when drafted) and
TDR practice together are what an LDS *is* — not just shipping
software, but documenting the design intent of every course running
on Sophie.

## Alternatives considered

### (a) TDRs alongside ADRs in `docs/website/decisions/tdrs/`

Pro: one repo to navigate; ADRs + TDRs side-by-side. Con: mixes
architecture and pedagogy decisions in one site section; doesn't
scale when other instructors adopt Sophie; orphans TDRs from the
courses they describe (TDRs don't ship with the course site).
**Rejected** — short-term ergonomics traded for long-term mismatch
with ADR 0001's separation.

### (b) New platform docs top-level section (`docs/website/teaching-decisions/`)

Pro: cleaner conceptual separation from `decisions/`. Con: Sophie-the-
platform docs grow with every course's pedagogy decisions; still
doesn't scale to N instructors; still orphans TDRs from courses.
**Rejected** — cleaner than (a) but inherits the same scaling
mismatch.

### Simpler schema (no Alternatives-considered + Consequences sections)

Pro: lower authoring overhead. Con: TDRs become "decision logs"
without defended reasoning — readers see what was chosen but not
why other moves were rejected. ADRs taught Sophie that the
alternatives-considered section is where most of the value lives.
**Rejected** — paradox of friction vs value; the friction *is* the
value.

### More elaborate schema (declared cognitive-load, learning-objective FK fields)

Pro: machine-readable curriculum-design metadata. Con: ceremony —
fields that mostly repeat what the prose says; declared metadata
that drifts from the prose creates lying-by-omission. Discussed in
[`vision/features/speculative.md`](../vision/features/speculative.md)
*Learning Design Genome*. **Rejected** — prefer derived audits over
authored bookkeeping.

### Global TDR numbering across courses

Pro: each TDR has a globally unique identifier. Con: forces authors
to think about numbering coordination across repos they may not own;
adds friction without clear benefit. **Rejected** — folder-scoped
identity is sufficient.

## References

- [ADR 0001 — platform not monorepo](0001-platform-not-monorepo.md):
  the textbook/course-site separation TDRs align with.
- [ADR 0030 — audience and AI-author model](0030-audience-and-ai-author-model.md):
  the instructor-as-supervisor framing TDRs codify at the curriculum
  level. Per the 2026-05-14 hardening, ADR 0030 also documents
  Sophie's explicit commitment to AI-primary authoring (the framing
  TDRs operationalize).
- [ADR 0038 — pedagogy index pattern](0038-pedagogy-index-pattern.md):
  the structured-pedagogy substrate TDRs sit alongside;
  `<TDRRef>` cross-references and `<ChapterTDRs>` consumers register
  with the pedagogy index via the same extractor pattern as
  `<EqRef>` / `<ChapterEquations>`.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](0042-pedagogy-contract-and-ai-contribution-ledger.md):
  the public-facing accountability layer; TDRs are the *internal
  operational layer* that justifies the contract's claims.
  `visibility: internal | public` on TDRs parallels the `visibility`
  field on `ai_contribution` blocks.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](0045-pedagogical-diff-curriculum-ci.md):
  the `affects_anchors` field on TDRs feeds the diff classifier's
  intentional-change demotion.
- [ADR 0049 — `sophie refactor` CLI Family](0049-sophie-refactor-cli-family.md):
  refactor commands auto-generate TDR-seed stubs with
  `affects_anchors` and `affects_versions` pre-populated.
- [ADR 0051 — Chapter Status + Course Versioning](0051-chapter-status-and-course-versioning.md):
  the `affects_versions` field on TDRs maps to the course-level
  semver declared in the pedagogy contract.
- [ADR 0053 — Conformance Failure Modes](0053-conformance-failure-modes.md):
  chapter-frontmatter `audit_overrides` reference TDRs by id; the
  audit (CF1) verifies the referenced TDR lists the overridden anchor
  in `affects_anchors`. Couples overrides to provenance structurally.
- [`vision/features/accepted.md` A1](../vision/features/accepted.md#a1-teaching-decision-records-tdrs):
  the originating entry; graduates to *graduated* on acceptance of
  this ADR.
- [`vision/features/backlog.md` B8 — Semester Journal](../vision/features/backlog.md):
  related but distinct feature; the journal captures *observations*
  that may mature into TDRs (which capture *decisions*).
- [`reference/tdr-template.md`](../reference/tdr-template.md): the
  canonical template consumer repos copy.
- [`reference/chapter-components.md`](../reference/chapter-components.md):
  authoring reference for `<TDRRef>` and `<ChapterTDRs>` components.
- [Sophie Engineering Principles](../../../CLAUDE.md): the HITL +
  SoTA-not-simple + no-back-compat-pre-launch values that shape
  Sophie's authoring culture; TDRs apply the same values to
  curriculum-design culture.
