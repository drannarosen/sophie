---
title: Accepted-pending-ADR features
short_title: Accepted features
description: Features committed to ship, awaiting their authoring ADR. Each entry includes a motivating use case, design sketch, estimated cost, defended priority claim, and a framed open ADR question.
tags: [vision, features, accepted, adr, sophie-lds]
---

# Accepted-pending-ADR features

Features committed to ship. Each entry has cleared the
[backlog](backlog.md) → accepted gate (see
[Transitions](../transitions/index.md) for criteria) and is awaiting
its authoring [ADR](../../decisions/).

When an entry's ADR is drafted, accepted, and (usually) placed on the
[roadmap](../../status/roadmap.md), the entry moves to *graduated*
status — a one-line pointer with a cross-link.

(a1-teaching-decision-records-tdrs)=
## A1. Teaching Decision Records (TDRs) — graduated 2026-05-14

**Graduated** → [ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
+ [TDR template](../../reference/tdr-template.md).

The ADR resolved the "where do TDRs live?" open question (option c —
in consumer repos, not platform docs), ratified the ADR-shaped
schema, and locked folder-scoped 3-digit numbering. TDRs are now a
first-class Sophie convention; consumer repos copy the template and
begin authoring `teaching-decisions/001-...md` entries.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0040](../../decisions/0040-teaching-decision-records.md)

---

(a2-teaching-move-library)=
## A2. Teaching Move Library — graduated 2026-05-14

**Graduated** → [ADR 0041 — Teaching Move Library](../../decisions/0041-teaching-move-library.md)
+ [Teaching Move Library reference](../../reference/teaching-moves.md).

The ADR resolved the "what's the canonical move taxonomy?" open
question (option c — hybrid: literature-grounded canonical names +
practice glosses) and the "where does `pedagogy_intent` live in code?"
sub-question (centralized TypeScript map at
`packages/components/src/pedagogy/move-index.ts`, populated in a
follow-up code PR). v1 ships 18 named moves across 7 families:
eliciting prior knowledge, confronting misconceptions, worked
examples + fading, representations + comparison, metacognition +
retrieval, diagnostics, and Sophie-native. The reference doc holds
the full library with citations.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0041](../../decisions/0041-teaching-move-library.md)

---

(a3-ai-contribution-ledger-and-pedagogy-contract)=
## A3. AI Contribution Ledger + Pedagogy Contract — graduated 2026-05-14

**Graduated** → [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)
+ [Pedagogy Contract schema](../../reference/pedagogy-contract-schema.md)
+ [AI Contribution schema](../../reference/ai-contribution-schema.md).

The ADR resolved the *"where does the per-course pedagogy contract
live?"* open question (top-level `pedagogy-contract.yaml` at the
consumer repo root, parallel to ADR 0040's `teaching-decisions/`
placement) and the *"what's the minimum required `ai_contribution`
schema?"* sub-question (three-tier shape: required fields —
`drafted_by`, `instructor_reviewed`, `last_review_date`; recommended
— `transparency_note`; optional — `brainstormed_by`, `reviewed_by`,
`instructor_decisions`). Public-facing by default. Together with ADR
0040 (TDRs) and ADR 0041 (Teaching Moves), this completes the
**Sophie LDS conformance triple**: a Sophie-LDS-compliant course
ships TDRs (curriculum audit trail) + Teaching Move references
(pedagogical vocabulary) + Pedagogy Contract & AI Ledger
(accountability layer).

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0042](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)

---

(a4-multirep-notation-registry-and-representation-alignment-audit)=
## A4. MultiRep + Notation Registry + Representation Alignment Audit — graduated 2026-05-14

**Graduated** → [ADR 0043 — Notation Registry + MultiRep + Representation Alignment Audit](../../decisions/0043-notation-registry-multirep-alignment-audit.md)
+ [Notation Registry schema](../../reference/notation-registry-schema.md)
+ [MultiRep component reference](../../reference/multirep-component.md).

