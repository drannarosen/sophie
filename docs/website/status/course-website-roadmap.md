---
title: Course-Website Platform Roadmap
short_title: Course-Website Roadmap
description: Multi-sprint roadmap for expanding Sophie from textbook-authoring platform to full course-website platform; 27 architectural decisions across 8 design clusters.
tags: [roadmap, course-website, architecture, status]
---

# Course-Website Platform Roadmap

This document is the canonical roadmap for expanding Sophie from a
schema-driven interactive-textbook authoring platform into a
**pedagogical compiler for scientific reasoning**: a model-based STEM
learning environment where source content + Zod schemas + registries
+ typed components + curriculum-CI audits + AI-assisted authoring
compose into multiple outputs (readings, slides, practice sets,
computational labs, library spec pages, formula sheets, schedule
calendars, SoTL telemetry). Every authored artifact — equation,
glossary term, slide, reading passage, practice problem, worked
example, assessment item — fits into one auditable pedagogy graph
governed by the [eight-role epistemic component contract](../decisions/0058-epistemic-component-contract.md).
Other platforms treat course content as disconnected document
objects; Sophie makes the structure of scientific reasoning itself
the platform's load-bearing data model.

The goal is **not to replace Canvas as an institutional system of
record.** Canvas remains the registrar / roster / official gradebook
(via LTI 1.3 AGS grade-back at Tier 3). What Sophie replaces is the
*intellectual and pedagogical center* of the course — the surface
students actually learn from — for SDSU astrophysics + computational
courses. Day-to-day, the course lives in Sophie; institutional
continuity lives in Canvas.

**Status:** Brainstorming completed 2026-05-21 with 27 architectural
decisions settled across 8 design clusters. Implementation begins as a
multi-sprint program; sub-plans land per-sprint as separate planning
documents.

**Scope:** Sophie's [`CLAUDE.md`](../../../CLAUDE.md) vision statement
already commits to "interactive scientific textbooks, course websites,
slide decks, and LMS exports." The textbook surface is mature (Sprint K
landed 2026-05-21). This roadmap covers the under-architected
course-website surface — what content, what structure, what tier of
infrastructure, and in what order.

**Not in scope of this file:** Per-sprint implementation plans, ADR
drafts. This is the roadmap; implementation plans land per-sprint as
separate plan files.

## Context

Anna's two reference points for "what the content looks like today":

- **ASTR 201 Spring 2026** — Quarto site, lecture-based, 4 modules ×
  ~5 lectures × {slides + reading + handouts}, separate HW/Exam/Resources
  sections. <https://astrobytes-edu.github.io/astr201-sp26/>
- **ASTR 596 Fall 2025** — MyST site, project-based, 6 multi-week
  computational projects, GitHub-as-discussion, no in-browser
  computation surface. <https://astrobytes-edu.github.io/astr596-modeling-universe/>

The course-website surface must support both lecture-shape and
project-shape courses, plus future COMP courses, plus eventually serve
as an open-source platform for SDSU + R2/HSI peers.

**Tenure narrative anchoring** (Cottrell + CAREER double-sprint):
Sophie must be a defensible research instrument, not just a
productivity tool. "SoTA over simple" is the overriding design
principle — every decision biases toward long-term-correct shape, not
first-shippable hack.

## Sophie in the landscape

Sophie does not claim to invent any single capability listed in this
roadmap. Spaced repetition, interactive textbooks, in-browser Python,
LMS integration, social annotation, and OER assessment all exist
already in mature platforms. **Sophie's distinguishing claim is the
unifying contract underneath**: pedagogy components carry an explicit
*epistemic role* (Observable / Model / Inference / Assumption /
Approximation / Uncertainty / Numerical / Misconception) per
[ADR 0058](../decisions/0058-epistemic-component-contract.md), and
every authored artifact — equation, glossary term, slide, reading
passage, practice problem, worked example, assessment item — fits into
one auditable curriculum graph. That graph is what AI co-authoring,
curriculum-CI, slide↔reading drift detection, mastery modeling, and
the future Library room all build on. Other platforms treat content
objects as fundamentally disconnected; Sophie makes the structure of
scientific reasoning itself the platform's load-bearing data model.

The closest neighbors, and where Sophie diverges:

| Platform | What it does well | Where Sophie is different |
| --- | --- | --- |
| **[Runestone][runestone]** | Open interactive CS/math textbooks; exercises, analytics, authoring, integrated LMS-like system | Sophie is for *scientific reasoning* across astronomy/physics/computation; typed pedagogy graph + registries + AI-authoring workflow; local-first static at Tier 1/2 vs. Runestone's server-hosted model |
| **[LibreTexts ADAPT][libretexts-adapt]** | Large OER homework / question-bank platform with LMS integration; auto-graded interactive assessments at scale | Sophie's Assessment cluster is instructor-authored + tightly coupled to the course's own pedagogy graph; not competing with ADAPT's question-bank scale |
| **[OpenStax Kinetic][kinetic]** | Research infrastructure that connects higher-ed learners with learning-science studies in authentic environments | Sophie *is* the course environment, not a study layer on top of generic content; the research instrument and the teaching surface are the same artifact |
| **[Perusall][perusall]** | Strong social annotation; engagement around shared readings, video, audio | Sophie's Discussions are deferred to Tier 3; near-term differentiation is *cognitive/pedagogical structure*, not social learning. Long-term, annotation tied to equation steps / figures / misconceptions / assumptions could be a natural extension |
| **Quarto / MyST / Jupyter Book** | Excellent scientific-document authoring; markdown + executable code + reproducible output | Sophie is closer to a **pedagogical compiler** than a document generator: LOs, misconceptions, equation biographies, mastery records, FSRS scheduling, slide↔reading drift, AI co-authoring guardrails are all first-class, not optional add-ons |
| **Canvas / Moodle / Blackboard** | Roster, gradebook, institutional compliance, announcements, integrations | Sophie is *not* an LMS replacement; it is the intellectual layer Canvas is bad at. Canvas remains the institutional system of record (via LTI 1.3 at Tier 3) |

**Sophie's wedge is the combination**: schema-driven course structure
+ pedagogy graph + AI-assisted but instructor-curated authoring +
interactive scientific computation + local-first learning state +
slides/readings/practice/library sharing one conceptual backbone +
future LTI/SoTL telemetry compatibility. Individually, parts exist
elsewhere. Integrated, with the epistemic-role contract underneath,
the combination is novel — and that integration is the defensible
research claim for tenure / Cottrell / CAREER narratives.

## Signature Sophie learning patterns

Sophie's distinctive value is not any individual component — it's a
small set of **reusable pedagogical patterns** that compose
recurringly across courses, units, and content types. These patterns
are how the platform encodes scientific reasoning into authorable
shapes; together they form Sophie's pedagogical toolkit.

| # | Pattern | What it teaches |
| --- | --- | --- |
| 1 | **Observable → Model → Inference** (OMI, [ADR 0063](../decisions/0063-omiflow-composite-primitive.md)) | Epistemic anatomy of a scientific claim |
| 2 | **Prediction → Reveal → Explanation** (`<Predict>` + reveal) | Conceptual change; productive surprise |
| 3 | **Worked Example → Faded Prompt → Independent Practice** (Sweller) | Quantitative skill acquisition with managed cognitive load |
| 4 | **Misconception → Diagnosis → Repair** ([ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md)) | Conceptual repair from wrong-answer signals |
| 5 | **Equation → Biography → Validity Domain → Clinic** ([ADR 0046](../decisions/0046-equation-biography.md)) | Equations as models with assumptions, limits, and common misuses — not magic spells |
| 6 | **Assumption → Consequence → Failure Mode** (8-role contract per [ADR 0058](../decisions/0058-epistemic-component-contract.md)) | What breaks if a model's assumptions fail; scientific judgment |
| 7 | **Model Comparison → Model Selection → Scientific Judgment** | Knowing *which* model applies, not just *how* to apply one |
| 8 | **Pre-class → Live-class → Post-class** Learning Loop | Aligns Sophie surfaces to actual teaching workflow |
| 9 | **Retrieval → Spacing → Mastery Update** (FSRS + BKT) | Long-term retention with adaptive surfacing |
| 10 | **AI Draft → Instructor Curate → Curriculum-CI Audit** ([ADR 0030](../decisions/0030-audience-and-ai-author-model.md) + [ADR 0045](../decisions/0045-pedagogical-diff-curriculum-ci.md)) | Sustainable AI co-authoring with quality gates |

