---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - misconceptions
  - interventions
  - graph
  - audit
  - lds
validation:
  status: in-progress
  last_validated_date: "2026-05-17"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit.test.ts
      date: "2026-05-15"
      notes: "MG1 (cycle) + MG2 (dangling/earlier-chapter) audit invariants tested."
    - kind: audit
      ref: packages/astro/src/lib/pedagogy-audit.ts
      date: "2026-05-15"
      notes: "MG1 + MG2 ERROR-grade audit invariants live; graph-extractor populates prerequisite_misconceptions."
    - kind: manual
      ref: docs/website/reference/misconception-graph-schema.md
      date: "2026-05-14"
      notes: "Reference doc shipped with graph schema."
    - kind: manual
      ref: docs/website/reference/intervention-library.md
      date: "2026-05-14"
    - kind: manual
      ref: docs/plans/2026-05-17-intervention-design.md
      date: "2026-05-17"
      notes: "Phase 1 design hardening locked: 12-canonical-intervention library, sub-card render shape, standalone interventions, MG4 console-table format, I4 + MisconceptionGraphPage deferrals, addresses=string|string[] forward-compat. See Revisions §R1–R6 below."
    - kind: deployment
      ref: null
      date: null
      notes: "<Intervention> component + intervention-index.ts + MG3/MG4/I1–I3 audit invariants pending. v1 implementation sprint scheduled (Phase 3 per session plan, β → γ → δ cadence). I4 deferred until ADR 0041 move-index.ts ships; MisconceptionGraphPage deferred to v2; multi-chapter graph at scale deferred to ASTR 201 fa26."
  notes: "Graph schema + first audit pair shipped; 2026-05-17 design hardening locks the v1 ship-shape (12 canonical interventions, sub-card render, no PR-α/PR-ε); intervention runtime + MG3/MG4/I1–I3 audit invariants land in Phase 3 sprint PRs β–δ."
---

# ADR 0044: Misconception Graph + Intervention Library

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[PR-C4](./0038-pedagogy-index-pattern.md) shipped a `misconceptions`
collection in the pedagogy index. Every `<Aside kind="misconception">`
in a chapter currently declares a `name`, a short discriminator, and
long-form content. The audit checks orphans (M1) and basic name
collisions (M2). What it doesn't yet capture:

1. **Misconceptions relate to each other.** *"Universe expands from a
   center"* is a prerequisite to *"redshift is ordinary Doppler
   motion."* *"Brightness is intrinsic"* relates to *"flux and
   luminosity are interchangeable."* Without explicit relationships,
   each chapter rediscovers the graph; cross-chapter dependencies are
   invisible.

2. **Misconceptions have reusable interventions.** The
   "contrasting-cases" intervention (Bransford & Schwartz 1999), the
   Predict-then-Reveal sequence (White & Gunstone 1992), the
   bridging-analogy with declared limits (Clement 1993) — each shows
   up repeatedly across chapters and across courses. Today: each
   chapter authors them from scratch.

3. **Curriculum-design distinctiveness depends on this.** Sophie's
   tenure-case + SoTL claim is that the platform tracks *what wrong
   models students bring + how the course transforms them*. That
   claim becomes demonstrable when the misconception graph + named
   interventions are first-class artifacts.

This ADR is the fifth graduation through the
[staging-area lifecycle](../vision/transitions/index.md) — the
[`vision/features/accepted.md`](../vision/features/accepted.md) A5
entry surfaced the open ADR questions; this ADR resolves them.

It is the **second STEM-adjacent contract** (after ADR 0043's
representation-alignment contract). Unlike A4, A5 is *not*
STEM-exclusive — misconceptions and interventions matter for
history-of-science, science-communication, statistics, and any
discipline where students arrive with intuitions that need explicit
restructuring. A5 stays universal within Sophie LDS.

## Decision

Sophie ships three paired artifacts: an **extended
`<Aside kind="misconception">` schema** carrying graph fields; a
platform-level **Intervention Library** (named canonical interventions
in a centralized TypeScript map mirroring ADR 0041's
`move-index.ts`); and a **`<Intervention>` component** nested inside
misconception Asides via the children-mode source pattern.

### Artifact 1: Extended misconception schema (both source types)

Per [ADR 0038](./0038-pedagogy-index-pattern.md)'s role-aggregation
principle, misconceptions surface via **two source types**:
`<Aside kind="misconception">` (short, marginal-flag form) and
`<Callout variant="misconception">` (long, multi-paragraph contrast).
Both feed `pedagogyIndex.misconceptions` with a `length:
"short" | "long"` discriminator. Both gain the same four new
optional fields:

| Field | Type | Required | Purpose |
|---|---|---|---|
| `prerequisite_misconceptions` | list of misconception `name`s | optional | Misconceptions that must be addressed *before* this one |
| `related_misconceptions` | list of misconception `name`s | optional | Bidirectional siblings without ordering |
| `concept_refs` | list of Notation Registry `concept.id`s | optional | Concepts this misconception attaches to (per ADR 0043) |
| `discipline_scope` | list of strings | optional | Disciplines this misconception applies to (default: implied by course) |

