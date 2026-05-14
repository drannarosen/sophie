---
date: 2026-05-14
tags: [pedagogy, decision-records, tdr, curriculum-design, sotl, lds]
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

Full schema:

```markdown
---
date: YYYY-MM-DD
tags: [pedagogy, decision, ...optional course/topic tags]
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

### Audit invariants follow

Future Sophie audit invariants can reason about TDRs (orphan TDRs
that no longer match shipped course shape; TDRs referencing removed
chapters; TDRs without a `Deciders` field). These ship as a
follow-up; this ADR ratifies the convention, not the audit pass.

### Bucket C pedagogy index extension (later)

TDRs are reachable from the pedagogy index in principle — a chapter
could declare "TDR-014 governs my design" via frontmatter, and the
index could surface "show me every TDR active across my course."
This is *not* shipped here; it's a candidate backlog entry that
emerges if and when the audit need surfaces.

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
  level.
- [ADR 0038 — pedagogy index pattern](0038-pedagogy-index-pattern.md):
  the structured-pedagogy substrate TDRs sit alongside.
- [`vision/features/accepted.md` A1](../vision/features/accepted.md#a1-teaching-decision-records-tdrs):
  the originating entry; graduates to *graduated* on acceptance of
  this ADR.
- [`reference/tdr-template.md`](../reference/tdr-template.md): the
  canonical template consumer repos copy.
- [Sophie Engineering Principles](../../../CLAUDE.md): the HITL +
  SoTA-not-simple + no-back-compat-pre-launch values that shape
  Sophie's authoring culture; TDRs apply the same values to
  curriculum-design culture.