Patterns 1–7 are *learning* patterns (what the student does);
patterns 8–10 are *workflow* patterns (how Sophie supports the
instructor + the class). Every Sophie component PR should be able
to name which pattern it instantiates; components that don't fit any
pattern are probably chrome, not pedagogy. The patterns are the
elevator pitch — they describe what makes Sophie different from "a
course site + some interactive widgets."

## Confirmed design decisions (14 foundation + 13 cluster-level)

The 14 foundational decisions settled during brainstorming, in
load-bearing order:

| # | Decision | Rationale |
|---|---|---|
| 1 | **Archetype (B) user-facing + (C) data architecture** | Real LMS-substitute UX; data shape supports SoTL telemetry layering without rearchitecting |
| 2 | **Pyodide + Plotly for in-browser compute; NO Jupyter notebook UI** | Code cells become pedagogical components, not free-form tools |
| 3 | **3-tier build priority** (must-ship → differentiators → scale) | Stages risk; Tier 1+2 stay static-deploy; Tier 3 = server + auth |
| 4 | **Canvas/LTI integration deferred to Tier 3** | Tier 1+2 deploy to static hosting (GitHub Pages-class); zero auth/FERPA burden until Tier 3 |
| 5 | **Per-browser state via IndexedDB at Tier 1+2** | Reuses Sophie's existing useInteractive + ResponseStore ([ADR 0007](../decisions/0007-persistence.md)); no PII collected |
| 6 | **Generic schema names with type-driven display labels** | `Section[type=module]` renders "Module"; `Section[type=phase]` renders "Phase" — instructor never sees jargon |
| 7 | **Bridge concept at three scales**: top-level room · `Section[type=bridge]` between modules · `<SkillReview>` inline component | One pedagogy graph underneath; instructor picks scale per pedagogical moment |
| 8 | **Flexible labels for bridge rooms**: Prerequisites / Foundations / Bridge / Bootcamp / Fundamentals / custom | Generic type `bridge`; instructor picks display label per course; supports multiple bridge rooms |
| 9 | **Instructor Console + Prep = one private "Instructor" room with two tabs, Tier 3** | Single private space; less surface area |
| 10 | **Discussions in Tier 3** | GitHub Issues fills the gap in ASTR 596 today; acceptable defer |
| 11 | **FSRS as the spaced-repetition algorithm** | Modern, open-source, empirically motivated scheduler (Anki-community benchmarks beat SM-2); strong engineering choice for shipping evidence-based spacing |
| 12 | **Section-level practice-set via AI co-authoring** | 4-role expert panel ([ADR 0030](../decisions/0030-authoring-model.md)) drafts; instructor curates |
| 13 | **Auto-Subsection grouping by artifact type; explicit Subsection as opt-in** | Zero authoring overhead default; explicit when instructor wants commentary |
| 14 | **Single top-level "Library" room** for registry cheatsheets | Coherent lookup-on-demand purpose; scales as registries grow |

Plus 13 cluster-level decisions detailed in the dedicated sections below.

## Architecture tiers

| Tier | Auth | State location | Hosting | What ships |
|---|---|---|---|---|
| **1 — must-ship** | None | Per-browser (IndexedDB) | Static (GitHub Pages-class) | Course Info · Syllabus · Schedule · Content · Library · bridge rooms · Resources · retrieval/spaced-review/worked-example/faded-prompt/interleaved-set components · FSRS scheduler · Subsection auto-grouping · view-mode toggle |
| **2 — differentiators** | None | Per-browser (IndexedDB) | Static | Assignments (Sophie-hosted; submissions still via Canvas externally) · Exams (low-stakes hosted) · Computational Labs (Pyodide) · Diagnostics (self-served) · Practice problems with auto-feedback · Adaptive remediation (single-browser) |
| **3 — scale + integration** | LTI 1.3 (Canvas-issued sessions) | Server-side + per-browser | Compliant SaaS (Fly/Render/Vercel-functions; DPA + SOC 2 inherited) | Canvas integration (LTI 1.3: launch + NRPS roster + AGS grade-back + Deep Linking 2.0) · Instructor room (Console + Prep tabs) · Discussions · Announcements · Cohort-aggregated SoTL telemetry · Cross-device sync · Mastery tracking + adaptive remediation across-device |

### Tier 3 (Canvas / LMS / compliance) — deferred reference

LTI 1.3 federation handles auth + FERPA + Canvas integration as a single
integrated SoTA pattern (IMS Global Learning Consortium standard):

- **Resource Link Launch**: student clicks Sophie link in Canvas →
  authenticated Sophie session via OpenID Connect + OAuth 2 + JWT
- **NRPS** (Names and Roles Provisioning Service): roster auto-sync from
  Canvas
- **AGS** (Assignment and Grade Service): Sophie pushes grades back to
  Canvas gradebook
- **Deep Linking 2.0**: instructor picks specific Sophie components from
  Canvas's UI

**Pseudonymous-first data model**: LTI provides a pseudonymous `sub`
claim (opaque stable ID, not name/email). Sophie's data model stores
only the LTI sub claim as the user key. Real student records (name,
email, SID, grades) live in Canvas; Sophie holds no PII directly.
Joining Sophie data to a named student requires going through Canvas
(already FERPA-audited).

This design **minimizes** FERPA exposure but does not unilaterally
exempt Sophie from FERPA scrutiny. Whether a specific Tier 3
deployment qualifies as an "education record custodian" under
institutional / OCR interpretation is decided per-campus with IT +
legal; Sophie's architecture is designed to make that determination
as favorable as possible (pseudonymous-first, PII-free storage, no
direct identity records, real records in Canvas). The compliance
path below assumes Sophie *will* be treated as a covered system for
the purposes of audit logs, retention, and breach response — designing
for the stricter interpretation is the safer default.

**Compliance vocabulary** (documented for future-state, not Tier-1
work): SOC 2 Type II, encryption at rest (AES-256), encryption in
transit (TLS 1.3), audit logs (tamper-evident, ≥1yr retention),
retention policy, breach response plan (FERPA: notify without
unreasonable delay; CA: SB 1386 / Civ Code §1798.82), DPA (Data
Processing Agreement), data residency, principle of least privilege,
defense in depth, zero-trust networking.

**Compliance path (when Tier 3 activates):**

- Year 1: SOC 2 Type II hosting provider (Fly.io / Vercel / Render).
  Inherit ~80% of compliance burden via their controls + DPA.
- Year 2: Add Sophie's own audit logs, retention automation, written
  incident plan, IRB protocol for SoTL data.
- Year 3+: Pursue Sophie's own SOC 2 Type II (~$30–80K with Vanta /
  Drata) if scaling beyond Anna's courses.

A dedicated explainer doc lands at
`docs/website/explanation/lms-integration-and-compliance.md` when
Tier 3 work approaches; both the explainer and the ADR locking in
LTI 1.3 + pseudonymous-first are **designed in from day one** so
Tier 3 layers on without retrofitting.

## Content hierarchy

```
Course (top level)
├─ Course Info        ── About, instructor info, contact, philosophy
├─ Syllabus           ── (often standalone; can live in Course Info)
├─ Schedule           ── Week-by-week timeline (cross-cutting view, auto-aggregates
│                        any artifact with a due date)
├─ Content            ── topic hierarchy ────────────────────────────────────┐
│   └─ Section [typed: module / phase / track / unit-block]                  │
│       ├─ Section-level artifacts (intro, synthesis, equation-collection,   │
│       │   practice-set, concept-map, review-checklist, ...)                │
│       └─ Subsection (auto-grouped by artifact type; OR explicit if         │
│           instructor wants subsection commentary)                          │
│           └─ Unit [typed: lecture / project / lab / topic]                 │
│               └─ Artifact [typed: reading / slides / spec / rubric /       │
│                   lab-notebook / media / practice / worked-example / ...]  │
├─ bridge: ...        ── 0..N per course; custom label (Prerequisites /
│                        Foundations / Bridge / Python Bootcamp / etc.);
│                        same Unit/Artifact contract internally
├─ Assignments        ── Standalone assignments (lecture-shape) OR auto-
│                        aggregated from Unit[project] (project-shape)
├─ Exams              ── Midterms, finals, quizzes (low-stakes hosted;
│                        high-stakes stay in Canvas until Tier 3)
├─ Computational Labs ── Pyodide-driven (Tier 2)
├─ Library            ── Registry cheatsheets + Spec pages:
│   ├─ Equations      ── /equations/ + /equations/<slug>/
│   ├─ Glossary       ── /glossary/ + /glossary/<term>/
│   ├─ Misconceptions ── /misconceptions/ + /misconceptions/<slug>/
│   ├─ Key Insights   ── /insights/ + /insights/<slug>/
│   ├─ Figures        ── /figures/ + /figures/<slug>/
│   ├─ Deep Dives     ── /deep-dives/ + /deep-dives/<slug>/
│   ├─ Interventions  ── /interventions/ + /interventions/<slug>/
│   └─ OMI flows      ── /omi/ + /omi/<slug>/
├─ Resources          ── Utility: formula PDFs (now auto-generated from
│                        Equations registry), handouts, external links
├─ Discussions        (Tier 3)
├─ Announcements      (Tier 3)
└─ Instructor         (private, Tier 3 — Console tab + Prep tab)
```