Example:

```mdx
<Aside
  kind="misconception"
  name="universe-with-a-center"
  short="The universe has a center point from which it expanded"
  prerequisite_misconceptions={[]}
  related_misconceptions={[
    "redshift-as-ordinary-doppler",
    "big-bang-as-explosion-in-space"
  ]}
  concept_refs={["redshift", "hubble-parameter"]}
>
  Many students model the universe as expanding from a single center
  point — like a firework or an explosion happening in a pre-existing
  space. The geometry of cosmic expansion is fundamentally different:
  every point is equivalent; there is no center.

  <Intervention type="contrasting-cases" addresses="this">
    Predict what you'd observe if the universe had a center, then
    compare to the actual observation: isotropic Hubble flow from
    every vantage point.
  </Intervention>
</Aside>
```

The full schema spec lives at
[`reference/misconception-graph-schema.md`](../reference/misconception-graph-schema.md).

**Why extend the Aside rather than introduce a new course-level
YAML?** Misconceptions are intrinsically chapter-bound — each one is
"introduced in chapter X." PR-C4's index already aggregates them. A
parallel `misconception-graph.yaml` would duplicate this structure.
The graph emerges from the union of chapter-declared relationships,
walked at build time.

### Artifact 2: Intervention Library

Sophie ships a **platform-level canonical Intervention Library**
modeled on ADR 0041's Teaching Move Library. Each named intervention
has:

- A canonical name (literature-grounded where possible).
- A practice gloss (the everyday term).
- A citation.
- A description.
- A list of misconception families it typically addresses.
- A list of Teaching Moves it overlaps with (per ADR 0041).

The library lives at
[`reference/intervention-library.md`](../reference/intervention-library.md).
v1 ships **12 canonical interventions** across 4 families:

| Family | Interventions |
|---|---|
| **Confrontation** | Contrasting cases; Predict-then-reveal; Productive cognitive conflict |
| **Bridging** | Bridging analogy with declared limits; Anchoring intuition; Concrete-to-abstract scaffold |
| **Restructuring** | Discrepant event; Conceptual exchange; Worked-example contrast |
| **Reinforcement** | Refutation text; Spaced retrieval with misconception probe; Self-explanation against the misconception |

The library is **open to revision** via the same ADR-revisions pattern as
ADR 0041's move library.

### Artifact 3: `<Intervention>` component (children-mode, nested)

