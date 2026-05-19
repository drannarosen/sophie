---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - validation
  - sotl
  - measurement
  - metrics
  - lds
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0047: Empirical Validation Plan for the LDS Conformance Foundation

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The seven LDS-conformance foundation ADRs (0040–0046) ship a
substantial set of structural invariants — Pedagogy Contract,
AI Contribution Ledger, Notation Registry / MultiRep audit,
Misconception Graph + Interventions, Pedagogical Diff,
Teaching Decision Records, Equation Biography. The 2026-05-14
foundation review's S2 concern surfaced an honest gap: **Sophie's
contracts make no empirical commitment.** Conformance is
deterministic; learning is not. The structural invariants are
defensible *a priori* (each rests on cited pedagogy literature),
but the platform should not ship without a plan for measuring
whether the contracts actually correlate with the outcomes they
claim to enable.

This ADR commits Sophie to a longitudinal measurement strategy
*using data the platform already collects*. It adds **no new
audit invariants**, **no new schemas**, and **no new student-facing
surfaces**. It defines a two-paper SoTL strategy, names eight
metrics derivable from existing structured artifacts (four
designated as headline metrics for paper #1), and adds two CLI
verbs (`sophie audit --metrics`, `sophie metrics history`) that
emit the metrics from the populated PedagogyIndex + git history.

The scope deliberately stops at *what Sophie can measure from its
own structured data.* Student-outcome telemetry — Hake gain on
concept inventories, calibration improvement, time-on-task
distributions, code-cell error trajectories — is deferred to B9
(Learning Telemetry), which requires its own design pass and an
opt-in consent UI per [ADR 0007](0007-persistence-indexeddb.md).
This ADR is the *instructor-side* measurement layer; B9 is the
*student-side* measurement layer. The instructor layer ships first
so the platform has reportable metrics before student-outcome
infrastructure is built.

## Decision

Sophie commits to a **two-paper SoTL publication strategy** with
**eight metrics derived from existing structured data** (four
headline) and **two new CLI surfaces** (`sophie audit --metrics`,
`sophie metrics history`). No deadlines are attached; the papers
ship when ASTR 201 + COMP 521 have accumulated enough longitudinal
material to support honest claims.

### Paper #1 — *Authoring-side conformance*

**Audience:** SoTL venues, DBER community, AAS Education Practices
(AAS-EPD), Astronomy Education Review.

**Claim:** Sophie's LDS conformance foundation produces structurally-
denser, more-revisable pedagogical artifacts than equivalent
Quarto/JupyterBook output, *for the same instructor*. The
comparison is intra-author (Anna, ASTR 201) across the migration
boundary, so instructor skill is held approximately constant.

**Headline metrics** (the four flagged for paper #1):

1. **M1 — Misconception coverage ratio.** Fraction of declared
   misconceptions in `misconception-graph.yaml` that are addressed
   by ≥1 `<Intervention>` in the consumer chapter set. Targets
   ≥0.8 for a course Sophie considers "well-conformed." Derives
   from MG3 audit data; no new collection.

2. **M2 — TDR provenance rate.** Fraction of chapter-modifying
   commits whose `TDR:` trailer (per
   [ADR 0045](./0045-pedagogical-diff-curriculum-ci.md)'s
   bidirectional traceability convention) is a real TDR reference
   — i.e., `TDR: <N>` for some N — rather than `TDR: none` or
   absent. High rate signals that pedagogical changes carry
   documented intent rather than drifting silently. M2 is the
   "did this change cite a decision?" metric; ADR 0040's TDR
   `affects_anchors:` is its complement ("does the decision say
   it changes this?"). Their intersection is the well-explained
   subset of the course's authoring activity.

3. **M3 — Audit-finding burn-down.** Time series of ERROR +
   WARNING counts per chapter across a semester. A migration's
   structural maturity shows as monotonic decline (or convergent
   plateau) — chapters do not get audited once and forgotten;
   they accumulate revision pressure visible in the audit log.

4. **M4 — Notation Registry coverage.** Fraction of
   `<KeyEquation>` symbols that resolve in the Notation Registry
   (NR1 audit), course-wide. Per-course value; course-comparable
   when both opted into NR. Surfaces whether courses authoring
   the registry use it as actual ground-truth vs. as a token
   ritual.

**Supplementary metrics** (paper #1 may use; paper #2 anchors):

5. **M5 — AI Contribution depth distribution.** Histogram of
   `ai_contribution.ai_workflow.edit_intensity` values across
   chapters. A healthy course shows a mix; an unhealthy one shows
   `skim` clustering with `ai-primary` generation_share.

6. **M6 — Cross-chapter graph density.** Average number of
   `<EquationRef>`/`<MisconceptionRef>`/`<ChapterRef>`/`<TDRRef>`
   resolutions per chapter. Proxy for curricular coherence.

7. **M7 — Pedagogical-diff churn rate.** Frequency-weighted
   `sophie diff` change count per chapter per semester. Identifies
   which chapters are revision hot-spots — useful both for SoTL
   ("which content blocks needed the most evolution?") and for
   operational planning ("where to invest TA time next semester").

8. **M8 — Equation Biography coverage ratio.** Fraction of
   `<KeyEquation>` instances with ≥1 biography child
   (`<Observable>` / `<Assumption>` / `<Units>` / `<BreaksWhen>` /
   `<CommonMisuse>`). Measures uptake of the ADR 0046 surface.

### Paper #2 — *Outcome-side validation*

**Audience:** PER (Physical Education Research) venues, *Physical
Review Physics Education Research*, *European Journal of Physics
Education*; secondary AER.

**Claim:** Structural conformance correlates with student-outcome
deltas in a pre/post quasi-experimental design (ASTR 201 +
COMP 521 vs. pre-Sophie semesters of the same courses, same
instructor). Requires B9 (Learning Telemetry) infrastructure to
be live; not deliverable in v1.

This paper is **named here so its design constraints feed back
into B9.** B9's measurement schema must preserve the joins that
paper #2 will need (per-chapter outcome by per-chapter
conformance state), which means B9's IndexedDB schema must carry
chapter-anchor + semester-anchor + audit-verdict fields. Naming
the paper now is what keeps B9's design honest later.

### CLI: `sophie audit --metrics`

Existing `sophie audit` augmented with a `--metrics` flag. Emits
all eight metrics for the current working-tree state as a JSON
artifact at `.sophie/metrics-<sha>.json`. The schema:

```json
{
  "sha": "a1b2c3d",
  "computed_at": "2026-05-15T08:00:00Z",
  "course": "astr201",
  "semester": "fa26",
  "metrics": {
    "M1_misconception_coverage": 0.83,
    "M2_tdr_provenance_rate": 0.71,
    "M3_audit_findings": {"errors": 0, "warnings": 12, "info": 47},
    "M4_nr_coverage": 0.94,
    "M5_ai_contribution_depth": {
      "light": 3, "moderate": 18, "heavy": 9, "rewrite": 2
    },
    "M6_cross_chapter_graph_density": 8.4,
    "M7_diff_churn": 0,
    "M8_equation_biography_coverage": 0.42
  },
  "by_chapter": {
    "flux-luminosity-distance": { ... },
    ...
  }
}
```

`--metrics` does not block CI; it is an emission, not a gate. The
output is committed by a separate workflow on `main` (not on every
PR), producing a metrics history series under `.sophie/metrics/`.

### CLI: `sophie metrics history`

Aggregates committed `.sophie/metrics-*.json` files into a time
series. Surfaces:

- Per-metric trajectory across SHAs (or across `--semester` tags).
- Cross-course comparison when multiple courses are present in
  the repo (rare; ASTR 201 + COMP 521 are separate consumer repos
  per ADR 0001, but the platform itself can aggregate when given
  multiple metric files).

Output formats: `--format=json` (machine), `--format=table`
(stdout pretty), `--format=csv` (for paper-writing pipelines).

### What does *not* ship

- **No new audit invariants.** Metrics are derived from existing
  data; nothing new is gated.
- **No student-facing surfaces.** Metrics are an instructor-side
  artifact.
- **No outcome-side metrics in v1.** Hake gain, calibration
  curves, etc., depend on B9.
- **No deadlines.** Paper #1 ships after ASTR 201 fa26 closes
  with a comparable Quarto-era baseline. Paper #2 ships after B9
  + a full year of post-foundation data. Research-bandwidth-
  dependent, not roadmap-anchored.

### Forward-compatibility with B9

ADR 0007's IndexedDB schema (per the 2026-05-15 amendment
formalizing fallback semantics) is the persistence substrate B9
will extend. Sophie commits to **not reshape** the existing
`ResponseStore` interface or per-course-database boundary in a
way that breaks B9's eventual telemetry schema. Concrete
constraint: B9 will add tables (`response_outcomes`,
`engagement_signals`) alongside the existing `responses` table,
not replace them. The `ResponseStore` repository abstraction
makes this additive.

## Rationale

### Two papers, not one

A single combined paper conflates authoring-side methodology
(reproducible, structural, repeatable across instructors) with
outcome-side claims (causal, statistical, requiring controls).
Reviewers in DBER tolerate methodology papers without outcome
claims; reviewers in PER demand outcome claims with statistical
backing. The two papers serve different audiences and have
different evidentiary bars.

The methodology paper (paper #1) is also the *honest first paper*:
it ships before outcome data exists, makes claims Sophie can
actually back, and establishes the conformance vocabulary the
outcome paper will reference. Inverting the order — outcomes
first — would force premature claims.

### Headline-vs-supplementary at four metrics

Paper #1 needs a tight metric set for a clean argument. Four
headline metrics matches the SoTL community's typical claim-
density (≈one section per metric); eight-metric papers split
attention. The four headline picks (M1, M2, M3, M4) each cover a
different foundation ADR (0044, 0040, the audit surface itself,
0043), so the paper's argument structure naturally walks the
foundation. M5–M8 are available for sub-sections or future papers
without forcing the v1 ADR to pre-commit which paper they land in.

### No deadlines

This ADR commits to a methodology, not a schedule. Two reasons:

1. **Research bandwidth is variable.** Paper-writing slots
   depend on teaching load, grant cycles, and other
   commitments; calendar-anchoring would force a fictional
   commitment.
2. **Honest claim-building requires honest data.** A paper #1
   draft after only one semester of ASTR 201 conformance data
   is not enough for the intra-author comparison claim; the
   paper ships when the data supports it.

The ADR commits to *the plan*, not *the schedule*.

### Metrics derived from existing data, not new collection

The 2026-05-14 foundation review's S2 hardening could have gone
the other direction: add empirical-measurement audit invariants
to every foundation ADR ("course must measure X by end of
semester"). Rejected: that would have made conformance contingent
on measurement infrastructure that v1 doesn't have (B9). The
honest v1 commitment is "Sophie's structured data is rich enough
that real measurement is derivable from it; here are the eight
metrics." When B9 lands, paper #2's metrics extend this set; v1's
eight stand alone.

### CLI surface as artifact, not gate

`sophie audit --metrics` emits; it doesn't gate. A course with
M1 = 0.3 (low misconception coverage) is not blocked by CI; it
is *measured* and the metric surfaces in `sophie metrics
history`. This matches the audit-as-presence framing (per the
2026-05-15 amendment to `audit-and-ai-authoring.md`): structural
audit gates structural absence; quality lives elsewhere.

The CLI separation (`--metrics` as a flag, `history` as a verb)
mirrors `git diff` vs `git log`: one verb produces a snapshot,
the other walks the series.

### IndexedDB persistence preservation as a B9 commitment

The ADR's most consequential forward-compatibility constraint:
B9's telemetry schema is **additive over the existing
ResponseStore tables, not a replacement.** Without this
commitment, B9 could rebuild the persistence layer to optimize
for outcome-tracking and break the v1 prediction/code-cell/
mission tables. With it, Sophie's persistence surface remains
stable across the ADR boundary, which means consumer chapters
written for v1 keep working when B9 ships.

This is a small, concrete promise — but the kind that compounds
into platform stability.

## Consequences

**Easier:**

- Paper #1 has a clean argument structure (four metrics, four
  ADRs).
- `sophie audit --metrics` is a small CLI addition (no new schema,
  no new gates) — code work fits in one PR.
- B9's eventual telemetry schema is constrained-but-not-pre-
  designed.
- Sophie has a *publishable artifact* before outcome
  infrastructure exists — the methodology paper does not
  require B9.

**Harder:**

- The eight metrics need clear definitions (paper #1 will spec
  them precisely; this ADR sketches them). Definitional drift is
  a real risk; the reference doc
  ([sophie-metrics-cli.md](../reference/sophie-metrics-cli.md))
  pins each metric's exact formula.
- `sophie metrics history` requires committed metric artifacts in
  the repo; that's a small ops discipline (a workflow that
  commits metrics on `main` merges).
- Anna has to actually write the papers. The platform supports it
  but does not produce it.

**Triggers:**

- `sophie audit --metrics` ships as a single PR adding the flag,
  per-metric computation in `packages/astro/src/lib/pedagogy-
  metrics.ts`, and the JSON-artifact emission.
- `sophie metrics history` ships in a second PR (depends on the
  artifact format being stable).
- GitHub Actions workflow `.github/workflows/metrics.yml` (in
  consumer repos, not the platform repo) commits `metrics-<sha>.
  json` on `main` after `sophie audit --metrics` runs.
- B9 ADR (deferred) will reference this ADR's preservation
  constraint when proposing telemetry schema.

## Alternatives considered

### Single combined paper

*Rejected.* Methodology + outcomes in one paper conflates two
audiences and two evidentiary bars. The combined claim would have
to be hedged so heavily ("Sophie's structural conformance may
correlate with outcomes, pending B9 data") that neither the
methodology argument nor the outcome argument lands cleanly.

### Outcomes-first paper

*Rejected.* Requires B9 + multiple semesters of comparable data
before any paper ships. Pushes Sophie's first publishable claim
two-plus years out and forces premature outcome claims.

### Audit-gated empirical metrics (turn the eight metrics into
ERROR invariants)

*Rejected.* Gating M1 ≥ 0.8 as ERROR would make the audit
contingent on judgment Sophie's structural layer cannot make.
("M1 = 0.79 — is that a real coverage gap or a metric artifact?"
is exactly the kind of question the deterministic audit should
not be answering.) Per the audit-as-presence framing, structural
gates and quality measurements stay separate surfaces.

### Outcome metrics in v1

*Deferred to B9.* See above.

### Deadline-anchored publication

*Rejected.* Research bandwidth is variable; data quality matters
more than calendar.

## References

- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDR catalog is the target of M2's `TDR:` trailer references;
  `affects_anchors` + `evidence_type` are the per-TDR structure
  that paper #1's per-decision drill-downs consume.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `ai_workflow` + `instructor_reviewed` are the M5 substrate.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — NR1 is the M4 substrate.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — MG3 is the M1 substrate.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — bidirectional TDR ↔ commit traceability provides M2's
  substrate (`TDR:` commit trailer); diff churn is the M7
  substrate.
- [ADR 0046 — Equation Biography](./0046-equation-biography.md)
  — biography children are the M8 substrate.
- [ADR 0007 — IndexedDB + ResponseStore](./0007-persistence-indexeddb.md)
  — persistence schema that B9 will extend additively per the
  preservation commitment in this ADR.
- [ADR 0030 — Audience + AI author model](./0030-audience-and-ai-author-model.md)
  — AI-primary authoring is the workflow stability that paper #1's
  intra-author comparison rests on.
- [audit-and-ai-authoring.md](../explanation/audit-and-ai-authoring.md)
  — audit-as-presence framing that this ADR honors by keeping
  metrics out of the gate.
- [sophie-metrics-cli.md](../reference/sophie-metrics-cli.md) —
  user-facing CLI spec.
- [`vision/features/backlog.md`](../vision/features/backlog.md) —
  B9 Learning Telemetry entry (deferred).
- [`strategy/papers/`](../strategy/papers/) — paper-by-paper
  planning notes; paper #1 + paper #2 of this ADR map onto the
  existing paper slots.