### Schema-level details

- **Section, Subsection, Unit, Artifact** are typed entities (Zod
  schema per [ADR 0003](../decisions/0003-schema.md))
- **Type tag → display name** mapping is per-course-configurable;
  sensible defaults defined per type
- **Internal types stable** (used by pedagogy graph + audit tooling)
  while display names vary per course
- **Cross-references typed** (e.g., assignment declares
  `references: [unit-id, equation-id, misconception-id]`;
  pedagogy-index extractor audits the reference)

### What ASTR 201 looks like under this hierarchy

```
Course: ASTR 201 — Astrophysics I
├─ Course Info, Syllabus, Schedule
├─ Content
│   └─ Section[module]: M1 Foundations
│       ├─ intro.mdx, synthesis.mdx, equation-collection.mdx,
│       │   practice-set.mdx (Section-level artifacts)
│       └─ Subsection (auto): Slides | Readings | Resources
│           └─ Unit[lecture]: L1 — Why ASTR 201 is Different
│               └─ Artifact[slides], Artifact[reading]
│   └─ Section[module]: M2 HR Diagram, ...
├─ bridge: "Math & Physics Prereqs" (custom label)
├─ Assignments, Exams, Library, Resources
└─ ...
```

### What ASTR 596 looks like

```
Course: ASTR 596 — Modeling the Universe
├─ Content
│   └─ Section[phase]: Phase 1 — Foundations
│       └─ Subsection (auto, Unit-grouped default for project-shape)
│           └─ Unit[project]: P1 Stellar Populations
│               └─ Artifact[spec], Artifact[rubric], Artifact[lab-notebook]
├─ bridge: "Python Bootcamp"
├─ bridge: "Math Refresher"     ← multiple bridges supported
├─ Computational Labs, Library, ...
```

## Module template — canonical structure

What an "official" Sophie Module should contain. Curriculum-CI
([ADR 0045](../decisions/0045-pedagogical-diff.md)) enforces tier
markers at build time.

```
Section[module]: M1 Foundations

★ REQUIRED Section-level artifacts:
  intro.mdx                  ── Advance organizer, structured LOs,
                                connection-to-prior-knowledge, roadmap
  practice-set.mdx           ── Interleaved, mixed-topic, FSRS-scheduled,
                                faded → independent → challenge

☆ RECOMMENDED Section-level artifacts:
  synthesis.mdx              ── Integrative recap, cross-Unit conceptual links,
                                module-level misconceptions, bridge to next
  equation-collection.mdx    ── Auto-pulled from Equation Registry;
                                instructor curates; includes biography
                                ([ADR 0046](../decisions/0046-equation-biography.md))
  review-checklist.mdx       ── LO self-check; entries link to diagnostics;
                                logs to FSRS

○ OPTIONAL Section-level artifacts:
  concept-map.mdx            ── React Flow ([ADR 0016](../decisions/0016-concept-maps.md))
                                visual summary
  misconception-summary.mdx  ── Module-level misconception bundle
  historical-context.mdx     ── Narrative thread
  further-reading.mdx        ── Annotated bibliography
  reference-tables.mdx       ── Module-scoped reference; mirrors to Resources

Units (★ REQUIRED at least one):
  Unit[lecture] L1
    reading.mdx              ── ★ REQUIRED for lecture-shape Units
                                Inline: <Predict>, <RetrievalPrompt>, <WorkedExample>,
                                <FadedPrompt>, end-of-reading ≤3 practice problems
    slides.mdx               ── ★ REQUIRED for lecture-shape Units
    practice.mdx             ── ○ OPTIONAL Unit-level blocked practice
  Unit[lecture] L2, L3, L4...
```

### Curriculum-CI enforcement

- **★ REQUIRED missing** → build error; module can't ship
- **☆ RECOMMENDED missing** → warning in `sophie diff`
  ([ADR 0045](../decisions/0045-pedagogical-diff.md)), surfaced in
  Instructor Console (Tier 3) as audit findings
- **○ OPTIONAL missing** → silent

The audit also validates *contents*: `intro.mdx` must declare LOs;
`practice-set.mdx` must have interleaved topic tags; `synthesis.mdx`
must reference Unit IDs from within the Module.

### AI co-authoring loop ([ADR 0030](../decisions/0030-authoring-model.md)'s 4-role expert panel)

| Role | Primary contribution |
|---|---|
| **Author** | Drafts intro structure, synthesis prose, equation-collection commentary |
| **Pedagogy expert** | Drafts LOs, suggests retrieval prompts, scaffolds practice progression, applies threshold-skills framing |
| **Domain expert** | Content-correct equation derivations, validates physics, suggests historical context |
| **Brainstorming expert** | Cross-Module integration, alternative framings |

**Practice-set workflow**: AI generates ~20 draft interleaved problems
from Unit content + LO tags; instructor curates, deletes ~half, refines
rest, adds harder variants. Instructor time goes into judgment +
refinement, not first-draft creation.

## Pedagogy framework (research-grounded)

Sophie's component contract gains a SoTL-grade set of pedagogy patterns
that go beyond static reading. All Tier 1 unless noted.

### Spaced repetition (FSRS — Free Spaced Repetition Scheduler)

- Spacing itself is **evidence-based** (Dunlosky et al. 2013;
  Cepeda et al. 2008; decades of distributed-practice literature).
  Sophie treats spacing as a foundation, not a hypothesis.
- FSRS is the **modern engineering implementation** of spacing
  Sophie ships: actively maintained, open-source, empirically
  motivated by Anki-community head-to-head benchmarks against
  SuperMemo SM-2 (FSRS outperforms SM-2 on those datasets), and
  more defensible than a hand-rolled review-interval heuristic.
  "Strong engineering choice for shipping spacing," not "scientific
  SoTA in spaced-repetition research" — those are separate claims.
- Library-available, open source
- Per-browser scheduling state at Tier 1+2 (IndexedDB)
- Cross-device sync at Tier 3
- Algorithm targets: items, Units, Sections, Topics, LOs (uniform
  handling; target IDs differ)

### Retrieval practice + generation effect

- Replicated effect: testing-yourself beats re-reading; generation
  beats passive reading
- Sophie's existing `<Predict>` already exemplifies this pattern
- New components below extend it

### Interleaving

- Practicing mixed topics ABAB beats blocked AABB for transfer
- Section-level `practice-set.mdx` is interleaved by construction
- Unit-level `practice.mdx` is blocked (low cognitive load for novel
  skills)
- Both placements complement each other (different cognitive operations)

### Worked examples → faded prompts → independent practice (Sweller)

- Worked example: full solution with epistemic-role annotations
- Faded prompt: solution with progressively hidden steps
- Independent practice: no scaffolding
- Maps to new components below

### Threshold skills / prerequisite knowledge activation (Meyer & Land 2003; Pashler et al.)

- Just-in-time review beats front-loaded review
- Bridges at three scales (room, section, inline component)
  operationalize this

### New pedagogy components (Tier 1)

**Shipped — Wedge B1 (2026-05-22):** the retrieval family lands as a
cohesive trio sharing one internal `<RetrievalCard>` primitive, one
`practice_attempt` persistence shape (per `useRetrievalAttempt`), and
one prefix-typed `target` convention (`eq:` / `gl:` / `misc:` / `lo:` /
`ki:` / `topic:`). LRU stub scheduler for `<SpacedReview>` swaps for
FSRS in Wedge D. See [Wedge B1 design doc](../plans/2026-05-21-wedge-b1-retrieval-family-design.md).

| Component | Role | Status |
| --- | --- | --- |
| `<RetrievalPrompt target="prefix:slug">` | Quick recall question; ungraded; logs `practice_attempt` | **Shipped Wedge B1** |
| `<SpacedReview target="prefix:slug" max={3}>` | Resurfaces past concept's retrieval prompt on schedule (LRU stub; FSRS when Wedge D ships); supports `section="..."` scope (B-follow-up) | **Shipped Wedge B1** (single-target scope; section-scope stubbed) |
| `<SkillReview target="topic:...">` | Inline bridge: retrieval prompt → reveal → optional review; placeholder fallback when slot children absent (Wedge C registry resolution wires the self-closing form) | **Shipped Wedge B1** |
| `<WorkedExample>` | Step-by-step solution with epistemic-role annotations on each step | Wedge B2 |
| `<FadedPrompt>` | Worked example with steps progressively hidden | Wedge B2 |
| `<InterleavedSet>` | Practice set that auto-mixes topics from a declared set | Wedge B2 |