The `<Intervention>` component declares an intervention paired with a
misconception. Following the children-mode source pattern
established by [PR-C4's LearningObjectives refactor](./0038-pedagogy-index-pattern.md):

```mdx
<Aside kind="misconception" name="universe-with-a-center">
  Many students model the universe as expanding from a center point...

  <Intervention type="contrasting-cases" addresses="this">
    Predict what you'd observe if the universe had a center, then
    compare to the actual observation: isotropic Hubble flow from
    every vantage point.
  </Intervention>

  <Intervention type="bridging-analogy" addresses="this">
    Bread baking with raisins: from any raisin's perspective, every
    other raisin recedes — no raisin is "the center." Limit: bread
    has an outside; the universe doesn't.
  </Intervention>
</Aside>
```

`<Intervention>` props (hardened 2026-05-14):

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `type` | required | string | Named intervention from the library OR `"custom"` for course-specific |
| `addresses` | optional | misconception `name` \| `"this"` | Which misconception this intervention addresses; `"this"` = the enclosing Aside |
| `name` | optional | string | Required when `type="custom"`; the bespoke intervention name |
| `limits` | optional | inline markdown | Where the intervention breaks down (especially for bridging analogies) |
| `depth` | optional, default `light` | `light` \| `substantial` | **NEW (2026-05-14 hardening)**: two-tier quality signal. `light` — quick mention/clarification, one paragraph or less. `substantial` — worked example or practice opportunity + reflection prompt. Feeds the MG4 audit summary; not gated. |

**On `depth`** (hardened 2026-05-14). MG3 by itself is gameable
(an author can satisfy it with a perfunctory
`<Intervention type="custom">brief mention</Intervention>`). The
`depth` field adds the missing quality signal without strengthening
MG3 — `light` is the safer default since interventions exist and
sometimes appropriately brief (a one-sentence flag is genuinely a
light-touch intervention for a minor misconception). The MG4 audit
surfaces depth statistics so the instructor sees coverage breadth
*and* coverage depth without being gated on either.

A `<Intervention>` can also be authored **outside** a misconception
Aside when the intervention is course-level rather than
chapter-bound:

```mdx
<Intervention
  type="refutation-text"
  addresses="universe-with-a-center"
>
  ...
</Intervention>
```

Full reference at
[`reference/intervention-library.md`](../reference/intervention-library.md).

### Artifact 4: Eight new audit invariants (hardened 2026-05-14 — MG4 + I4 added)

The audit extends [PR-C4's `pedagogy-audit.ts`](./0038-pedagogy-index-pattern.md)
with eight new invariants (originally six; MG4 + I4 added in
the 2026-05-14 hardening pass) split across two prefix families:
**MG-prefix** for misconception-graph integrity + depth, **I-prefix**
for intervention checks + parent-move resolution.

| ID | Severity | Check |
|---|---|---|
| **MG1** | ERROR | `prerequisite_misconceptions` cycle detected (DAG integrity) |
| **MG2** | ERROR | `prerequisite_misconceptions` references a misconception not introduced in any earlier chapter (by the consumer-repo's declared chapter ordering — typically `chapters.json` order or alphabetical `module-NN/lecture-MM` sort) |
| **MG3** | WARNING | Misconception declared but no `<Intervention>` paired with it across the course (subsumes and specializes the existing deferred `M3` — see below) |
| **MG4** (new, 2026-05-14) | INFO | Course-level summary of intervention-depth coverage. Emits a derived statistic in `sophie audit --summary` listing how many misconceptions have ≥1 `substantial` intervention vs how many have only `light` interventions; surfaces depth gaps without forcing thresholds. |
| **I1** | WARNING | `<Intervention addresses="…">` references no known misconception (or `"this"` outside an enclosing misconception Aside/Callout) |
| **I2** | ERROR | `<Intervention type="…">` references a name not in `intervention-index.ts` (and `type !== "custom"`) |
| **I3** | INFO | `<Intervention type="bridging-analogy">` doesn't declare `limits` (Clement 1993 recommends explicit-limits authoring) |
| **I4** (new, 2026-05-14, cross-ADR with ADR 0041) | WARNING | Every canonical intervention's `move:` field (declared in `intervention-index.ts` per ADR 0041 hardening) resolves to a real move in `move-index.ts`. Custom interventions (`type="custom"`) can declare `move=` too; if they do, I4 applies. Couples the Intervention Library and Teaching Move Library structurally — no intervention whose parent move doesn't exist can ship. |

**Relationship to existing M-prefix invariants in the shipped audit.**
The shipped audit ([`pedagogy-audit.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/lib/pedagogy-audit.ts))
already reserves **M1, M2** as **extractor-thrown** errors (about
title / id-derivation mechanics that throw during MDX parse before
the audit pass runs) and **M3** as a deferred orphan-misconception
heuristic that "deferred until we have a usable signal beyond
'no source-of-truth title.'" The Intervention Library *provides
that signal*: a misconception is meaningfully orphan when no
chapter pairs an `<Intervention>` with it (regardless of whether a
title is auto-generated). MG3 therefore **operationalizes the
deferred M3**, but uses the MG-prefix to flag that it's a *new
semantic check*, not the original title-heuristic that M3 was
originally framed as. The follow-up code PR may either implement
MG3 alone and retire the M3 stub, or keep both code paths if the
title-heuristic still adds value as a separate INFO check.

Severity rationale matches ADR 0043 §Artifact-3:

- **ERROR** invariants are graph-integrity violations or reference
  resolution failures. No valid interpretation.
- **WARNING** invariants flag likely pairing gaps but may be
  intentional (a misconception might be intentionally left
  unaddressed in v1 of the course).
- **INFO** invariants surface authoring suggestions (e.g., explicit
  analogy limits per Clement 1993).

### What lives in code vs. what lives in docs

This ADR + its two reference docs ship as **docs only**. The schema
enforcement + components + intervention library code lands in a
follow-up PR:

- `packages/core/src/schema/misconception.ts` — extend
  `MisconceptionEntrySchema` with the four new graph fields.
- `packages/components/src/intervention/index.tsx` —
  `<Intervention>` component with `serialize` separation per
  [ADR 0004](./0004-component-contract-revisions.md).
- `packages/components/src/intervention/intervention-index.ts` —
  the platform-level canonical intervention map (12 named
  interventions at v1).
- `packages/components/src/pedagogy/misconception-graph.ts` —
  build-time graph constructor walking the pedagogy index for
  prerequisite / related relationships; cycle detection.
- Six new audit invariants added to
  `packages/astro/src/lib/pedagogy-audit.ts`.
- axe-core tests per [ADR 0004](./0004-component-contract-revisions.md).

That code PR follows the standard branch + PR cadence per
[`feedback_branch_pr_scope`](../../../) memory.

## Rationale

### Hybrid graph topology over pure-DAG or pure-loose

The handoff framed the topology question as DAG vs loose
`related_to` links. The hybrid answer wins on semantic-fit grounds:

- **Prerequisites are directional + ordering-sensitive.** "You can't
  address X until you've addressed Y" is exactly DAG semantics. A
  cycle (X requires Y, Y requires X) is a curriculum bug; the audit
  must catch it.
- **Sibling relationships are bidirectional + ordering-insensitive.**
  "*Universe-with-a-center* relates to *redshift-as-ordinary-Doppler*"
  doesn't imply ordering; both can be addressed in either order.
  Forcing this into a DAG would either invent fake directionality or
  produce a dense graph that obscures the prerequisite structure.

The hybrid mirrors the precedent set by ADR 0043's Notation Registry
(strict `common_confusions` modeled strictly via `concept_ref`; loose
`related_concepts` modeled loosely).

### Hybrid intervention reuse (named + inline-tagged)

The handoff framed the reuse question as named (rigid) vs
inline-tagged (flexible). The hybrid wins on the same grounds as ADR
0041's hybrid taxonomy:

- **Named canonical interventions earn citation-grade credibility.**
  Citing "contrasting cases (Bransford & Schwartz 1999)" is
  defensible; citing "the spoiler-alerts move" is idiosyncratic.
- **Inline-tagged interventions accommodate course-specific
  patterns.** Some interventions are bespoke to a course (Anna's
  predict-then-reveal-with-stakes framing for ASTR 201's first
  lecture) and don't earn library entries. The `type="custom"` +
  `name` props let chapters declare these without forcing premature
  abstraction.

Audit invariant **I2** verifies named references resolve; custom
interventions pass through.

### One ADR over two smaller ADRs

Misconception Graph + Intervention Library are tightly coupled:
interventions pair with misconceptions; the graph is incomplete
without intervention bindings. Splitting forces forward-references.
Same pattern as ADRs 0042 + 0043: one ADR per coherent contract.

### Extend `<Aside kind="misconception">` over new course-level YAML

The handoff didn't surface this explicitly, but it's a load-bearing
choice. Two alternatives:

- **Course-level `misconception-graph.yaml`** — declarative,
  parallel to ADR 0043's notation-registry.yaml.
- **Extend PR-C4's chapter-embedded Aside schema** — relations
  declared on the misconception itself; graph emerges from the
  union of chapter walks.

The second wins because:

1. **Misconceptions are intrinsically chapter-bound.** Each one is
   *introduced* in a chapter; declaring its relationships at the
   point of introduction colocates the data with the authoring
   context.
2. **PR-C4 infrastructure already aggregates them.** A separate YAML
   would duplicate the existing index.
3. **Notation Registry vs misconception graph have different
   granularities.** Symbols span chapters (must be declared
   centrally); misconceptions originate in chapters (can be declared
   distributively).

The cost: a misconception's relationships are split across the
chapters that reference it. The audit walk reassembles the full
graph at build time; the dev preview displays the assembled graph at
`/about-this-course/misconception-graph/` (similar to ADR 0043's
notation route).

### `<Intervention>` nested inside Aside (children-mode)

The children-mode source pattern — `<Aside>...<Intervention/></Aside>` —
follows PR-C4's LearningObjectives refactor + ADR 0043's `<MultiRep>`
pattern. Same rationale: mechanical extraction, AI-scaffoldable, JSX
readability for human authors.

The Aside-nested form keeps misconception + intervention adjacent in
the chapter source — the author writes them as a unit, exactly as
they pedagogically pair. The alternative (separate `<Intervention
addresses="…">` blocks elsewhere in the chapter) loses this
authoring affordance and creates resolution lookups that are easier
to break.

Course-level interventions outside an Aside are *allowed* (when an
intervention spans multiple chapters or is declared at chapter
start) but the *default* form is nested.

### v1 invariant list: 8 new invariants (MG1–MG4 + I1–I4)

Originally framed as 6 invariants; expanded to 8 in the 2026-05-14
hardening pass with MG4 (intervention-depth coverage summary) +
I4 (cross-ADR parent-move resolution per ADR 0041).

MG1 + MG2 + MG3 cover graph-integrity + pairing semantics (cycles,
prerequisite ordering, orphan-with-no-intervention). MG4 adds the
depth-coverage summary — a quality signal that nudges authors
toward substantial interventions without gating the existing MG3
on depth. I1 + I2 + I3 cover reference resolution + authoring
suggestions (unknown-address, unknown-type, missing-limits-on-
bridging). I4 couples the Intervention Library to the Teaching
Move Library structurally — no canonical intervention can ship
without a real parent move.

Fewer invariants would leave the graph + library underdefended;
more would speculate ahead of authoring experience. The eight v1
invariants are the *floor*, not the ceiling.

### Universal scope (not STEM-only)

Unlike ADR 0043's STEM-specific notation registry, A5's
misconception graph + intervention library apply universally to
Sophie LDS courses. Misconceptions and interventions matter for
history-of-science (the "Galileo dropped balls from Pisa" myth),
science-communication (the deficit model of public understanding),
statistics ("correlation implies causation"), and any discipline
where students arrive with prior models. No opt-in mechanism —
courses without misconceptions simply don't declare any.

## Consequences

### For Sophie-the-platform (this commit)

This commit ships **docs only**:

1. ADR 0044 (this file).
2. [`reference/misconception-graph-schema.md`](../reference/misconception-graph-schema.md).
3. [`reference/intervention-library.md`](../reference/intervention-library.md).
4. `myst.yml` registers all three.
5. `vision/features/accepted.md` collapses A5 to graduated pointer.
6. `vision/features/index.md` notes fifth graduation.

### For Sophie-the-platform (future code PR)

A subsequent code PR ships:

1. `packages/core/src/schema/misconception.ts` — extended
   `MisconceptionEntrySchema` with the four new graph fields.
2. `packages/components/src/intervention/index.tsx` —
   `<Intervention>` component.
3. `packages/components/src/intervention/intervention-index.ts` —
   12 canonical interventions at v1.
4. `packages/components/src/pedagogy/misconception-graph.ts` —
   graph constructor + cycle detection.
5. Eight new audit invariants (MG1–MG4 + I1–I4; MG4 + I4 added in
   the 2026-05-14 hardening). The `depth` field on `<Intervention>`
   feeds MG4's summary statistic; the `move:` field on
   `intervention-index.ts` entries (per ADR 0041 hardening) is
   gated by I4.
6. A `<MisconceptionGraphPage>` route at
   `/about-this-course/misconception-graph/` rendering the assembled
   graph.
7. Storybook stories + axe-core tests per
   [ADR 0004](./0004-component-contract-revisions.md).

### For consumer repos

A course adopting A5 needs:

1. Update `<Aside kind="misconception">` instances to include the
   new graph fields where relationships exist (optional but
   recommended).
2. Pair `<Intervention>` blocks with misconception Asides.
3. Use `type="custom" name="…"` for course-specific interventions
   that don't fit the canonical library.

Courses without misconceptions (rare for STEM; possible for some
pure-skills courses like a pure mathematical-techniques drill
course) are unaffected.

### For TDRs (per [ADR 0040](./0040-teaching-decision-records.md))

TDRs may cite misconception relationships when curriculum decisions
hinge on the graph. Example: a TDR justifying Module 4's placement
cites the prerequisite chain *universe-with-a-center* →
*redshift-as-ordinary-doppler* → *expansion-vs-motion-in-space*,
showing the sequence is forced by the dependency.

### For the Teaching Move Library (per [ADR 0041](./0041-teaching-move-library.md))

Each canonical intervention in the Intervention Library declares
which Teaching Moves it implements. This creates a many-to-many
binding: a move (e.g., *misconception-confrontation*) can be
realized by multiple interventions (contrasting cases,
predict-then-reveal, conceptual exchange). The future
`move-index.ts` extends with intervention bindings:

```ts
// In move-index.ts
"misconception-confrontation": {
  interventions: [
    "contrasting-cases",
    "predict-then-reveal",
    "conceptual-exchange"
  ]
}
```

### For the Pedagogy Contract (per [ADR 0042](./0042-pedagogy-contract-and-ai-contribution-ledger.md))

The Pedagogy Contract gains an optional `misconception_policy`
section:

```yaml
misconception_policy:
  every_module_addresses_misconceptions: true
  bridging_analogies_declare_limits: true
  intervention_library_canonical_only: false
```

Courses can declare stricter authoring policies than the Sophie LDS
default (e.g., enforce that every chapter pairs misconceptions with
interventions; require analogies to declare limits per Clement
1993).

### For the Notation Registry (per [ADR 0043](./0043-notation-registry-multirep-alignment-audit.md))

The `concept_refs` field on misconception Asides links misconceptions
to Notation Registry concepts. A misconception about *redshift*
(*"redshift is ordinary Doppler motion"*) declares
`concept_refs: ["redshift", "recession-velocity"]`. The reverse
index ("misconceptions attached to this concept") renders on both
the notation route and the misconception-graph route.

### For AI authoring (future)

The `sophie-chapter-author` workflow reads the assembled
misconception graph + intervention library as binding context. When
drafting a chapter that introduces a misconception:

1. AI checks the prerequisite chain — must any earlier misconceptions
   be addressed first?
2. AI proposes an intervention from the canonical library, citing
   the citation.
3. AI flags if the proposed misconception is already addressed in
   an earlier chapter (likely a duplicate, not a new entry).
4. Instructor reviews + approves before the chapter is published.

### For SoTL paper + tenure case

The Misconception Graph + Intervention Library are citable methods
artifacts. A SoTL paper can describe "Sophie's curriculum encodes
N misconceptions in a directed prerequisite graph paired with
12 canonical interventions grounded in cognitive-science literature."
This operationalizes the *cultural intervention claim* — that
curriculum design can be *structurally rigorous about wrong models*,
not just structurally rigorous about correct content.

## Alternatives considered

### Pure DAG (all relationships directional)

Force every misconception relationship to be directional. Reject —
sibling relationships have no natural ordering; fabricating it
either invents fake directionality or creates dense graphs that
obscure prerequisites. The hybrid (DAG + loose) preserves both
semantics.

### Pure loose links (no DAG)

Allow only `related_to` style links without ordering. Reject —
prerequisite cycles are real curriculum bugs the audit must catch
(if X requires Y and Y requires X, the curriculum has no valid
sequencing). Loose-only loses this defense.

### Course-level `misconception-graph.yaml` instead of extending Aside

Parallel ADR 0043's notation-registry.yaml shape. Reject — see
Rationale §4. Misconceptions are chapter-bound; centralizing them
duplicates the PR-C4 index. The graph is naturally distributive.

### Named-only intervention library (no custom)

Force every intervention to be a library entry. Reject — premature
canonicalization. Some course-specific interventions don't earn
library status; forcing them in creates phantom entries that don't
generalize.

### Inline-tagged-only interventions (no canonical library)

Skip the library; let every chapter declare its own intervention
types. Reject — loses citation credibility; loses cross-course
reuse; AI authoring can't ground in a canonical taxonomy.

### `<Intervention>` outside the misconception Aside (no nesting)

Force all interventions to be declared as separate blocks
referencing the misconception by name. Reject as authoring
regression — the chapter author writes the misconception +
intervention as a *pair*; the source should reflect that pairing
directly. Nesting is the natural shape.

### Two separate ADRs (0044 graph + 0045 library)

Reject — tightly coupled; splitting forces forward references. Same
pattern as ADRs 0042 + 0043.

### STEM-specific opt-in (matching A4)

Reject — misconceptions and interventions apply universally beyond
STEM (history-of-science, science-communication, statistics, etc.).
Sophie LDS keeps the universal scope.

## References

- [`reference/misconception-graph-schema.md`](../reference/misconception-graph-schema.md)
  — extended Aside schema spec + ASTR 201 graph example.
- [`reference/intervention-library.md`](../reference/intervention-library.md)
  — 12 canonical interventions with citations + `<Intervention>`
  component reference + Move/Intervention linkage per ADR 0041
  hardening.
- [ADR 0038 — pedagogy index pattern](./0038-pedagogy-index-pattern.md)
  — PR-C4's `<Aside kind="misconception">` schema + audit
  infrastructure this ADR extends.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDRs may cite graph relationships; TDR `affects_anchors` may
  list misconception slugs to feed `sophie diff` intentional-
  change demotion (ADR 0045).
- [ADR 0041 — Teaching Move Library](./0041-teaching-move-library.md)
  — interventions bind to Teaching Moves via `move:` field
  (hardened 2026-05-14); audit invariant I4 lives in *this* ADR's
  I-family but its target is ADR 0041's catalog.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `misconception_policy` extension lives here.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — `concept_refs` links misconceptions to registered concepts;
  hybrid relationship-modeling precedent; *structured-for-facts,
  prose-for-stances* principle.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — misconception-graph changes classified by the diff taxonomy;
  prerequisite-cycle introduction is a `breaking` item; TDR
  `affects_anchors` may demote misconception-related diff items.
- [ADR 0048 — Sophie LDS Content Plugin System](./0048-sophie-lds-content-plugin-system.md)
  — future cross-course misconception inheritance via Commons
  catalogs. v1 ships per-course misconceptions only; the per-
  course shape is forward-compatible.
- [ADR 0049 — `sophie refactor` CLI Family](./0049-sophie-refactor-cli-family.md)
  — `sophie refactor misconception rename | split | merge | delete`
  for atomic operations across the graph's cross-references.
  Addresses the graph-maintenance burden as the misconception count
  grows.
- [ADR 0004 — component contract revisions](./0004-component-contract-revisions.md)
  — `<Intervention>` component contract.
- [`vision/features/accepted.md`](../vision/features/accepted.md) A5
  — the staging-area entry this ADR graduates.

### Key cognitive-science citations

- Posner, G. J., Strike, K. A., Hewson, P. W., & Gertzog, W. A.
  (1982). Accommodation of a scientific conception. *Science
  Education*, 66(2), 211–227.
- Bransford, J. D., & Schwartz, D. L. (1999). Rethinking transfer.
  *Review of Research in Education*, 24, 61–100. (Contrasting cases)
- Clement, J. (1993). Using bridging analogies and anchoring
  intuitions to deal with students' preconceptions in physics.
  *Journal of Research in Science Teaching*, 30(10), 1241–1257.
- White, R. T., & Gunstone, R. F. (1992). *Probing understanding.*
  Falmer Press. (Predict-Observe-Explain)
- Tippett, C. D. (2010). Refutation text in science education.
  *International Journal of Science and Mathematics Education*,
  8(6), 951–970.
- Chi, M. T. H. (2008). Three types of conceptual change. In
  *International Handbook of Research on Conceptual Change*
  (S. Vosniadou, ed.), pp. 61–82. Routledge.

Full citations + DOIs in `reference/intervention-library.md` per-entry.

## Revisions (2026-05-17 — Reasoning OS Core Phase 1 hardening)

The Reasoning OS pedagogical-core sprint surfaced two scope deltas to
ADR 0044's v1 contract and locked the `<Intervention>` rendering shape
that ADR 0044 explicitly deferred. Full design lockup at
[`docs/plans/2026-05-17-intervention-design.md`](../../plans/2026-05-17-intervention-design.md).

### R1 — `<MisconceptionGraphPage>` route deferred from v1 to v2

ADR 0044 §Consequences "For Sophie-the-platform (future code PR)"
lists `<MisconceptionGraphPage>` at `/about-this-course/misconception-graph/`
as a v1 follow-up code-PR deliverable. The Reasoning OS Core Phase 1
sprint defers it to v2:

- Graph visualization is non-trivial design (React Flow? D3? mermaid?
  static SVG?) and is a separate concern from "graph data exists and
  is queryable."
- The chapter capstone (PR-7, Phase 4) doesn't depend on the route —
  misconception + intervention pairings render inline in chapter
  context.
- The data the page would consume already lives in `PedagogyIndex`
  post-PR-γ; v2 ships a new route + viz component with zero schema or
  extractor change.

Per ADR 0023 vertical-slice-first: ship the lean component + audit at
v1; layer the route on top when the graph viz design earns its own
sprint.

### R2 — I4 audit deferred until ADR 0041 `move-index.ts` ships

I4 (every canonical intervention's `move:` field resolves to a real
move in `move-index.ts`) requires `move-index.ts` to exist. ADR 0041
introduced `move-index.ts` as a planned platform-level catalog
parallel to `intervention-index.ts`, but `move-index.ts` is not in
scope for the Reasoning OS Core sprint.

Forward-compat seam: **every canonical intervention in
`intervention-index.ts` declares a `move:` field at v1** (per ADR 0041
hardening). The field is unverified at v1; I4 turns on when
`move-index.ts` ships, with no schema or component change. The
`move:` field is the seam declared now to avoid a breaking change
later.

### R3 — `<Intervention>` render shape locked: sub-card nested in misconception Aside

ADR 0044 specified `<Intervention>` as a children-mode component but
did not lock the visual treatment. v1 ships:

- **Distinct sub-card inside misconception Aside** (when nested) with:
  - **Type-pill header** (e.g., `[contrasting-cases]`)
  - **Citation chip** (clickable → intervention-library reference)
  - **Body prose**
  - **Optional `limits` sub-section** rendered as italicized "Limits: …"
    final block (surfaces Clement 1993's explicit-limits-on-bridging-
    analogies recommendation; I3 INFO nudges this)
- **Standalone form** (outside Aside, with `addresses="<misc-slug>"`)
  renders the same sub-card with a leading "↗ Addresses: …" header
  showing the misconception's `label` for pairing context.
- **`type="custom"`** renders the `name` as type-pill text with a small
  "custom" annotation chip and no citation chip.
- **`depth` field is audit-only metadata** (not visualized to readers).
  MG4 surfaces course-wide depth statistics for instructors; readers
  see intervention content.

Pedagogical rationale: hiding the intervention behind interaction
(disclosure, tabs) destroys the pairing-visibility that's the load-
bearing claim of structured misconception remediation. The sub-card
is the resolution to the misconception; the visual hierarchy makes
the pairing structurally legible.

### R4 — Forward-compat: `<Intervention addresses>` accepts `string | string[]`

v1 ADR text shows `addresses="<misc-slug>"` (single target). v1 schema
extends to `z.union([z.string(), z.array(z.string())])` — single
target at v1 with the array form valid but unused. v2 multi-target
addressing (one intervention addresses multiple misconceptions) lands
without a breaking change.

### R5 — `<Intervention>` declared to carry no `epistemicRole` (deliberate non-decision per ADR 0058)

ADR 0058's 8-role taxonomy does not include "remediation" or
"intervention" as roles. `<Intervention>` therefore carries no
`epistemicRole`; the misconception it pairs with already carries role
`misconception` per ADR 0058 §3 implicit lookup table.

This is documented as a *deliberate* non-decision so future
contributors don't try to fit `<Intervention>` into the existing 8
roles. A future ADR may extend the taxonomy with a 9th role; no
breaking change required either way.

### R6 — v1 library ships all 12 canonical interventions; PR cadence trimmed

The Reasoning OS Core sprint ships all 12 canonical interventions
(Confrontation × 3 + Bridging × 3 + Restructuring × 3 + Reinforcement
× 3) in `intervention-index.ts` at v1 — content work, not architectural
change.

PR cadence is trimmed from ADR 0044's implicit α/β/γ/δ/ε to
**β → γ → δ** because:

- No PR-α: `MisconceptionEntrySchema` with all 4 graph fields already
  ships in
  [packages/core/src/schema/pedagogy-index.ts:149-173](../../../packages/core/src/schema/pedagogy-index.ts);
  MG1 + MG2 audit invariants already ship.
- No PR-ε: no aggregator at v1 (MisconceptionGraphPage deferred per R1
  above; chapter-level rendering happens inline).

### R7 — Misconception anchor precedence + Intervention `addresses="this"` slugify alignment

Surfaced and closed in PR-δ
([PR #90](https://github.com/drannarosen/sophie/pull/90), squash-merged
2026-05-17). Two extractor changes that together close a cross-cutting
coupling gap between the misconception-graph anchor scheme and the
Intervention `addresses="this"` resolution:

1. **Misconception anchor precedence** is now `id > slug(name) >
   slug(title) > misc-${counter}` (per-chapter sequential). The
   precedence places `name` **above** `slug(title)` so an
   `<Aside kind="misconception" name="…" title="…">` resolves to the
   `name`-derived anchor, not the prettier title-derived one. See
   [`pedagogy-index-extractor.ts:836-843`](../../../packages/astro/src/lib/pedagogy-index-extractor.ts).

2. **`<Intervention addresses="this">` rewrite** uses `slugify(miscName)`
   (the enclosing `<Aside kind="misconception" name="…">`'s
   slugified `name`), matching the misconception anchor precedence
   exactly. See [`pedagogy-index-extractor.ts:1450-1461`](../../../packages/astro/src/lib/pedagogy-index-extractor.ts).

Without this alignment, an author writing `<Aside kind="misconception"
name="Universe With A Center" title="Cosmology has no center"><Intervention
addresses="this">…</Intervention></Aside>` would have produced a
misconception anchor of `cosmology-has-no-center` (slugified `title`)
but an intervention resolution of `universe-with-a-center` (slugified
`name`) — the audit's I1 invariant would have fired a misleading
"unresolved cross-ref" WARNING.

The fix is **structural**, not heuristic: both sides now read from
the same precedence ordering, and the precedence is documented in
the inline extractor comments. Future extractors that introduce new
cross-refs to misconception anchors (e.g., `<MisconceptionRef
name="…">`, deferred per §R8 below) must follow the same precedence
to land on the same anchor.

The Phase B Reasoning OS core audit (§2.2; 2026-05-17) confirmed
this fix was the right shape and called out the inline comment block
as the architectural reference for the next contributor.

### R8 — `<MisconceptionRef>` + misconception-store deferred to v2

`<Intervention>` in its **standalone-case render** (when `addresses`
is a non-`"this"` value — a single slug or array) currently shows a
leading "↗ Addresses: `<slug>`" header with the raw slug text
(e.g., `universe-with-a-center`). The v2 target is to resolve that
slug to the misconception's authored *verbal label* (e.g.,
"Universe with a center") via a misconception-store lookup, rendered
inline through a future `<MisconceptionRef name="…">` component.

This is deferred to v2 because **both prerequisites are out of
Phase 1's scope**:

- **`<MisconceptionRef>` component**: an inline ref to a misconception
  graph node — structurally similar to `<EquationRef>` (inline ref to a
  KeyEquation) and `<GlossaryTerm>` (inline ref to a glossary entry).
  Not specced in v1; will need its own ADR-or-PR conversation when
  a real consumer asks for it.

- **Misconception store**: a runtime accessor over the
  consumer-supplied misconception graph (currently authored inline
  in chapter MDX as `<Aside kind="misconception">` elements). v1
  aggregates these into the `PedagogyIndex.misconceptions[]` slot at
  build time; v2 would expose a runtime lookup table keyed by anchor
  slug.

**v1 behavior is correct, not broken**: a raw-slug "Addresses:
`universe-with-a-center`" header is a complete-information render —
the slug *is* the misconception identity. The v2 work is a polish
improvement (slug → verbal label) for reader UX, not a fix.

The previous `// TODO once that store exists alongside an inline
<MisconceptionRef>` note in [`Intervention.tsx`](../../../packages/components/src/components/Intervention/Intervention.tsx)
is replaced by a reference to this §R8 note (PR-D, Session 4
audit-fix sprint) per CLAUDE.md "no `TODO` without an issue link"
— this §R-note serves the same audit-trail role as a GitHub issue.

## Revisions (2026-05-18 — Registry ecosystem amendment)

### R9 — `<MisconceptionRef>` unblocks once the misconception registry exists

§R8 (2026-05-17) deferred `<MisconceptionRef>` + a misconception-
store lookup to v2, blocked on "neither prerequisite ships at v1."
[ADR 0060 — Registry Ecosystem](./0060-registry-ecosystem.md) names
the path forward.

The misconception registry is in **Phase 2** of the registry-
ecosystem rollout, deferred until cross-chapter reuse signals
appear (per ADR 0060's bright-line rule: universal + reusable →
registry, with reuse pressure as the promotion signal). PR-7 just
landed 8 misconceptions inline in `spoiler-alerts.mdx` (collection
pattern); none are yet referenced from a second chapter, so the
promotion signal hasn't fired.

When the misconception registry does land (Phase 2):

- Each misconception becomes a file at
  `src/content/misconceptions/<slug>.mdx` with frontmatter
  `{ id, name, label?, length, tags, version }` and body containing
  the misconception prose + nested `<Intervention>` children that
  travel with it.
- `<MisconceptionRef refId="...">` becomes a thin wrapper over the
  shared `<RegistryRef collection refId>` base introduced by
  PR-A (per ADR 0060 §convention 5).
- Chapter inline `<Aside kind="misconception" name="...">` continues
  to work as the collection-pattern shape for chapter-specific
  misconceptions; cross-chapter-reused misconceptions migrate to the
  registry.

Until that lands, the v1 raw-slug "Addresses: `universe-with-a-center`"
render documented in §R8 remains the canonical behavior.

### R10 — Intervention library stays where it is

The 12-entry intervention library at
[`intervention-index.ts`](../../../packages/components/src/intervention/intervention-index.ts)
was flagged as registry-shaped by ADR 0060's audit of existing
registries. It is *already* a registry by the ADR 0060 rule
(universal + reusable; loaded by `getInterventionLibrary()`;
referenced from chapters by `<Intervention type="…">`).

No migration is needed. The intervention library is **platform-
level content** (the canonical 12 cognitive-science remediation
moves), not consumer-repo content, so it stays in
`@sophie/components` rather than moving to a consumer-repo
`src/content/interventions/` collection. ADR 0048's plugin layer
will let consumers extend the platform library with course-specific
interventions in a future phase — that extension will use the
content-collection shape described in ADR 0060.
