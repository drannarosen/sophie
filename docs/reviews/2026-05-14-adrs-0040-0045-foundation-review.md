---
title: Expert review — ADRs 0040–0045 (LDS conformance foundation)
short_title: ADRs 0040–0045 review
date: 2026-05-14
reviewer: claude-opus-4-7 (1M context)
scope: The six foundation ADRs of the v1 LDS-conformance-and-revision-discipline tranche
tags: [review, adrs, foundation, architecture, critique]
---

# Expert review — ADRs 0040–0045 (LDS conformance foundation)

This review covers the six ADRs that graduated 2026-05-14 as the
Sophie LDS foundation tranche:

| | | |
|---|---|---|
| A1 → [ADR 0040](../website/decisions/0040-teaching-decision-records.md) | Teaching Decision Records | per-chapter teaching log, ADR-shaped |
| A2 → [ADR 0041](../website/decisions/0041-teaching-move-library.md) | Teaching Move Library | 18 named moves, 7 families, `move-index.ts` |
| A3 → [ADR 0042](../website/decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md) | Pedagogy Contract + AI Ledger | course YAML + per-chapter frontmatter; public-facing |
| A4 → [ADR 0043](../website/decisions/0043-notation-registry-multirep-alignment-audit.md) | Notation Registry + MultiRep + Alignment Audit | `notation-registry.yaml`, `<MultiRep>`, NR/MR invariants |
| A5 → [ADR 0044](../website/decisions/0044-misconception-graph-and-intervention-library.md) | Misconception Graph + Intervention Library | DAG + loose graph, 12 named interventions, MG/I invariants |
| A6 → [ADR 0045](../website/decisions/0045-pedagogical-diff-curriculum-ci.md) | Pedagogical Diff + Curriculum CI | `sophie diff <ref>` + two-axis taxonomy + three formatters |

The review is critical by design. Anna asked: are these
well-designed, useful, transformative, innovative? Honest answers
require identifying what's weak as well as what's strong.

## Executive summary

**Well-designed?** Mostly yes. The architectural patterns
(children-mode, hybrid taxonomies, invariant-family naming,
opt-in via Pedagogy Contract) are consistent and validated by
repeated application. Specific weaknesses are at the
use-case-coverage layer (cross-course sharing, refactoring
tooling, empirical measurement), not at the architecture layer.

**Useful?** Yes, *conditionally* — useful when AI-primary authoring
is the workflow (which ADR 0030 commits to). The cumulative
authoring lift makes manual authoring of a fully-conformant
chapter prohibitive. Sophie has effectively bound itself to
AI-primary authoring, which is a deliberate choice but worth
naming.

**Transformative?** For Anna's tenure case and SoTL ambitions —
yes. The artifact (course-as-research-object) is genuinely
unusual in higher-ed publishing. For the field at large — only
if open-sourced *and* adopted, and that requires solving the
cross-course coordination problem and the authoring-lift problem.

**Innovative?** Mixed by ADR. The most innovative is 0045
(Pedagogical Diff — no precedent in publishing tooling). The
strongest pedagogical claim is 0044 (Misconception Graph +
Intervention Library — relational graphs over misconceptions are
novel). 0042's public-facing AI Ledger is ahead of where most HE
publishers are. 0040 (TDRs) and 0043 (Notation Registry) adapt
existing patterns; 0041 (Teaching Move Library) is editorial
work over established cognitive-science taxonomy, not invention.

The foundation is well-conceived but has six recurring tensions
that the review surfaces: (1) authoring-lift cost compounds
without a clear amortization plan; (2) cross-course coordination
is absent; (3) no closed-loop empirical validation of whether
conformance correlates with learning outcomes; (4) refactoring
tooling for the rich relational data isn't yet imagined;
(5) several invariants are *presence checks* that don't measure
*quality* and are cheap to game; (6) pre-launch pre-tightness is
a risk if the audits over-constrain authoring in interesting
ways.

## Per-ADR critical assessment

### ADR 0040 — Teaching Decision Records (TDRs)