The ADR resolved the *"schema shape for Notation Registry"* open
question (declarative YAML at the consumer repo root, parallel to
ADRs 0040 + 0042's repo-root placement; chapters are audited
*against* the registry as an external source of truth, not the
reverse) and the *"what audit invariants ship at v1?"* sub-question
(eight invariants: four NR-prefix on the registry / `<KeyEquation>`
relationship + four MR-prefix on the `<MultiRep>` binding integrity).
The three sub-features ship as one ADR because they're tightly
coupled — splitting would force forward-references that obscure
rationale. `<MultiRep>` uses the children-mode source pattern from
PR-C4's LearningObjectives refactor. The registry is **opt-in** via
`pedagogy-contract.yaml.math_and_units_standards.notation_registry`
so non-STEM courses (creative writing, intellectual history) aren't
forced into empty registries.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0043](../../decisions/0043-notation-registry-multirep-alignment-audit.md)

---

(a5-misconception-graph-and-intervention-library)=
## A5. Misconception Graph + Intervention Library — graduated 2026-05-14

**Graduated** → [ADR 0044 — Misconception Graph + Intervention Library](../../decisions/0044-misconception-graph-and-intervention-library.md)
+ [Misconception graph schema](../../reference/misconception-graph-schema.md)
+ [Intervention Library reference](../../reference/intervention-library.md).

The ADR resolved the *"graph topology"* open question (**hybrid**:
DAG for `prerequisite_misconceptions` — directional, cycle-detected
by audit invariant M5 — and loose `related_misconceptions` for
bidirectional siblings without ordering; parallels ADR 0043's
hybrid `common_confusions` + `related_concepts` modeling) and the
*"intervention reuse model"* sub-question (**hybrid**: 12 canonical
named interventions in a platform-level `intervention-index.ts`
mirroring ADR 0041's `move-index.ts`, plus `type="custom"` for
course-specific bespoke patterns; parallels ADR 0041's hybrid
taxonomy). Also resolved a third open question not in the original
framing: **distributively declared (no central YAML)** — graph
relations are new fields on the existing PR-C4 `<Aside
kind="misconception">` schema; the audit walks the existing
pedagogy index and reassembles the graph. `<Intervention>` nests
inside misconception Asides (children-mode source pattern). The
audit adds 6 new invariants (**MG1–MG3** for misconception-graph
integrity + **I1–I3** for intervention checks) extending PR-C4's
M1–M2.

All five originally-accepted entries now graduated. The
`accepted.md` section becomes a list of graduated pointers;
subsequent accepted entries promote from the backlog.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md)

---

(a6-pedagogical-diff-curriculum-ci)=
## A6. Pedagogical Diff / Curriculum CI — graduated 2026-05-14

**Graduated** → [ADR 0045 — Pedagogical Diff + Curriculum CI](../../decisions/0045-pedagogical-diff-curriculum-ci.md)
+ [`sophie diff` CLI reference](../../reference/sophie-diff-cli.md)
+ [Pedagogical change taxonomy](../../reference/pedagogical-change-taxonomy.md).

