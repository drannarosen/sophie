---
date: 2026-05-14
tags: [pedagogy, decisions, misconceptions, interventions, graph, audit, lds]
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

### Artifact 1: Extended `<Aside kind="misconception">` schema

The PR-C4 misconception Aside schema gains four new optional fields:

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

`<Intervention>` props:

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `type` | required | string | Named intervention from the library OR `"custom"` for course-specific |
| `addresses` | optional | misconception `name` \| `"this"` | Which misconception this intervention addresses; `"this"` = the enclosing Aside |
| `name` | optional | string | Required when `type="custom"`; the bespoke intervention name |
| `limits` | optional | inline markdown | Where the intervention breaks down (especially for bridging analogies) |

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

### Artifact 4: Six new audit invariants

The audit extends [PR-C4's `pedagogy-audit.ts`](./0038-pedagogy-index-pattern.md)
with six new invariants:

| ID | Severity | Check |
|---|---|---|
| **M3** | WARNING | Misconception declared but no chapter pairs an `<Intervention>` with it |
| **M4** | WARNING | `<Intervention>` used but `addresses` references no known misconception (or `"this"` outside an Aside) |
| **M5** | ERROR | `prerequisite_misconceptions` cycle detected (DAG integrity) |
| **M6** | ERROR | `prerequisite_misconceptions` references a misconception not introduced in any earlier chapter (by `introduced_in` ordering) |
| **M7** | ERROR | `<Intervention type="…">` references a named intervention not in `intervention-index.ts` (and not `"custom"`) |
| **M8** | INFO | `<Intervention type="bridging-analogy">` doesn't declare `limits` |

The PR-C4 invariants M1 (orphan misconception in registry without
chapter usage) + M2 (name collision) stay.

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

Audit invariant M7 verifies named references resolve; custom
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

### v1 invariant list: 6 new invariants (M3–M8) is the floor

M3 + M4 + M5 + M6 cover the load-bearing semantic checks
(pairing, DAG integrity, prerequisite ordering). M7 + M8 cover
reference resolution + authoring suggestions. Fewer invariants would
leave the graph + library underdefended; more would speculate ahead
of authoring experience.

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
5. Six new audit invariants (M3–M8).
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

## Revisions

*None yet.* Revisions to the graph schema, intervention library, or
invariant list follow the pattern established by
[ADR 0038 §1, §2](./0038-pedagogy-index-pattern.md).

## References

- [`reference/misconception-graph-schema.md`](../reference/misconception-graph-schema.md)
  — extended Aside schema spec + ASTR 201 graph example.
- [`reference/intervention-library.md`](../reference/intervention-library.md)
  — 12 canonical interventions with citations + `<Intervention>`
  component reference.
- [ADR 0038 — pedagogy index pattern](./0038-pedagogy-index-pattern.md)
  — PR-C4's `<Aside kind="misconception">` schema + audit
  infrastructure this ADR extends.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDRs may cite graph relationships.
- [ADR 0041 — Teaching Move Library](./0041-teaching-move-library.md)
  — Interventions bind to Teaching Moves; canonical-library
  precedent.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `misconception_policy` extension lives here.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — `concept_refs` links misconceptions to registered concepts;
  hybrid relationship-modeling precedent.
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