**Strengths.** Genuinely worthwhile pattern adaptation: ADR-style
governance applied to teaching decisions. The
consumer-repo placement is correct (teaching decisions are
course-specific). Folder-scoped 3-digit numbering avoids
global-counter coordination problems.

**Weaknesses.**

1. **TDR fatigue risk.** ADRs in software have a known anti-pattern:
   teams stop writing them after initial enthusiasm because
   friction isn't matched by perceived value. Teaching decisions
   face the same risk, but worse — instructors are time-poor and
   the audience for a TDR is typically *one person* (the instructor
   themselves in a future semester), which makes the discipline
   harder to sustain.
2. **No closed-loop enforcement.** Nothing in the platform requires
   a TDR when making a pedagogical decision. If you refactor a
   chapter without writing a TDR, the audit doesn't notice.
   Compare to AI Ledger (ADR 0042) which gates on AC1/AC2 audit
   invariants. TDRs have no equivalent gate.
3. **Discoverability is weak.** Where does a chapter point at
   TDR-007? The platform doesn't auto-render TDR links in
   frontmatter or at chapter-end. If TDR-007 explains "why we
   removed the Drake equation from ch3," a reader of ch3 has no
   surface that points at TDR-007.
4. **Granularity ambiguity.** A complex chapter might have 5
   teaching decisions. Do they each get a TDR? Or one TDR per
   chapter listing all? The flexibility is honest but
   unguidance-rich.
5. **Citation/evidence rigor not specified.** A TDR claiming "we
   removed X because students don't engage with it" — what
   evidence? Course evals? Discussion-forum activity? Instructor
   gut? Without an evidence field, TDRs degrade to opinion logs.

**Suggested improvements.**

- Add a `<TDRRef num="007">` component that resolves TDR
  references inline + at chapter-end, mirroring `<EqRef>` /
  `<FigureRef>` patterns. Makes TDRs *discoverable* from the
  chapter.
- Extend the TDR template with `evidence_type` (enum:
  `course_eval | student_artifact | literature | instructor_observation`)
  + `evidence_summary` (1–2 sentences). Soft-fail if missing.
- Add an audit invariant TDR-1 at the course level: courses with
  >N pedagogically-load-bearing components (anything in
  `<KeyEquation>`, `<Aside kind="misconception">`,
  `<LearningObjectives>`) should have ≥M TDRs proportionally. Not
  per-chapter required, but stop the case where a 14-chapter
  course has zero TDRs.

### ADR 0041 — Teaching Move Library

**Strengths.** Citation-grade naming earns external credibility
(SoTL papers, tenure case). Hybrid taxonomy (named + custom) is
the right shape — pure-rigid taxonomies break, pure-flexible ones
don't compound. Centralized `move-index.ts` makes the catalog
discoverable + AI-scaffolding-friendly.

**Weaknesses.**

1. **The 18 moves are not validated against actual authoring
   needs.** They come from cognitive-science literature, but ASTR
   201's chapter authoring might use only 8 of them frequently and
   discover 3–4 missing. Half the catalog risks being dead weight
   while the moves that actually matter are absent.
2. **Move attribution is fuzzy.** What "counts" as a `move-X`
   invocation? Is every `<Predict>` an invocation of
   `predict-observe-explain`? Implicit attribution = audit can't
   measure; explicit attribution = authoring burden.
3. **Move-Library / Intervention-Library (ADR 0044) overlap.**
   Both ship platform-level canonical libraries with hybrid
   taxonomies. The docs hand-wave with "interventions are
   misconception-paired moves" but don't address whether you
   could/should reference a move from inside an intervention. The
   abstractions should converge or the separation should be
   explicit.
4. **No measurement layer.** The library names moves but doesn't
   say "Sophie tracks how many times each move appears in the
   course." Without that, the library is *descriptive* (you can
   name moves) not *analytic* (you can measure curriculum
   coverage or evenness).

**Suggested improvements.**

- Add `move_usage` aggregation in the audit: a course-level summary
  showing "predict-then-reveal used in 3 chapters, contrasting-cases
  in 7, retrieval-with-feedback in 12." Surfaces imbalances
  (over-reliance on one move family) without forcing any threshold.