All integrate with the pedagogy graph
([ADR 0044](../decisions/0044-misconception-graph.md) misconceptions,
[ADR 0046](../decisions/0046-equation-biography.md) equation
biographies, [ADR 0058](../decisions/0058-epistemic-component-contract.md)
8-role taxonomy) via typed target IDs.

### Interleaving vs. blocked practice

Both placements are deliberate. **Blocked practice builds initial
fluency** (Unit-level `practice.mdx`): low cognitive load, focused
on novel skill acquisition. **Interleaved practice builds
discrimination and transfer** (Section-level `practice-set.mdx`):
desirable difficulty, mixed topics, FSRS-scheduled. Sequencing
matters — blocked first while skills are novel, interleaved once
fluency exists. This is a real corrective: interleaved-too-early
is a known pitfall (Dunlosky et al. 2013 rate interleaving as
moderate-utility precisely because it depends on prerequisite
fluency).

## Cross-cutting design principles

Three principles that govern every page Sophie ships, regardless of
which cluster authored it.

### Student UX — progressive disclosure, primary action per page

Sophie has *many* pedagogy components. A naive page that surfaces
all of them at once (retrieval prompts + skill reviews + equation
specs + misconception cards + concept maps + Pyodide demos +
adaptive warnings) is cognitive-load chaos for students. The
governance principle (per [ADR 0075](../decisions/0075-student-ux-cognitive-load-governance.md)):

- **Every page has a single primary learning action.** Reading prose,
  working a worked example, attempting a practice problem — one
  thing the student is *doing* on that page.
- **Supporting pedagogy is collapsible, contextual, or sequenced.**
  Use `<Aside>` / `<Spoiler>` / sidebar-toggle / inline-but-quiet
  patterns. Surface secondary content on demand, not by default.
- **Sophie reveals pedagogy at the moment of need**, not all
  pedagogy all the time.
- Per-page-type defaults: a Reading is "read the prose" with
  retrieval prompts collapsed under reveal triggers; a Practice
  page is "solve the problem" with hints behind progressive
  reveals; a Slide is "see the concept" with speaker notes off-screen.

This is the antidote to pedagogical maximalism — the trap of
"if a component exists, every page should use it." A Sophie page
that *looks* simple but rewards exploration with discoverable
pedagogy is the design target.

### Instructor authoring economics

Sophie only works if authoring is fast enough to be the instructor's
default channel rather than a sacrifice they make for pedagogical
purity. The success criterion (per [ADR 0074](../decisions/0074-instructor-authoring-cost-metric.md))
is concrete time-to-author targets, measured per Unit / Section /
Module, that Sophie commits to hitting through AI co-authoring +
schema scaffolding:

- **New Unit (lecture-shape)**: < 30 min including reading skeleton,
  slide outline, 1–2 retrieval prompts, LO declarations
- **Revise existing Unit**: < 15 min for typical post-lecture
  improvement (add equation cross-ref, refine LO wording, add a
  worked example)
- **Section-level practice-set draft**: < 15 min via the 4-role
  AI co-author panel ([ADR 0030](../decisions/0030-authoring-model.md));
  instructor then curates ~half the generated items
- **Module curriculum-CI audit**: < 5 min via `sophie audit`
- **Slide ↔ reading drift check**: < 5 min via `sophie diff`
  ([ADR 0045](../decisions/0045-pedagogical-diff.md))