The ADR resolved six brainstorm open questions: (Q1) two-axis
taxonomy (granularity ∈ {`structural`, `semantic`, `relational`,
`conformance`} × severity ∈ {`routine`, `substantive`,
`breaking`, `requires-judgment`}) over a one-axis shape — both
reviewer-attention triage and structural detail are needed, and
two axes set up [B5](backlog.md#b5-human-expertise-required-gates)
cleanly. (Q2) Three output formats — text on TTY, JSON on pipe,
markdown via template — with smart default; PR comments and AI
Ledger paste-in get markdown day-one rather than waiting on a
downstream converter. (Q3) Worktree build + persisted
`dist/.sophie/pedagogy-index.json` artifact over a parallel
static-MDX extractor or cache-first scheme — diff and audit
must read the *same* index code path so they cannot disagree
about what the index contains; cache-first is deferred behind
the `--base-index` seam until measurable CI pressure justifies
the invalidation complexity. (Q4) Top-level peer
`sophie diff <ref>` over `sophie audit --diff` — `audit` answers
*"is this good?"* and `diff` answers *"what changed?"*; one verb
per question, mirroring `git diff`. (Q5) AI Ledger report-only
with staleness flagged as `requires-judgment` — the Ledger is
intentionally authored, the HITL mandate applies, write-through
is rejected even opt-in. (Q6) Textbook only in v1 — course-shell
audit invariants don't yet exist; shipping diff over unaudited
course-shell content would emit noise.

A6 is the **sixth graduation** through the staging-area
lifecycle and the **first ADR in the LDS series that adds a
tool over the foundation contracts** rather than a new contract
on content. Unlike A3/A4/A5, A6 does **not** ship a new audit-
invariant family — the diff's correctness is governed by Zod
schema validation, classifier-completeness tests against every
known component type, and CI consumption of the existing
NR/MR/MG/I/PC/AC/D/E/F/C/O/K invariants via the `conformance`
granularity axis. Together with A1+A2+A3+A4+A5, A6 closes the
v1 LDS-conformance-and-revision-discipline tranche: the
foundation declares contracts, audit checks single snapshots,
and diff polices changes across revisions.

**Status.**
- 2026-05-14 — surfaced (speculative) as B3 in [backlog.md](backlog.md)
- 2026-05-14 — brainstorm resolved 6 open questions; promoted
  to accepted-pending-ADR with defended priority claim
- 2026-05-14 — graduated → [ADR 0045](../../decisions/0045-pedagogical-diff-curriculum-ci.md)

---

(a7-equation-biography)=
## A7. Equation Biography — graduated 2026-05-14

**Graduated** → [ADR 0046 — Equation Biography](../../decisions/0046-equation-biography.md)
+ [Equation Biography schema](../../reference/equation-biography-schema.md).

The ADR resolved six brainstorm open questions: (Q1) children-
mode siblings of the `<KeyEquation>` math body, mirroring the
PR-C4 LearningObjectives / ADR 0043 MultiRep / ADR 0044
Intervention SoTA pattern — over prop-extension (array-prop
authoring in MDX is awkward) and over wrapper-component (extra
nesting for no benefit). (Q2) Free-form prose body + optional
`type=` slot on `<Assumption>`; no v1 platform catalog —
physics assumptions partly recur but lack citation-grade
per-type literature, and cross-discipline overlap (astrophysics
vs scientific-computing) makes a single platform catalog
premature; v2 can promote if authoring data shows the need.
(Q3) All three existing rendering surfaces detail-tuned —
`<EquationRef>` hover compact summary, `<ChapterEquations>` + `/library/equations`
full biography with `<details>` disclosure for `<CommonMisuse>`
lists; dedicated `/library/equations/<slug>` page deferred to future
"Equation Pages" ADR. (Q4) Three new E-prefix audit invariants
(E7 INFO, E8 WARNING, E9 INFO) — extending PR-C2's E-prefix
family rather than carving a new EB-prefix; new prefixes earn
their keep when governing new surfaces (NR/MR/MG/I), not when
extending an existing one with new fields. (Q5) Prose-only for
non-`<Units>` biography children — `<Observable>`/`<Assumption>`/
`<CommonMisuse>`/`<BreaksWhen>` are prose; the meaning is the
body; mixing tag-slots with prose-bodies is awkward. (Q6)
Universal scope; per-equation opt-in by virtue of authoring
biography children — no new Pedagogy Contract gate, and all
three new audit invariants only fire when biography children
are present so non-biography-using courses see no audit noise.

A7 is the **seventh graduation** and the **first feature-tier
ADR post-foundation**. Unlike A3/A4/A5 (which added new content
contracts) or A6 (which added a tool over those contracts), A7
extends an existing platform primitive (`<KeyEquation>`) with a
richer schema. The children-mode pattern reuses every piece of
existing infrastructure: the same extractor walks the same
PedagogyIndex; the same render surfaces consume it; the same
diff taxonomy classifies its changes; the only net-new code is
the six child components + three audit invariants.

**Status.**
- 2026-05-14 — surfaced (speculative) as B1 in [backlog.md](backlog.md)
- 2026-05-14 — brainstorm resolved 6 open questions; promoted
  to accepted-pending-ADR with defended priority claim
- 2026-05-14 — graduated → [ADR 0046](../../decisions/0046-equation-biography.md)

---

(a8-omiflow-composite-primitive)=
## A8. `<OMIFlow>` composite primitive

**Status.** **Shipped per [ADR 0063](../../decisions/0063-omiflow-composite-primitive.md)** (2026-05-19).
v1 design + 14 locked decisions captured in
[`docs/plans/2026-05-19-omiflow-design.md`](../../../plans/2026-05-19-omiflow-design.md);
implementation lands across PR-A (schema + extractor + OF-1), PR-B
(React component + stories + axe + VR + smoke fixture), and PR-C
(OF-2 chapter-level conformance + e2e + docs sweep). Pre-shipped
context (preserved below for audit trail): surfaced 2026-05-16
alongside [ADR 0058 — Epistemic Component Contract](../../decisions/0058-epistemic-component-contract.md),
which is A8's prerequisite. A8 is the **canonical compound primitive**
that demonstrates ADR 0058's eight-role contract end-to-end — three
declared slots (`observable`, `model`, `inference`), per-slot role
declaration, and the first chapter-level audit invariant
(*"every `framing: 'OMI'` chapter reaches all three roles"*) bound
to it (graduated as **OF-2** in PR-C).

**Motivating use case.** Sophie chapters declare
`framing: 'OMI'|'PMI'|'custom'` today, but the OMI arc is implicit
in prose. A8 makes it *visible on the page* as a three-panel
composite — observable evidence on the left, the explanatory model
in the middle, the resulting inference on the right — with each
panel carrying its declared epistemic role. ASTR 201 Module 3
(stellar spectra → temperature → composition) is the first chapter
that benefits.

**Design sketch.** Three named slots: `<OMIFlow.Observable>`,
`<OMIFlow.Model>`, `<OMIFlow.Inference>`. Each slot declares
`epistemicRole` per the Reasoning-OS contract. Layout defaults to
three-column on desktop, stacked on mobile. The composite registers
with the pedagogy index extractor (per
[ADR 0038](../../decisions/0038-pedagogy-index-pattern.md)) as a
single OMIFlow node with three role-bearing children. Future audit
invariant: *"chapters with `framing: 'OMI'` SHOULD render exactly
one `<OMIFlow>`."*

**Rough cost.** ~3–5 days (component + schema + audit invariant +
axe-core test + Storybook stories + smoke chapter migration).

**Defended priority claim.** A8 is the *minimum viable proof* that
ADR 0058's contract pays off. Without it, the eight-role taxonomy
remains conceptual. With it, the contract has a working compound-
primitive instance that future C-tier components (A9, A10) extend.
A8 ships before A9–A11 because it is the smallest piece that
validates the larger thesis.

**Open ADR questions.**
- How does `<OMIFlow>` interact with the chapter-level
  `framing: 'OMI'` discriminator? (One-to-one match? Multiple
  OMIFlows allowed per chapter? At least one required?)
- Does `<OMIFlow>` declare a `description=` or `concept_ref=`
  attribute that ties the three slots together as "one analytical
  argument," analogous to the way Equation Biography children tie
  to one `<KeyEquation>`?
- Does the audit invariant fire as INFO, WARNING, or ERROR? (Likely
  WARNING — strong nudge, not a correctness gate.)

---

(a9-assumptionstack)=
## A9. `<AssumptionStack>` togglable assumption list

**Status.** Accepted-pending-ADR. Surfaced 2026-05-16 alongside
[ADR 0058](../../decisions/0058-epistemic-component-contract.md).
Prerequisite: ADR 0058 (contract) + A11 (linked-rep state, for the
interesting version where toggling propagates to other views).

**Motivating use case.** Most derivations rest on a stack of
unstated assumptions — *"hydrostatic equilibrium, ideal gas EOS,
spherical symmetry."* Today these are at best `<Assumption>` children
of an equation; at worst they're invisible prose. A9 surfaces them
as a togglable list at the analysis level, with each entry carrying
role `assumption` (or `approximation` for entries with a named
validity domain). Toggling an assumption "off" should be legible
even before A11 propagation lands; A11 makes the toggle *do*
something (linked views update).

**Design sketch.** `<AssumptionStack>` wraps `<AssumptionStack.Entry>`
children, each declaring role (`assumption` default, `approximation`
opt-in via attribute) and optional `validity_domain=` prose.
Toggling pre-A11 is purely visual (a strikethrough on the entry).
Post-A11, toggle state participates in the page's linked-rep cursor
so that *"with degeneracy off"* updates the stellar-structure plot.

**Rough cost.** ~3–4 days for the pre-A11 visual version; ~1 week
incremental for A11 integration.

**Defended priority claim.** Ships after A8 because A8 demonstrates
the contract in the simplest case (three orthogonal slots); A9 is
the slightly more complex case (a variable-length list of one
role-type with an opt-in variant). A9 before A10 because
assumptions are a more universal STEM teaching surface than
uncertainty overlays.

**Open ADR questions.**
- Does `<AssumptionStack>` produce a graph relation in the
  pedagogy index (assumptions linked to the equation or section
  they govern)? Likely yes, mirroring
  [ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md)'s
  graph approach.
- How does this compose with
  [ADR 0046](../../decisions/0046-equation-biography.md)
  `<Assumption>` children of `<KeyEquation>`? Same component
  reused, or separate primitives with a shared underlying schema?

---

(a10-uncertaintylens)=
## A10. `<UncertaintyLens>` overlay

**Status.** Accepted-pending-ADR. Surfaced 2026-05-16 alongside
[ADR 0058](../../decisions/0058-epistemic-component-contract.md).
Prerequisite: ADR 0058 (the role `uncertainty` is one of the
eight). The interesting version depends on A11 for cross-view
synchronization.

**Motivating use case.** Most STEM figures hide uncertainty — they
render the "best fit" curve cleanly and relegate error bars to a
small ± in a caption. A10 inverts this: an `<UncertaintyLens>` is
a toggleable overlay on any compatible figure (transit fit,
posterior, ensemble simulation, parameter sweep) that reveals
posterior spread, error bars, model degeneracy, or ensemble bands
as a first-class visual layer. Goal: students *see* uncertainty
as the normal state of scientific knowledge rather than as
optional decoration.

**Design sketch.** `<UncertaintyLens figure="id" mode="posterior|errorbars|ensemble|degeneracy">`
wraps a child figure and renders the named uncertainty representation
as an overlay layer. The lens declares role `uncertainty`; the
underlying figure declares its own role (`observable`, `inference`,
`model`). Future visual-grammar tokens (per
[ADR 0005](../../decisions/0005-theming-three-layers.md))
will hint the overlay color/translucency.

**Rough cost.** ~1 week for the static overlay; +3–5 days for A11-
linked dynamic uncertainty (e.g., posterior bands that update as a
parameter cursor moves).

**Defended priority claim.** A10 is the **uncertainty-as-first-
class-content** showcase. The Reasoning-OS thesis claim *"science is
uncertainty-dominated; education should encode that"* is hollow
without at least one component that operationalizes it. A10 is
that component. Defers to A8 and A9 because uncertainty visuals
are visually showy but lower frequency in actual ASTR 201 / COMP
521 content than OMI flows and assumption stacks.

**Open ADR questions.**
- What's the canonical underlying figure type? Observable Plot
  (per [ADR 0021](../../decisions/0021-observable-plot-data-viz.md))
  with overlay groups? A custom canvas surface?
- How are posterior samples passed to the lens — inline JSON,
  loaded from a `.npy`-equivalent, or computed at build time from
  a pedagogy index field?
- Does the lens have a "scrub through samples" interaction, or is
  the visualization static-on-toggle?

---

(a11-linked-representation-state-primitive)=
## A11. Linked-representation state primitive — graduated 2026-05-16

**Graduated** → [ADR 0059 — Linked-representation state primitive](../../decisions/0059-linked-representation-state-primitive.md)
+ `@sophie/components/interactive/` (Zustand store +
`useLinkedParameter` hook + `<ParameterCursor>` + `<ParameterSlider>`)
+ first-consumer validation in `<BlackbodyExplorer>` exercising four
ADR 0058 epistemic roles (model / observable / inference /
approximation) end-to-end.

The ADR resolved six brainstorm open questions: (Q1) Zustand over
Jotai / Context / bespoke `useSyncExternalStore` — small, hooks-
first, no provider, SSR-safe, per-key selectors. (Q2) Section-
scoped cursors by default, opt-in cross-section sharing via
`cursorGroup="..."` — named in the ADR as the **"explicit widen,
not tighten" principle** generalizable to future Sophie scope-
default decisions. (Q3) No built-in animation primitive —
subscribers handle their own motion (Framer / D3 / CSS); keeps the
primitive ~3 KB and avoids forcing one motion vocabulary across
all consumers. (Q4) SSR-safe via default-value render + client-
mount hydration; `<ParameterCursor>` registers in
`useLayoutEffect`. (Q5) `useInteractive` composability via
snapshot-on-submission (cursor value captured in the durable
`<Predict>` write); A11 itself never persists. (Q6) **Sequencing
flipped from the original plan**: A11 ships before A8. A8 as a
static composite demonstrates nothing the contract doesn't already
say; A8's interesting version needs A11 anyway. Building A8 on top
of A11 from day one avoids the refactor.

A11 graduates as the **eighth graduation** through the staging-
area lifecycle, and the **first feature-tier ADR after the
Reasoning-OS thesis** (ADR 0058). Together with ADR 0058's role
contract, A11 makes Sophie's "Scientific Reasoning OS" claim
concrete: a contract + a primitive + a first consumer that
validates them both.

**Status.**
- 2026-05-16 — surfaced (accepted-pending-ADR) alongside ADR 0058
- 2026-05-16 — graduated → [ADR 0059](../../decisions/0059-linked-representation-state-primitive.md)
  + 371 tests pass, 4 epistemic roles validated in
  `<BlackbodyExplorer>`, full physics validation
  against NIST/IAU reference values

---

## Graduated entries (links only)

Once an entry's ADR ships, this tail section keeps a complete
pointer-only index. The full A1–A5 entries above are retained
above as trace records of the open questions each ADR resolved; a
future tranche may collapse them to one-liners once the rationale
is no longer load-bearing for ongoing work.

- **A1 — Teaching Decision Records (TDRs)** → [ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
  + [TDR template](../../reference/tdr-template.md). Graduated 2026-05-14.
- **A2 — Teaching Move Library** → [ADR 0041 — Teaching Move Library](../../decisions/0041-teaching-move-library.md)
  + [Teaching Move Library reference](../../reference/teaching-moves.md). Graduated 2026-05-14.
- **A3 — Pedagogy Contract + AI Contribution Ledger** → [ADR 0042](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)
  + [Pedagogy Contract schema](../../reference/pedagogy-contract-schema.md)
  + [AI Contribution schema](../../reference/ai-contribution-schema.md). Graduated 2026-05-14.
- **A4 — Notation Registry + MultiRep + Representation Alignment Audit** → [ADR 0043](../../decisions/0043-notation-registry-multirep-alignment-audit.md)
  + [Notation Registry schema](../../reference/notation-registry-schema.md)
  + [MultiRep component reference](../../reference/multirep-component.md). Graduated 2026-05-14.
- **A5 — Misconception Graph + Intervention Library** → [ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md)
  + [Misconception graph schema](../../reference/misconception-graph-schema.md)
  + [Intervention Library reference](../../reference/intervention-library.md). Graduated 2026-05-14.
- **A6 — Pedagogical Diff / Curriculum CI** → [ADR 0045](../../decisions/0045-pedagogical-diff-curriculum-ci.md)
  + [`sophie diff` CLI reference](../../reference/sophie-diff-cli.md)
  + [Pedagogical change taxonomy](../../reference/pedagogical-change-taxonomy.md). Graduated 2026-05-14.
- **A7 — Equation Biography** → [ADR 0046](../../decisions/0046-equation-biography.md)
  + [Equation Biography schema](../../reference/equation-biography-schema.md). Graduated 2026-05-14.
- **A11 — Linked-representation state primitive** → [ADR 0059](../../decisions/0059-linked-representation-state-primitive.md)
  + `@sophie/components/interactive/` (`useLinkedParameter`,
  `<ParameterCursor>`, `<ParameterSlider>`) + first-consumer
  validation in `<BlackbodyExplorer>`. Graduated 2026-05-16.