- Resolve the Move/Intervention overlap: either merge into one
  taxonomy with an `intervention: true` discriminator, or document
  explicitly that they are conceptually separate (interventions
  are *misconception-paired*; moves are *general pedagogical
  actions*) and define a one-to-one or one-to-many mapping where
  it exists.
- Make the 18-move v1 catalog explicitly provisional: tag entries
  as `validated_in: [astr201-ch4, astr201-ch7]` or `validated_in: []`
  to surface which moves have been exercised vs which are
  speculative. Future ADRs can promote/demote based on real
  authoring data.

### ADR 0042 — Pedagogy Contract + AI Contribution Ledger

**Strengths.** Genuinely transformative — public AI Ledger per
chapter is a significant disclosure practice ahead of where most
HE institutions currently are. If this scales, it becomes a model.
Schema invariants (PC1, AC1, AC2) give real teeth. Repo-root YAML
placement is correct and consistent with TDR placement
(ADR 0040).

**Weaknesses.**

1. **`drafted_by` is too coarse.** "claude-opus-4-7" is a *model
   name*, not a process description. The interesting transparency
   claim isn't "AI helped" — it's "AI generated 80% of this
   section, instructor edited, AI re-drafted from feedback,
   instructor approved." That granularity isn't captured.
2. **`instructor_reviewed: true` is binary.** Reviewed how
   thoroughly? Skimmed? Line-by-line? Against the rubric in the
   pedagogy contract? The boolean collapses meaningful variance.