These targets are tracked as instructor-side SoTL metrics
(ADR 0074 extends ADR 0047's 8-metric measurement plan). If an
authoring task slips past its target, that's an actionable signal
that schema scaffolding or AI co-author prompts need
re-engineering — Sophie's authoring ergonomics are a
first-class research output, not a backstage concern.

### Accessibility — Tier 1 commitment

Accessibility ships with Tier 1, not as a later polish pass.
Sophie's existing infrastructure already underwrites this:

- [ADR 0004](../decisions/0004-component-contract-revisions.md):
  every component PR runs **axe-core** tests; zero violations is
  the merge gate.
- [ADR 0019](../decisions/0019-radix-ui-a11y.md): **Radix UI
  primitives** for menus / dialogs / tooltips / disclosures — ARIA
  semantics + keyboard navigation are wired in by construction.

Course-website-specific extensions Sophie commits to at Tier 1:

- **MathML output** for `<KeyEquation>` (screen-reader-readable
  equations; not just LaTeX → image)
- **Authored alt text** required on every `<Figure>` registry
  entry (curriculum-CI enforced via the pedagogy index)
- **Keyboard navigation** through the slide ↔ reading split-screen
  (Tier 1 killer feature item 1) — no mouse-required pathways
- **Reduced-motion mode** respected for any animation
- **Print / PDF fallback** for every page (handouts, formula
  sheets, readings)
- **Color contrast** validated via the theme tokens
  ([ADR 0005](../decisions/0005-theming.md))

Tier 2 / 3 extensions: transcripts + captions for any video / audio
content; live captioning at Tier 3 (Web Speech API → server
persistence). Accommodations workflow integration (per-student
extended-time on `<Assessment>`) lands with the Instructor room
at Tier 3.

## Library room — registry-driven Spec pages + Cheatsheets

**The "Registry → Spec page + Cheatsheet" pattern** generalizes one
schema decision across all of Sophie's registries. Sophie authors page
templates once per registry type; the registry data populates everything.

### Per-registry Spec pages (auto-generated, one URL per entry)

Example: `/equations/stefan-boltzmann/` renders the canonical Equation
Spec page from registry entry + Equation Biography children +
cross-references:

- `<KeyEquation>` card (LaTeX)
- Plain-language statement
- Epistemic role (Observable / Model / Inference / ...)
- Variables & units (Notation Registry,
  [ADR 0043](../decisions/0043-notation-registry-multirep.md))
- Assumptions
- Validity domain
- Common misuses
- MultiRep links (verbal / graphical / equation / numeric)
- Where introduced (link to Section/Unit)
- Related equations (Equation Graph)
- Worked examples using this equation
- Practice problems exercising it (with FSRS schedule)
- Historical context
- `<RetrievalPrompt>` slot (FSRS-scheduled)

Same pattern for Glossary, Misconceptions, Key Insights, Figures,
Deep Dives, Interventions, OMI flows.

### Cheatsheets (consolidated views)

- Compact card grid (3-up desktop, 1-up mobile)
- Filterable by Section/Module, by role, by topic, by text search
- Sortable by order-introduced, name, role
- **Scope toggle** (Equations especially): "current module" /
  "course-to-date" / "course-wide" / "exam-1" / "exam-2" / "final"
- **PDF export at any filter state** — replaces manually-maintained
  formula-sheet PDFs with auto-generated, always-correct exports

### Component contract

- `<EquationSpecPage equation="stefan-boltzmann" />` — top-level page
  template; Sophie auto-routes registry slugs
- Pulls registry entry + biography + cross-references
- Auditable by curriculum-CI same as readings

## Computational labs (Pyodide)

**Tier 2 deliverable**, but designed at Tier 1 so the component contract
extends from existing pedagogy components.

### Stack

- **Pyodide**: Python compiled to WebAssembly; runs CPython +
  numpy + scipy + pandas + matplotlib + scikit-learn in the
  browser. (JAX-in-browser is **not** assumed by Sophie's Tier 2
  contract — XLA dependencies don't map cleanly onto WebAssembly,
  and the Pyodide-JAX work is experimental. JAX-style demos in
  Sophie use numpy in-browser; JAX proper continues to run locally
  or on HPC, as ASTR 596 already does.)
- **Plotly**: declarative charts; either via Pyodide's Plotly bindings
  or via react-plotly.js in React components
- **No Jupyter notebook UI**: code cells are pedagogical components,
  not free-form tools

### Design principle

Each code cell is authored by the instructor with specific learning
intent (an Observable, Model, Inference, Assumption, etc. — 8-role
taxonomy per [ADR 0058](../decisions/0058-epistemic-component-contract.md)).
Students don't free-form code; they **modify parameters, run, observe**.

### Component inventory

| Component | Role |
|---|---|
| `<PythonCell>` | Execution primitive; runs author-supplied Python in Pyodide; sandboxed; readonly or parameter-editable |
| `<PlotlyChart>` | Declarative plot; pre-bound spec; reactively re-renders when params change |
| `<ParameterControl>` | Slider/select/number wired to Python cell's globals (composes with `<ParameterCursor>` from [ADR 0059](../decisions/0059-linked-representation-state.md)) |
| `<ComputeOutput>` | Typed display: `<NumericalReadout>` / `<TableOutput>` / `<FigureSlot>` |
| `<ComputeAssumption>` (role) | Epistemic annotation on a code cell |

### Integration

Linked-representation state ([ADR 0059](../decisions/0059-linked-representation-state.md)):
`<ParameterCursor>` elsewhere on the page can drive `<PythonCell>`
parameters and reflow `<PlotlyChart>` outputs in lockstep.

### What Pyodide makes possible vs Quarto/MyST

- Live computation **in-page** (no Codespaces bounce)
- JAX/numpy/scipy demos that *run* as students read
- Parameter-explorable simulations
- Zero compute cost (browser does work)
- Zero PII exposure (data never leaves browser)
- FERPA-elegant by construction

## Naming + display flexibility

Type-driven display labels at all levels. Defaults provided; instructor
overrides per course.

| Internal type | Default label | Alternates |
|---|---|---|
| `course-info` | About | Welcome / Start Here |
| `syllabus` | Syllabus | Course Contract / Policies |
| `schedule` | Schedule | Calendar / Timeline / Roadmap |
| `bridge` | (per-course choice) | Prerequisites / Foundations / Bridge / Bootcamp / Fundamentals / custom (e.g., "Python Bootcamp") |
| `assignments` | Assignments | Homework / Problem Sets |
| `exams` | Exams | Assessments / Tests |
| `labs` | Computational Labs | Code Labs / Sandboxes |
| `library` | Library | Reference / Atlas / Compendium / Toolbox |
| `resources` | Resources | Reference / Handouts / Toolbox |
| `discussions` | Discussions | Q&A / Forum |
| `announcements` | Announcements | Updates |
| `instructor` | Instructor (private) | Teaching / Console |

Section-level:

| Section type | Default label |
|---|---|
| `module` | Module N: Name |
| `phase` | Phase N: Name |
| `track` | Track: Name |
| `bridge` | Bridge: Name (visually distinct from modules) |

Unit-level:

| Unit type | Default label |
|---|---|
| `lecture` | Lecture N: Title |
| `project` | Project N: Title |
| `lab` | Lab N: Title |
| `topic` | Topic: Title |
| `skill` | (bridge-only) Skill: Topic |

## Slides ↔ Readings relationship

**Decision: two separate MDX artifacts sharing a pedagogy graph.**

`slides.mdx` and `reading.mdx` within a Unit are independent files.
Neither derives from the other. Both reference shared primitives by ID
(equations, figures, definitions, misconceptions, OMI flows, LOs) via
the Library-tier registries. Slides serve performance (compressed
talking points + reveals); readings serve self-study (full prose
explanation). Same science; different cognitive operations; different
narrative flow.

### Implications

- Schema: `Artifact[type=slides]` and `Artifact[type=reading]` are
  siblings inside a Unit; neither is generated from the other at build
  time
- Pedagogy graph integrity is the source of truth; cross-references
  via `<EquationRef>`, `<FigureRef>`, `<GlossaryRef>`,
  `<MisconceptionRef>`, `<OMIRef>` etc.
- AI co-authoring ([ADR 0030](../decisions/0030-authoring-model.md)'s
  4-role panel) generates one as a starting draft from the other;
  instructor refines; round-trip "diff" view surfaces drift
- Pedagogy-CI extends to slide↔reading drift detection: do slides +
  reading for L3 exercise the same LOs? Do they invoke the same
  equations?

### Tier 1 killer-feature set (4 features, shipped together)

1. **Synchronized slide ↔ reading split-screen**: shared "current
   concept" cursor; scrolling either side advances the other to the
   matching content via shared pedagogy-graph IDs
2. **In-slide Pyodide demos**: `<PythonCell>` + `<PlotlyChart>` +
   `<ParameterControl>` embeddable in any slide; instructor
   manipulates parameters live; students at home see the same slide
   + can run themselves
3. **Predict-then-Reveal slides with FSRS-tracked responses**:
   prediction prompt → reveal pattern at slide-deck granularity;
   responses log to FSRS for spaced review
4. **Auto-generated lecture handouts**: PDF export with configurable
   scope (slide thumbnails + notes / slides 6-up / speaker notes only
   / key talking points); replaces manual handout workflow

### Other capabilities enabled (Tier 1 + 2)

- Presenter mode (instructor view: current slide + speaker notes +
  timer + upcoming + audit findings)
- Reader mode (post-lecture: slide + adjacent reading paragraph +
  linked equation specs + retrieval prompts)
- Inline cross-references bidirectional across slides ↔ readings ↔
  Library
- Cumulative concept-map sidebar (per-browser progress)
- Slide bookmarks + student notes (per-browser)
- Speaker notes (`::: notes` block in slides.mdx; rendered only in
  presenter mode)
- Adaptive presenter hints (Tier 2: instructor sees suggestions based
  on opt-in anonymized diagnostic state)
- Slide-companion practice (Tier 2: 1–3 related practice problems per
  slide)

### Tier 3 capabilities (deferred)

- Multi-device live lecture sync
- Per-slide Q&A threads
- Annotation overlay persistence across semesters
- Slide-level cohort analytics (SoTL surface)
- Recording integration with slide↔video timestamp sync
- Live captioning + transcription (Web Speech API → server
  persistence)

### Slide engine package

**Decision: new `@sophie/slides` package wrapping Reveal.js** (per
[ADR 0006](../decisions/0006-slides.md)).

Package owns:

- Reveal.js integration + Sophie theme application
- Presenter mode (instructor-only UI)
- Speaker notes rendering
- Slide-to-slide transitions
- In-slide pedagogy component wiring (Pyodide, Predict-Reveal, etc.)
- Print export (auto-handouts)

Consumers: `@sophie/astro` page templates for `slides.mdx` artifacts.
Allows slide stack to evolve independently of general
`@sophie/components`.

## Schedule entity design

**Decision: hybrid — entities own their dates; thin schedule layer
adds non-entity events; Schedule view auto-aggregates both.**

### Date model

- Every event has both a calendar date AND a derived week-number
- Week-number auto-computed from semester start in `course.yaml`
- UI displays whichever fits context

### Where dates live

- **On entities** (Units, Assignments, Exams): `schedule:` frontmatter
  block declares the entity's own dates (lecture date, release/due/grace,
  exam date+location+scope)
- **In `schedule.yaml`** (single, course-level): non-entity events
  (holidays, guest lectures, drop deadlines, special events)
- Sophie's Schedule view queries both sources and aggregates

### Lecture date assignment

**Auto-derive by default; per-Unit override.**

Course declares `semester.meets: [Mon, Wed, Fri]` + `start` +
`holidays`. Sophie walks the calendar, assigns dates to Units in
declared order, skipping holidays. Units can override via explicit
`schedule.date` when needed (special meeting, guest lecturer slot,
etc.). Minimal authoring; correct by default; flexible when needed.

### Event type taxonomy

`lecture` · `assignment-release` · `assignment-due` · `exam` ·
`diagnostic-window` · `holiday` · `guest-lecture` · `special` ·
`office-hours` · `deadline` · `discussion-deadline`

Each type drives display treatment (icon, color, click behavior).

### View modes

| View | Use case |
|---|---|
| **This Week** (default) | Student homepage hub |
| **Per-Week List** | Default Schedule page; chronological cards |
| **Month Grid** | Big-picture semester planning |
| **Per-Unit Timeline** | Drilling into one Lecture/Project |
| **Per-Assignment Timeline** | Tracking one deliverable's lifecycle |
| **FSRS Personal** | Per-student spaced-review prompts (per-browser; private) |
| **Cumulative** | Semester-start-to-today retrospective |

Filterable in every view by event type, Module/Section, completion
status.

### Time zones

- Course declares its TZ once in `course.yaml`
- Students see deadlines in their browser-local TZ
- Tooltip shows course TZ + offset for disambiguation
- Per-browser override available

### iCal export (quiet killer feature)

Static `/schedule/course.ics` rebuilt at deploy; students subscribe
once; their phone calendar always has deadlines. Replaces "screenshot
syllabus into Google Calendar" workflow. Tier 1.

### Mid-semester changes

- Instructor edits entity frontmatter → rebuild → Schedule updates
- Git history is the audit trail
- Optional per-entity `change_log` for human-readable shift notes
- Tier 3: auto-announcements when entity dates change

### Tier placement

All of Schedule is **Tier 1** — purely a derived view over typed
entity frontmatter + a small `schedule.yaml`. No auth, no server, no
Canvas dependency. Per-student FSRS schedule lives in IndexedDB.

Tier 3 adds: cross-device personal calendar sync; auto-announcements
on schedule changes; instructor cohort "who's behind on which
deadline" view.

## Assessment cluster

**Decision: Unified `Assessment` schema with type-variants** for
Assignment / Practice / Diagnostic / Exam. Shared machinery (prompt,
rubric, references, items, feedback, submission); type tag drives UX,
submission flow, and feedback timing.

### Assessment schema

```
Assessment
├─ type: "assignment" | "practice" | "diagnostic" | "exam"
├─ title, description, prompt
├─ schedule: { released, due, late_policy, duration?, time_limit? }
├─ rubric: Rubric (structured grading criteria, first-class artifact)
├─ items: AssessmentItem[]
├─ references: { units, equations, skills, los }
├─ scope: { sections, modules } (for exams)
├─ stakes: "formative" | "low" | "high"
├─ submission: { mode, location }
└─ feedback: { timing: "inline" | "asynchronous", format }
```

### Rubric structure

Criterion-based by default (per-criterion weight + scale + descriptors);
holistic option. Rubrics are first-class artifacts — authored once,
reused across Assessments, renderable for student self-assessment,
audited by curriculum-CI against claimed LOs, peer-review-capable at
Tier 3, AI-rubric-aligned at Tier 3.

### Auto-grading scope

Tier 1/2 auto-gradable item types (per-browser via Pyodide where
needed):

| Item type | How | Pyodide |
|---|---|---|
| `multiple-choice` | Match selected option | No |
| `multiple-select` | Match selected set | No |
| `numerical` | Compare with tolerance | Optional |
| `short-text` | Regex/normalized-string match | No |
| `code` | Run in Pyodide; compare output / pass tests | Yes |
| `plotly-chart` | Compare spec to expected | Yes |
| `concept-map` | Compare student graph to expected | No |
| `equation-derivation` | SymPy in Pyodide | Yes |

### Feedback timing variants

- **Inline** (Practice): immediate right/wrong + explanation; logs to
  FSRS
- **Asynchronous** (Assignment/Exam): feedback after due date; avoids
  gaming

### Open-ended written grading

**Decision: defer AI-rubric-aligned grading to Tier 3.**

Tier 1/2: Sophie hosts rubric + prompt; instructor grades in Canvas
(existing workflow). Keeps Tier 1/2 fully static, no API costs, no AI
compliance surface. AI grading lands when auth + server arrive at
Tier 3 via a small Functions endpoint or full server stack —
instructor sets API key; AI generates first-pass scores; instructor
confirms.

### Mastery model — BKT (Bayesian Knowledge Tracing)

**Decision: BKT as the interpretable baseline mastery model.**

- Per-(student, skill) probability with slip / guess / learn parameters
  (Corbett & Anderson 1995 + refinements)
- Chosen for **interpretability**, not raw predictive performance —
  instructors can read the parameters; small-data robust;
  IRB-defensible; debuggable; modest LOC. Deep Knowledge Tracing
  (DKT, 2015+) and successor neural models exist and would outperform
  BKT on prediction at scale, but BKT is the right *first* model for
  ASTR 201/596-sized cohorts where transparency + small-N stability
  matter more than fractional gains in AUC.