3. **`last_review_date` decay isn't precisely specified.** AC2
   ("last_review_date is not stale beyond the contract's
   threshold") delegates the threshold to the instructor. The
   whole chain is "trust the instructor." Good for HITL but also:
   nothing outside the course audits compliance.
4. **Stigma risk.** Public AI Ledger could *deter* AI use because
   students or peers will judge "this chapter was drafted by AI =
   worse." That's the opposite of what Anna wants per ADR 0030.
   Framing matters — is the Ledger normalizing or stigmatizing
   AI use?
5. **Training-data provenance is silent.** A chapter "drafted by
   claude-opus-4-7" was trained on copyrighted textbooks that may
   include canonical astronomy/physics works. Sophie's Ledger is
   honest about *who drafted* but not about *what the drafter was
   trained on*. This is a real concern for academic rigor and one
   that adversaries will surface.

**Suggested improvements.**

- Replace `drafted_by: "<model>"` with a richer `ai_workflow`
  object: `{model, percentage_ai_generated, iteration_count,
  instructor_editing_intensity: light|moderate|heavy|rewrite}`.
  Captures collaboration shape, not just provenance.
- Replace `instructor_reviewed: true` with structured review:
  `instructor_reviewed: {against: [pedagogy_contract_v1,
  scientific_accuracy, citation_check], depth:
  line-by-line|full-pass|skim, by: <user>}`. Three-tier depth
  matches the actual review patterns instructors use.
- Add an `ai_training_provenance` field at the contract level: a
  brief note about which models the course allows and any
  acknowledged limitations (e.g., "we use claude-opus-4-7; we are
  aware its training data may include uncited astronomy
  textbooks; we cite primary sources independently"). Pre-empts
  the criticism rather than waiting for it.
- Add framing copy in the public AI Ledger render explaining
  *why* the disclosure exists — normalize responsible AI use
  rather than stigmatize it. Without framing, the public view is
  naked data that a critic will read uncharitably.

### ADR 0043 — Notation Registry + MultiRep + Alignment Audit

**Strengths.** The strongest of the six on technical correctness.
Symbol drift between equations / figures / code / prose is a real
source of student confusion; the audit catches it mechanically.
Children-mode `<MultiRep>` is the right shape. Opt-in via
Pedagogy Contract is correct — non-STEM courses shouldn't be
forced into empty registries.

**Weaknesses.**

1. **Authoring infrastructure is heavy.** A course with ~14–18
   chapters might have 50–100 distinct concepts. Authoring all of
   them upfront is a large lift; doing it lazily as chapters
   arrive means early chapters get re-audited as the registry
   grows.
2. **Cross-course symbol sharing is absent.** Sophie targets
   multiple courses (ASTR 201 + COMP 521 + COMP 536) that share
   foundational concepts. Each course's NR is independent. No
   mechanism for shared canonical symbols, which means COMP 521
   and ASTR 201 might canonically diverge on a shared concept
   (e.g., "temperature," "energy," "computation cost") and the
   audit cannot notice.
3. **`<RepCode>` is half-specified.** The component references
   "Cosmic Playground" demos (per the errata commit downgrade),
   but the binding between `<RepCode refName="orbit-simulation">`
   and an actual code artifact is hand-wavy. Either it's a
   `<CodeCell>` in the chapter, or external (a demo? a notebook?),
   or a URL reference. The ADR doesn't lock this.
4. **`<RepIntuition>` is conceptually weak.** It's prose by
   another name. "Physical/conceptual intuition" is what good
   prose does already; making it a separate `<Rep>` type is
   overhead without payoff.
5. **No support for *equivalent representations* (vs *aligned*
   representations).** MultiRep assumes all reps show the same
   concept differently. Sometimes you want two *different*
   equations for the same observable (Wien's law in wavelength
   form `λ_peak = b/T` vs frequency form `ν_peak = aT`). These
   are equivalent under variable substitution but visually
   distinct. MultiRep doesn't have a clean shape for that.

**Suggested improvements.**

- Introduce a platform-level `core-concepts.yaml` (a small
  catalog, ~30 entries — universal physics + computational
  concepts with canonical symbols). Courses inherit-and-extend
  rather than declare from scratch. Reduces authoring lift;
  enforces cross-course consistency for the highest-recurrence
  concepts.
- Drop `<RepIntuition>` or make it explicit syntactic sugar for
  `<RepVerbal kind="intuition">`. Reduces component-inventory
  surface.
- Add `equivalent_to=` attribute to `<RepEquation>` to capture
  variable-substitution equivalence. Audit invariant: declared
  equivalents have notational consistency in both forms.
- Lock the `<RepCode>` binding: prefer in-chapter `<CodeCell>`
  reference; allow external URL with `provenance: <url>` +
  `cache_bust: <hash>`. Stop the hand-wave.

### ADR 0044 — Misconception Graph + Intervention Library

**Strengths.** Possibly the most pedagogically substantive ADR in
the foundation. A misconception graph + intervention library,
audited for completeness, is genuinely new in higher-ed
publishing. SoTL papers about this would land. Universal scope
(not STEM-only) is correct — misconceptions cut across
disciplines. Hybrid graph topology (DAG for prereqs + loose for
related) is well-motivated and consistent with ADR 0043's
hybrid `common_confusions` / `related_concepts` pattern.

**Weaknesses.**

1. **Graph maintenance burden.** Once 30+ misconceptions are
   declared with prerequisites + concept_refs + related links,
   refactoring (renaming a misconception, splitting one into two)
   becomes expensive. The audit catches breakage but doesn't help
   *author* the refactor.
2. **MG2 ordering is fragile.** Prerequisite ordering relies on
   "consumer-repo's declared chapter ordering" (chapters.json).
   If chapters are reorganized, prerequisite relationships might
   break in non-obvious ways. The audit catches the broken cases
   but doesn't help reason about *valid* reorderings.
3. **MG3 (every misconception is addressed by ≥1 intervention) is
   cheap to game.** An author can satisfy MG3 by adding a
   perfunctory `<Intervention type="custom">brief explanation</Intervention>`.
   The invariant fires but the underlying pedagogical question
   ("is this misconception actually addressed?") isn't answered.
   The audit catches *absence*, not *quality*.
4. **Cross-course misconception inheritance is absent.** A
   misconception in ASTR 201 ch4 ("redshift = Doppler motion") is
   the same misconception in ASTR 101 — but each course declares
   it independently. Same problem as NR.
5. **The 12 canonical interventions are scoped too narrowly.** The
   four families (Confrontation, Bridging, Restructuring,
   Reinforcement) are misconception-confrontation-focused. Many
   real pedagogical situations need scaffolding interventions
   (e.g., "split a hard problem into a sequence of observable →
   model → inference steps") that don't fit because they aren't
   misconception-paired.

**Suggested improvements.**

- Add a `sophie misconception rename <old-slug> <new-slug>` CLI
  command (or generalized `sophie refactor`) that atomically
  updates all cross-references when an anchor changes. Similar to
  `git mv` but for the relational data.
- Add an `intervention_depth: light|substantial` field to
  `<Intervention>` capturing rough effort. MG3 could check for at
  least one `substantial` intervention per misconception. Raises
  the bar without forcing it.
- Promote intervention scope: either add a fifth family ("Scaffolding")
  for non-misconception-targeted interventions, or split into two
  registries (misconception-targeted, current vs general-pedagogical,
  new). The current scope is artificially narrow.
- Add cross-course inheritance via a platform-level
  `core-misconceptions.yaml` for very-common misconceptions (the
  kind that recur across intro-astronomy textbooks). Courses
  inherit and extend. Reduces declaration redundancy.

### ADR 0045 — Pedagogical Diff + Curriculum CI

**Strengths.** The most genuinely innovative of the six — cross-
revision pedagogical diff is, as far as I can tell, not
implemented anywhere in higher-ed publishing or in the AI-assisted
authoring tooling space. The two-axis taxonomy (granularity ×
severity) is elegant and sets up B5 (Human Expertise Required
gates) cleanly. The "tool over contracts, not new contract"
framing was a real architectural insight; not every ADR needs a
new invariant family.

**Weaknesses.**

1. **Worktree-build cost compounds at scale.** Today's 5–30s builds
   are fine; once ASTR 201 has 18 chapters with rich biographies +
   misconceptions + multi-reps, build times could reach 1–2 min
   per side. CI runs on every PR will feel slow. The `--base-index`
   seam is good but isn't yet operationalized.
2. **`requires-judgment` severity is the load-bearing concept
   that's most under-specified.** What exactly counts as touching
   `ai_policy`? Editing a single word in a definition body? The
   classification rules promise "tested for coverage against every
   known component type" but the spec doesn't say how nuanced the
   rules are. A single bit ("touched the body or not") will
   over-fire.
3. **Markdown output is designed for GitHub PR comments but
   Sophie doesn't yet have PR-comment integration.** Shipping the
   markdown formatter ahead of any consumer is exactly the YAGNI
   violation the project elsewhere disavows. Counter: it's a thin
   template; nearly free. Fair, but the markdown design will
   degrade silently while unused.
4. **Diff is per-PR-snapshot but pedagogical decisions accumulate
   over semesters.** "What changed between sp25 and sp26" is more
   pedagogically interesting than "what changed in this PR." The
   command supports any two refs, but the *naming and ergonomics*
   are PR-centric.
5. **No support for *intentional* changes that look like
   regressions.** If Anna deliberately removes a misconception
   because data showed it didn't recur, the diff sees an MG3-
   related drop and flags it. There's no annotation
   (`intentional: TDR-007`) that suppresses the warning with
   provenance.

**Suggested improvements.**

- Plan the `--base-index` CI-artifact-passing flow in the v1 code
  PR, not as a future seam. Once CI runs `sophie build` once per
  PR, the resulting index artifact is the natural input to
  `sophie diff` against `main`. This avoids the worktree-rebuild
  cost from the start.
- Add `[intentional: TDR-NNN]` syntax to commit messages or PR
  bodies that the diff command recognizes. A diff item annotated
  intentional gets promoted from `breaking` to `substantive` with
  provenance.
- Add a semester-aware `sophie diff @{1.semester.ago}` UX with
  calendar-aware ref resolution. Pedagogical iteration is
  semester-scoped, not PR-scoped.
- Surface precise severity thresholds in
  [pedagogical-change-taxonomy.md](../website/reference/pedagogical-change-taxonomy.md)
  as a table, not narrative prose. Currently the 5% body-word-
  delta and cycle-introduction thresholds are described in
  paragraphs; reviewers need a reference table.

## Systemic-level concerns (cross-cutting all six ADRs)

### S1. Cumulative authoring lift commits Sophie to AI-primary authoring

A single chapter that fully conforms to ADRs 0040–0045 must
declare:

- One or more TDRs (0040) referenced from the chapter or
  implicit via a chapter↔TDR mapping;
- Pedagogy-contract-aligned `ai_contribution` frontmatter (0042);
- Learning objectives with stable anchors and (per future B5)
  judgment flags;
- Definitions with stable anchors;
- KeyEquations with biography children (0046 / A7);
- Figures with caption + alt + credit;
- Misconceptions with prereqs + concept_refs + interventions
  (0044);
- MultiReps for the load-bearing concepts (0043);
- Notation Registry entries for every distinct symbol (0043).

This is realistic for AI-primary authoring with instructor review
(which ADR 0030 commits to), but it's actively hostile to a
non-AI authoring workflow. **Sophie has effectively committed to
AI-primary authoring** because the manual cost of full
conformance is prohibitive. That commitment is defensible — it's
the project's stated thesis — but it should be named explicitly
in a future ADR rather than emergent from the cumulative weight
of contracts.

**Suggested improvement:** add an explicit "Sophie is an
AI-primary-authoring platform" ADR (or amend ADR 0030) that
states the cumulative authoring lift as a deliberate design
consequence, with a section enumerating the per-chapter
declaration count as evidence. This pre-empts the "Sophie is too
heavyweight for solo human authors" criticism by making the
choice load-bearing rather than accidental.

### S2. No closed-loop empirical validation

None of the six ADRs reference a measurement of whether students
actually learn better when chapters conform to the audit
invariants. The invariants are *plausible-sounding* (NR1: symbols
resolve in registry; MG3: misconceptions get addressed) but the
chain from "conformance" → "student learning" is asserted, not
measured.

This is unavoidable pre-launch — there are no students to measure
yet — but it should be acknowledged structurally:

- The SoTL paper Anna eventually writes (B7) should be structured
  to *test* the conformance → learning chain, not assume it.
- A future ADR ("Measurement Plan") should commit to specific
  measurement designs (e.g., the same chapter migrated with full
  conformance vs partial conformance, A/B'd across two sections of
  ASTR 201).
- The platform should ship instrumentation hooks that make this
  measurable (concept-latency timing per ADR 0030's mention of
  "Concept Latency tracking"). Without that, post-launch the data
  to validate the foundation won't exist.

### S3. Cross-course coordination is missing

Each consumer repo is self-contained. There's no platform-level
mechanism for shared notation, shared misconceptions, shared TDR
templates, or shared interventions across Sophie-using courses.
This is fine for Anna's three-course portfolio (ASTR 201, COMP 521,
COMP 536) but it's a *bound* on the open-source story — if 10
external instructors adopt Sophie, each reinvents the core-concept
catalog, core-misconception list, and TDR-evidence-grading
practices independently.

**Suggested improvement:** add a "Sophie Commons" platform-level
package (or set of YAMLs) that ships canonical entries for the
most-recurrent items across disciplines:

- `core-concepts.yaml` (~30 entries: temperature, energy, mass,
  flux, frequency, derivative, integral, iteration, recursion,
  loop, etc. — each with canonical symbol(s) + units).
- `core-misconceptions.yaml` (~20 entries: redshift-as-Doppler,
  small-angle-approximation-always-applies, mutation-doesn't-touch-
  the-array, etc.).
- `core-interventions/` (template interventions for common
  patterns).

Consumer-repo registries inherit and extend, declaring only
course-specific entries. This is the single highest-leverage
addition the foundation could make.

### S4. Refactoring tooling is absent

The relational data established by ADRs 0040, 0043, 0044, 0046
(TDRs, NR concepts, misconception graph, equation biographies)
creates a complex web of cross-references. As courses iterate
(rename a misconception, split a concept into two, replace one
intervention with a richer one), the refactor cost grows
super-linearly.

The audit catches *broken* cross-references but doesn't help
*perform* the refactor. The diff command (0045) reports what
changed but doesn't suggest migrations. The remaining gap is
*intentional structural change* — Anna wants to merge two
misconceptions into one, and Sophie should atomically update
every chapter that referenced either.

**Suggested improvement:** a "refactor" family of CLI commands:

- `sophie refactor misconception <old> --to <new>` (atomic rename,
  updates every cross-ref).
- `sophie refactor concept <old> --split <new1> --split <new2>`
  (split a concept; prompts for each ref to decide which target).
- `sophie refactor equation <id> --rename <new-id>` (atomic
  anchor rename across `<EqRef>`, `<MultiRep refKey>`, etc.).

This is a Phase-4 candidate; not v1, but should be named in the
roadmap so the relational infrastructure has a clear migration
story.

### S5. Several invariants are presence checks, not quality checks

This is endemic across the foundation:

- **MG3** (every misconception is addressed by ≥1 intervention):
  satisfied by a perfunctory custom intervention.
- **E7** (KeyEquation with biography but no Observable): a
  one-word `<Observable>X</Observable>` satisfies it.
- **AC1** (every chapter declares ai_contribution): a chapter
  with `drafted_by: "claude" instructor_reviewed: true
  last_review_date: 2026-01-01` satisfies it without any actual
  review having occurred.
- **PC1** (course has pedagogy-contract.yaml): a trivially-shaped
  YAML satisfies it.

This is unavoidable in v1 — quality is harder to audit than
presence — but the design should acknowledge it explicitly:

> "Sophie's audit invariants verify the *presence and
> well-formedness* of structured pedagogical metadata. They do not
> attempt to verify the *quality* of authored content; quality
> remains the instructor's responsibility. Sophie audits trade off
> for the affordance that *consistent structure makes quality
> easier to inspect and refine* — a chapter with a complete
> structured biography is easier to review for pedagogical quality
> than a chapter with the same content in unstructured prose."

That paragraph in audit-and-ai-authoring.md would honestly frame
what the invariants do and do not do. Currently, the audit's role
is implied to be more thorough than it actually is.

### S6. Pre-launch pre-tightness risk

The audit families are extensive (≥30 named invariants across the
foundation + Bucket-C) but their UX hasn't been touched by a real
authoring session that violates them in *interesting* ways. The
cost of an invariant that's too strict — forcing awkward
authoring workarounds — is high; pre-launch tightness without
iteration is a risk.

**Suggested improvement:** add a "v1 invariant audit" pass after
ASTR 201 Module 1 lands (the first real authoring exercise of the
foundation), explicitly scheduled in the roadmap. The pass:
catalog every WARNING and ERROR fired during authoring, classify
each as "legitimate signal" or "false positive / authoring
friction", and propose loosening or tightening adjustments for v2.
This converts pre-launch tightness from a risk into a learning
loop.

## Innovation honest-rating

Anna asked: are these innovative? Per-ADR honest assessment:

| ADR | Innovation | Honest rating |
|---|---|---|
| 0040 TDRs | Applies ADR pattern from SE to teaching. Not novel as a concept (Stanford's PCK community has analogous practices); novel as platform-enforced contract. | **Mildly innovative.** |
| 0041 Teaching Moves | Cognitive-science move taxonomies exist. Sophie packages them in a centralized index. | **Editorial work, not invention.** |
| 0042 Pedagogy Contract + AI Ledger | Public-facing AI Ledger as structural feature (not disclosure paragraph) is ahead of HE publishing. Pedagogy Contract as YAML is novel in HE authoring (Quarto/MyST don't have an equivalent). | **Genuinely innovative.** |
| 0043 NR + MultiRep + Alignment Audit | Notation registries exist in scholarly publishing. MultiRep as structured component is novel; representational coherence is a known cognitive-science principle. | **Mildly innovative.** |
| 0044 Misconception Graph + Interventions | Misconception catalogs exist in cognitive science. Relational graphs over misconceptions are novel. Audit on intervention pairing is the strongest pedagogical claim of the six. | **Innovative.** |
| 0045 Pedagogical Diff | No precedent in publishing or pedagogical tooling. Two-axis taxonomy is well-designed. | **Most innovative.** |

## Recommendations prioritized

In order of leverage (highest first):

1. **Add a Sophie Commons platform-level shared-catalog package**
   (cross-course concepts, misconceptions, intervention templates).
   Addresses S3, weakens cross-course-divergence concerns, single
   highest-leverage addition. (Suggested: future ADR "Sophie LDS
   Commons.")
2. **Add refactoring CLI tooling** for the relational data
   (sophie refactor misconception | concept | equation). Addresses
   S4 + 0044 weakness 1. Required before authoring volume makes
   refactors prohibitive.
3. **Tighten ADR 0042's structured-review schema**: replace
   coarse booleans with structured `ai_workflow` and
   `instructor_reviewed` objects; add `ai_training_provenance` at
   contract level. Pre-empts the criticism axis where ADR 0042 is
   most exposed.
4. **Add empirical-validation plan** as a future ADR ("Measurement
   Plan"). Addresses S2; structurally important for the SoTL paper
   (B7) and tenure case. Don't ship v1 publicly without naming how
   the conformance ↔ learning chain will be tested.
5. **Add v1-invariant-audit pass** scheduled for post-ASTR-201-
   Module-1. Addresses S6. Cheap to commit to; converts a risk
   into a learning loop.
6. **Frame audit-as-presence-not-quality** honestly in
   audit-and-ai-authoring.md. Addresses S5. Doesn't require any
   code change; just an honest paragraph.
7. **Drop `<RepIntuition>`** (0043 weakness 4) and lock the
   `<RepCode>` binding (0043 weakness 3). Reduces surface; tightens
   an under-specified contract.
8. **Add intervention_depth and move-usage aggregation**
   (0044 weakness 3, 0041 weakness 4). Raises the bar on
   gameable invariants; adds analytic capability without forcing
   thresholds.

## What's missing entirely

Two domains the foundation doesn't yet address that are worth
naming:

### Student data and analytics

ADR 0007 establishes IndexedDB for student response persistence,
but nothing in the foundation establishes how *structured
student data* (predictions, confidence checks, comprehension
gates) feeds back into the audit or the AI authoring loop. A
future ADR ("Learning Telemetry") should establish how Sophie
collects, anonymizes, and surfaces aggregate student behavior in
ways that respect student privacy while enabling pedagogical
iteration. This is foundational for the SoTL story and currently
absent.

### Failure modes and recovery

The foundation assumes the happy path: audit passes, diff
classifies cleanly, ledger is current. There's no ADR on what
Sophie does when conformance *fails* in production: a chapter
ships with a broken `<EqRef>` because the audit was bypassed; a
PR introduces an MG-cycle that wasn't caught; the AI Ledger is
stale by 6 months. The "what does Sophie do when contracts fail
in the wild" surface is unspecified.

A future ADR ("Conformance Failure Modes") should establish the
policy: e.g., audit failures gate CI; runtime breakages display
inline diagnostic notes to readers; stale AI Ledgers trigger an
opt-in "review needed" banner on the public chapter.

## Closing assessment

The foundation is *good*. It is well-architected, internally
consistent, and ambitious. Five of the six ADRs are at minimum
solid pedagogical engineering; two (0044, 0045) are genuinely
novel contributions worth writing about externally. The
weaknesses are real but addressable, and most of the suggested
improvements above are *additions* to the current architecture
rather than rebuttals of it.

The single most important thing for the *next phase* of Sophie
work is making the foundation **exercised under real authoring
load**. Every weakness identified in this review will sharpen or
soften when ASTR 201 Module 1 actually migrates and the audit
fires against real chapter content. Pre-launch architecture
reviews (including this one) are necessarily speculative until
that load lands.

That load is also when the open-source story sharpens. The
foundation as documented today is internally coherent but heavily
shaped by Anna's specific pedagogy + ASTR 201's specific shape.
Whether it generalizes — whether ten other instructors find it as
useful as Anna does — is the real test. The recommendations above
about cross-course Commons and refactoring tooling are the most
defensible bets for making that generalization plausible.

---

**Reviewer note.** This review was generated by an AI reviewer
under instructor supervision. The reviewer has full context on
ADRs 0040–0046 from prior conversation in the same session that
graduated them, plus the project's CLAUDE.md instructions and
memory. The reviewer is not a substitute for external peer review;
the recommendations should be evaluated against Anna's judgment
and revisited as Sophie matures.