- ~200 LOC implementation; existing JS libraries available
- Per-browser at Tier 1/2 (mastery state in IndexedDB)
- Cohort-aggregated at Tier 3 (instructor view: "70% of students at
  <40% mastery on logarithms")
- **Future:** layer DKT / Performance Factors Analysis / dynamic-BKT
  variants once enrollment scales (Tier 3+) and IRB protocols permit
  larger-N training data. BKT remains the first-line model; richer
  models supplement, not replace.

### Adaptive surfacing

Once skill estimates exist, UI adapts:

- `<SkillReview target="topic:…">` salience varies by mastery (prominent if
  weak; collapsed-by-default if strong)
- FSRS scheduler weights retrieval frequency by mastery
- Schedule surfaces "review topic X before next Tuesday's lecture"
  based on lecture prereq declarations + student mastery
- Practice-set ordering: weakest skills first

### Diagnostic timing — three windows

**Decision: Course-start + mid-course (~Week 6) + pre-exam reviews
(1 week before each midterm + final).**

Layered formative assessment; matches spacing research; each window
updates BKT state. `Assessment[type=diagnostic]` with
`required: completion` (not graded on outcome, just on participation).

### Exam design

`Assessment[type=exam]` extends with `time_limit`, `scope`,
`formula_sheet` (`auto` pulls from Library/Equations cheatsheet at
scope filter), `lockdown` (false at Tier 2; true with proctoring
handoff at Tier 3).

**Tier 2**: low-stakes hosted (practice exams, ungraded review,
non-proctored quizzes). High-stakes proctored exams *stay in Canvas /
in-person*. Sophie provides the auto-generated formula sheet —
replaces manual PDF maintenance.

**Tier 3**: LTI launches into Sophie for high-stakes exams;
proctoring service (Respondus / Honorlock) integrates; AGS posts
grade back to Canvas.

## Tier 2 → Tier 3 migration path

**Decision: hybrid auto-sync + export-import safety net;
forward-compatible schema with stable user_id field.**

### Schema discipline (applies to every persisted record at Tier 1/2)

Every record carries:

- **Pseudonymous user_id**: per-browser UUID at Tier 1/2; LTI `sub` at
  Tier 3 (same field shape; Sophie treats them uniformly)
- **Course_id**: prevents cross-course state merges
- **Schema version**: tracks future migrations
- **Created_at + updated_at timestamps**: LWW conflict resolution per
  [ADR 0029](../decisions/0029-broadcast-channel-lww.md)
- **State_type tag**: typed records (BKT mastery, FSRS schedule,
  Predict responses, etc.)

### Migration UX (on first Tier 3 LTI launch)

1. Sophie checks IndexedDB for state matching course_id
2. Auto-imports if found, mapping per-browser UUID → LTI sub
3. Falls back to manual "Import state from another device" (signed
   JSON paste)
4. Clean Tier 3 start if neither exists (no state existed in the first
   place)

### What migrates

BKT mastery state, FSRS scheduling state, practice attempt history,
Predict responses, bookmarks, student notes, reading progress.
Anything in the typed-record pool.

## Instructor room (scoped for Tier 3)

**Decision: single private Instructor room with Console + Prep tabs;
auth-gated to LTI instructor role.**

### Console tab (active teaching)

- Cohort dashboard (per-Module + per-LO mastery distributions;
  outliers; missed-deadline list)
- Per-student drill-down via Canvas roster (one student's BKT state,
  recent activity, struggle signals)
- Audit findings (curriculum-CI warnings: missing LOs, unreferenced
  equations, rubric ↔ LO drift)
- Adaptive suggestions ("70% of students at <40% mastery on
  logarithms")
- Recent activity feed
- Office hours queue
- AI co-author panel (4-role expert panel surfaces here)

### Prep tab (behind-the-scenes)

- Lesson planning scratchpad per upcoming Unit
- Draft notes (not student-visible)
- Future-week sketches
- AI co-author scratch space
- Personal task list scoped to course

### Schema

`InstructorWorkspace[course_id, user_id, tab: "console" | "prep"]` —
records scoped to (instructor, course). Designed in Tier 1 schemas as
stub; implementation lands with Tier 3 server stack.

## SoTL telemetry

**Decision: xAPI-compatible event schema from day one; IndexedDB at
Tier 1/2 with opt-in export; Learning Record Store at Tier 3.**

### Event format (xAPI actor + verb + object)

```json
{
  "actor": { "id": "pseudo:abc123", "objectType": "Agent" },
  "verb": { "id": "https://sophie/verbs/answered" },
  "object": { "id": "https://sophie/courses/astr201/items/logs-q1" },
  "result": { "success": true, "response": "-3", "duration": "PT4S" },
  "context": { "course": "astr201", "section": "m1-bridge", "skill": "math-logarithms" },
  "timestamp": "2026-01-22T11:35:22Z"
}
```

### Event categories

- **Interaction**: page_view, time_on_page, scroll_depth,
  cross_ref_click, expand_aside, view_slide_n
- **Assessment**: item_attempt (item_id, response, correct,
  time_to_answer), submission, rubric_self_assessment,
  practice_attempt, diagnostic_attempt
- **Pedagogy**: retrieval_prompt_answered, predict_response,
  predict_reveal_viewed, fsrs_review (skill_id, mastery_delta),
  misconception_encountered, skill_review_viewed

### Tier placement

- **Tier 1/2**: events queue in IndexedDB; "Export my SoTL data"
  button generates signed JSON for instructor (opt-in per student,
  IRB-approved)
- **Tier 3**: events ship to a Learning Record Store (self-hosted Yet
  Analytics / Veracity LRS, or managed); cohort analytics on the LRS;
  per-student data accessible only with IRB-approved analyst
  credentials

### Privacy

- Pseudonymous user_id throughout
- Opt-in consent flow per IRB protocol
- Cell-suppression for small cohorts (n < 5) to prevent
  re-identification
- Retention per IRB (typically 5–10 years post-publication)
- PII never enters telemetry

### Surveillance vs. study-tool

Sophie's telemetry surfaces are designed to feel like **personal
study tools, not surveillance**. The student-facing FSRS schedule,
"export my SoTL data" button, and progress visualizations exist
primarily for the student's own use; the SoTL research export is
opt-in and bounded by IRB protocol. Tier 1/2 keep everything
local-first (IndexedDB) — the student's device, not a server,
holds the data. Tier 3 cohort-level analytics for instructors
only ever surface aggregates above the n<5 cell-suppression
threshold. This design choice is load-bearing for student trust;
violating it would damage Sophie's research-instrument framing
just as much as its day-to-day usability.

### Why xAPI

Mature ed-tech standard (IMS-related); open spec; portable across LRS
vendors; defensible research-instrument claim for tenure narrative.

## OER reuse

**Decision: MVP course-level fork (Tier 1) + plugin-level reuse
(Tier 2 per [ADR 0048](../decisions/0048-lds-content-plugin-system.md))
+ delta authoring deferred to a future ADR (research-frontier).**

### MVP — Course-level forking with AGPL attribution (Tier 1)

- Instructor forks course repo (GitHub native)
- Edits anything; total flexibility
- AGPL preserves attribution + source-disclosure
- No upstream sync (manual cherry-pick available)

### SoTA — Plugin-level reuse via ADR 0048 LDS Content Plugin System (Tier 2)

- Course imports specific Library entries from another course
  (e.g., `@anna/astr201-equations@2026.01`)
- Granular: pull just needed entries (equations, misconceptions,
  concept maps)
- Versioned; semver-style
- Attribution preserved per pedagogy entry
- Updateable without merging the full course

### Stretch — Delta authoring (deferred research)

- Instructor expresses "this Module 3 is from Anna's course, with my
  overrides + additions"
- Tooling shows visual delta + upstream
- Selective semantic 3-way merge for upstream pulls
- Research-frontier; future ADR + experimentation pass

## Critical files (current + future)

### Current Sophie source-of-truth files referenced

- `docs/website/decisions/` — ADRs (especially 0001, 0003, 0004, 0007,
  0030, 0038, 0042, 0044, 0045, 0046, 0047, 0058, 0060, 0061, 0063,
  0064)
- `docs/website/reference/chapter-components.md` — chapter-author
  reference
- `CLAUDE.md` — project instructions, locked decisions
- `packages/components/src/components/` — existing component
  implementations
- `packages/astro/src/components/` — existing chrome/layout
- `packages/core/src/schema/` — existing Zod schemas (extend here)

### Future files (to author over multi-sprint roadmap)

- `docs/website/explanation/lms-integration-and-compliance.md` — Tier 3
  docs
- `docs/website/decisions/0065-lti-1-3-integration.md` — ADR (proposed)
- `docs/website/decisions/0066-pseudonymous-first-data-model.md` —
  ADR (proposed)
- `docs/website/decisions/0067-section-level-artifacts.md` — ADR
  (proposed)
- `docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md` —
  ADR (proposed)
- `docs/website/decisions/0069-fsrs-spaced-repetition-engine.md` —
  ADR (proposed)
- `docs/website/decisions/0070-library-room-and-registry-spec-pages.md` —
  ADR (proposed)
- `docs/website/decisions/0071-pyodide-computational-labs.md` — ADR
  (proposed)
- `docs/website/decisions/0072-three-tier-build-priority.md` — ADR
  (proposed)
- `docs/website/decisions/0073-unified-assessment-schema.md` — ADR
  (proposed)
- New packages (proposed): `@sophie/library` (registry page templates),
  `@sophie/pedagogy-fsrs` (spacing engine), `@sophie/compute` (Pyodide
  primitives), `@sophie/lti` (Tier 3 LTI 1.3 client), `@sophie/slides`
  (Reveal.js + Sophie pedagogy wiring)

## Verification / next steps

Brainstorming complete with 27 architectural decisions settled. The
plan is ready to drive multi-sprint implementation.

### Immediate next steps

1. **Draft the 9 proposed ADRs (0065–0073)** to lock in the
   foundational decisions before implementation begins. Each ADR can
   land independently on `main` as a docs commit.
2. **Sprint planning for first implementation pass** — scope the
   schema extensions + first new components.

### First implementation sprint (recommended scope)

Most leverage for least risk:

- **Schema** (`@sophie/core`):
  - Extend Zod schemas for `Section`, `Subsection`, `Unit`, `Artifact`
    typed entities (per Section/Unit/Artifact contract)
  - Add `Assessment` schema with type-variants (assignment/practice/
    diagnostic/exam) and `Rubric` first-class type
  - Add `bridge` Section type variant
  - Stable user_id + course_id + schema-version + timestamp pattern
    for all persisted records (Tier-2→3-migration-ready)
- **Components** (`@sophie/components`):
  - `<RetrievalPrompt>`, `<WorkedExample>`, `<FadedPrompt>`,
    `<InterleavedSet>` (Tier 1 pedagogy)
  - Evolved `<SkillReview>` with retrieval-first surface
  - FSRS scheduler core (per-browser, IndexedDB-backed)
- **Astro pages** (`@sophie/astro`):
  - Library room infrastructure: `/equations/`, `/equations/<slug>/`,
    `/glossary/`, `/misconceptions/`, etc. (auto-routed from
    registries)
  - `<EquationSpecPage>` template + Cheatsheet template with PDF
    export
  - Schedule view (per-week, month grid, This Week widget) + iCal
    export
  - Section-level artifact authoring contract (intro / synthesis /
    equation-collection / practice-set)
- **AI co-authoring** (per [ADR 0030](../decisions/0030-authoring-model.md)):
  - Module template scaffolding workflow
  - Section-level practice-set draft generation from Unit content

### Subsequent sprints

- BKT mastery model + adaptive remediation surfacing (Tier 2 pedagogy)
- Pyodide compute primitives + `@sophie/slides` package wrapping
  Reveal.js
- Diagnostic Assessment variant + course-start + mid-course +
  pre-exam windows
- ASTR 201 migration sprint using
  [ADR 0064](../decisions/0064-chapter-migration-playbook.md) playbook
  + new Module template
- ASTR 596 migration sprint
- Tier 3 LTI 1.3 integration + Instructor room + SoTL LRS

### Open questions surfaced during implementation

Any unforeseen design questions during implementation get logged as
new ADRs or as amendments to existing ADRs. The 27 settled decisions
are load-bearing; further refinement during implementation tightens
detail without overturning structure.

---

**Brainstorming complete:** 2026-05-21. 27 architectural decisions
settled across 8 brainstorming clusters (archetype, compute, tiers,
content hierarchy + bridges + Section artifacts + Module template +
Library, slides↔readings + killer features + `@sophie/slides`,
Schedule, Assessment cluster, final cluster of migration + Instructor
+ telemetry + OER).

## Future capabilities — staged additions

The 27 settled decisions above are load-bearing for Tier 1 + 2 +
the Tier 3 architecture. Additional capabilities have been
*scoped* but not yet committed to specific wedges; they fold into
the wedge sequence (B / C / D / E / F / G + new) as priorities
sharpen. This section catalogs the genuinely-additive ideas to
keep the roadmap honest about what's planned vs. what's still
under consideration.

These are tracked separately from the locked decisions because
their *value* is clear but their *sequencing* is not — they should
land where they fit the wedge plan, not by feature-by-feature whim.

### Tier A — high-leverage, near-term candidates

| Idea | What it adds | Likely wedge home | Status |
| --- | --- | --- | --- |
| **AI Authoring Packets** (`sophie export-ai-context`) | CLI + schema for packaged authoring context: unit goals + prereq skills + existing artifacts + equations + misconceptions + figures + instructor voice contract → handed to AI co-author. Unlocks ADR 0074's authoring-cost targets and ADR 0030's 4-role panel at scale. | Wedge G (AI co-author scaffold) | [ADR 0077 proposed](../decisions/0077-ai-authoring-packets.md) |
| **Student Learning Cockpit** + **Absence Recovery Mode** | Student-side daily entry point (NOT instructor surveillance dashboard): "what's next" + due reviews + weak prereqs + recent progress + "before next lecture" + "catch-up after missing class." Tier 1, local-first, IndexedDB. | New wedge between B and C, or absorbed into late Wedge B | [ADR 0076 proposed](../decisions/0076-student-learning-cockpit.md) |
| **Equation Clinic** | Couples Misconception Graph (ADR 0044) + Equation Biography (ADR 0046) + Worked Examples into a signature STEM-pedagogy surface: catches predictable equation errors (`L = σT⁴` missing surface area; units dropped; `=` vs `∝` confusion) and routes to diagnosis + worked-example fix. | Wedge C (Library room) or later Wedge B (component) | scoped |
| **Model Card / Dataset Card registries** | New Library registries (`models`, `datasets`, `methods`) following ADR 0060's registry-ecosystem pattern. Massive value for ASTR 596 + future COMP courses. | Wedge C (Library expansion) | scoped |
| **Epistemic Difficulty Tags** | `difficulty: { level, kind: algebraic \| conceptual \| representational \| computational \| statistical \| modeling \| metacognitive, bottleneck }` on practice items. Enables "conceptually-hard but algebraically-simple" AI authoring affordances. | Wedge B (component schemas) | scoped |

### Tier B — medium-leverage, Tier 1/2 components

| Idea | What it adds | Likely wedge home |
| --- | --- | --- |
| **Pre/In-class/Post-class Triads** | Unit-level `phases: { pre, live, post }` schema addition (extends ADR 0067; additive, not breaking). Pre = 5-min prep + prereq check + prediction question; Live = slides + demos + clicker prompts; Post = reading + worked examples + spaced review + practice set. | Wedge B (schema extension) |
| **Misconception-Aware Feedback** | `feedback.misconception_triggers` schema on assessment items: pattern → diagnosis → remediation. Turns wrong answers into pedagogy signals. Couples ADR 0044 ↔ ADR 0073. | Wedge B/C (Assessment cluster) |
| **Reasoning Trace component** | Either amends `<OMIFlow>` (ADR 0063) to add a `<Check>` slot (4-slot pattern), or ships a separate `<ReasoningTrace>` component for in-prose epistemic structure. | [ADR 0078 records the composition decision](../decisions/0078-reasoning-trace-composition.md); component lands in Wedge B/C |
| **Pedagogical Learning Mode toggles** | Distinct from Sprint K's `<ViewModeToggle>` (visual). Pedagogical modes: First Pass / Deep Dive / Exam Review / I'm Lost / Catch-Up / Instructor Mode. Same content graph; different traversal. | Wedge B/C (UX layer) |
| **Problem Variation / Isomorphic Practice** | `<ProblemFamily>` schema: one canonical problem + N surface variants. AI-authoring win for transfer + fair exam variants. | Wedge B/G |
| **Worked Example Contrast Pairs** | `<ContrastPair>` component: two problems looking similar but requiring different models. Discrimination training; pairs with interleaving. | Wedge B |
| **Model Comparison Blocks** | `<ModelComparison models={[...]} compareBy={[...]} />`. Depends on Models registry from Tier A. | Wedge C |
| **Narrative Spine / Course Story Arc** | Course-level `narrative_spine` schema: central_question + recurring_models + culminating_capability. Useful for AI co-author context + student motivation. | Wedge B (schema) |
| **"Why This Matters" Blocks** | Component with structured `{scientific, practical, course_future, research_connection}` slots. Engagement-focused. | Wedge B |
| **Exemplars** ("what good looks like") | `<Exemplar type="solution \| plot \| README \| memo">` components for ASTR 596 + COMP-courses. Teaches discriminating quality. | Wedge B/C |

### Tier C — sequencing-dependent / later wedges

| Idea | Notes |
| --- | --- |
| **Instructor Reflection Logs** | Structured post-class reflection (what confused students / what worked / what to change). Lives in Tier 3 Instructor room (Prep tab); Tier 1 markdown-private version possible earlier. |
| **Content Decay / Maintenance Audits** | Extends `sophie audit` (ADR 0045) with broken-link / outdated-reference / orphan-figure / unassessed-LO sweeps. Incremental; tracks `last_validated_date` patterns. |
| **Authoring Recipes** (`sophie create lecture --recipe astr201-standard`) | Templated authoring workflows. Wait until core authoring loop is mature. |
| **Course Design Patterns Library** | Meta-docs cataloging cross-course patterns. Could live in `docs/website/explanation/`; not a code feature. |
| **Static Fallbacks** for interactive components | Component-PR-time engineering decision per ADR 0004 (axe-core gate); decided per component, not as architecture. |
| **Validity Domain Visualizations** (`<ValidityMap>`) | Visual layer on top of ADR 0046's existing `<BreaksWhen>` data. Future component PR. |

### Catalogued but already covered

The following ideas surfaced during external review (ChatGPT
2026-05-21) and are noted here because they look like additions but
in fact intersect already-locked decisions:

- **Assumption surfacing** → ADR 0058's 8-role contract already
  makes Assumption a first-class role; ADR 0046 Equation Biography
  has `<Assumption>` children. The new piece is a Library registry
  page that auto-aggregates assumptions across the course (folds
  into Wedge C, Tier A above).
- **Scientific Judgment Prompts** → an instance of
  `<RetrievalPrompt role="inference">` per ADR 0058, not a new
  component category.
- **Accessibility audit layer** → covered by ADR 0004 (axe-core gate),
  ADR 0019 (Radix UI a11y primitives), ADR 0075 (UX cognitive-load
  governance with curriculum-CI WARN thresholds), and this roadmap's
  `Accessibility — Tier 1 commitment` section.

## References

### Pedagogy / learning science

- **Dunlosky, J. et al. (2013).** "Improving Students' Learning With
  Effective Learning Techniques: Promising Directions From Cognitive
  and Educational Psychology." *Psychological Science in the Public
  Interest*. Rates practice testing + distributed practice as
  high-utility across learners; interleaving as moderate-utility.
  [link][dunlosky-2013]
- **Cepeda, N. J. et al. (2008).** "Spacing effects in learning."
  Foundational distributed-practice evidence.
- **Cognitive load + worked examples** (recent meta-analysis on
  solution-step learning). [link][worked-examples-meta]
- **Interleaving in physics with collaboration** —
  context-sensitivity of interleaving's benefit (2025). [link][interleaving-physics]
- **Bayesian Knowledge Tracing — 25-year review.** Establishes BKT's
  role as the interpretable knowledge-tracing baseline; surveys deep
  KT successors. [link][bkt-review]
- **Meyer, J. & Land, R. (2003).** Threshold concepts framework
  (motivates Sophie's bridge rooms / `<SkillReview>`).
- **Sweller, J.** Cognitive load theory (motivates worked-example →
  faded-prompt → independent-practice progression).
- **Corbett, A. T. & Anderson, J. R. (1995).** Original BKT paper.

### Spaced repetition

- **FSRS — Free Spaced Repetition Scheduler** (Open-Spaced-Repetition
  community; head-to-head benchmarks against SuperMemo SM-2 on Anki
  datasets).

### Platform comparisons (cited in *Sophie in the landscape*)

- **Runestone Academy** — open interactive textbooks. [link][runestone]
- **LibreTexts ADAPT** — OER homework / question-bank platform.
  [link][libretexts-adapt]
- **OpenStax Kinetic** — research infrastructure for higher-ed
  learning studies. [link][kinetic]
- **Perusall** — social-annotation reading platform. [link][perusall]
- **Pyodide** — Python distribution for browser + Node via
  WebAssembly. [link][pyodide]

### Standards

- **IMS Global / 1EdTech: Learning Tools Interoperability (LTI 1.3 /
  LTI Advantage)** — the modern standard for LMS-tool federation.
  [link][lti]
- **xAPI / Experience API** — open spec for learning-record events;
  portable across Learning Record Stores.

[dunlosky-2013]: https://pubmed.ncbi.nlm.nih.gov/26173288/
[worked-examples-meta]: https://www.tandfonline.com/doi/full/10.1080/01443410.2023.2273762
[interleaving-physics]: https://www.sciencedirect.com/science/article/pii/S0959475225002312
[bkt-review]: https://dl.acm.org/doi/10.1007/s11257-023-09389-4
[runestone]: https://runestone.academy/
[libretexts-adapt]: https://asccc-oeri.org/2025/04/16/libretexts-adapt-homework-platform-and-the-new-discuss-it/
[kinetic]: https://openstax.org/research/
[perusall]: https://www.perusall.com/
[pyodide]: https://github.com/pyodide/pyodide
[lti]: https://www.1edtech.org/standards/lti
