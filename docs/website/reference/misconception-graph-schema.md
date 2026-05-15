---
title: Misconception graph schema
short_title: Misconception graph
description: Extended schema for `<Aside kind="misconception">` carrying graph fields — prerequisite chains (DAG), related-misconception siblings (loose links), and concept-reference links to the Notation Registry. Includes a fully-filled ASTR 201 graph example.
tags: [pedagogy, reference, misconceptions, graph, schema, lds]
---

# Misconception graph schema

The misconception graph is **distributively declared**: each
chapter's `<Aside kind="misconception">` carries the graph fields for
that misconception. The build-time audit walks the
[pedagogy index](../decisions/0038-pedagogy-index-pattern.md) and
reassembles the full graph from the union of chapter declarations.

The full rationale lives at
[ADR 0044 — Misconception Graph + Intervention Library](../decisions/0044-misconception-graph-and-intervention-library.md).

## Why distributive (no central YAML)?

Unlike the [Notation Registry](notation-registry-schema.md) (A4),
misconceptions are intrinsically chapter-bound — each one has a
single "where it was introduced" home. PR-C4 already aggregates
chapter-level misconception Asides into the pedagogy index. Adding
a central `misconception-graph.yaml` would duplicate that
infrastructure.

The cost: a single misconception's relationships are split across
the chapters that reference it. The audit walks all instances and
reassembles the full graph at build time. The rendered
`/about-this-course/misconception-graph/` route shows the assembled
graph.

## Extended `<Aside kind="misconception">` schema

PR-C4 shipped the base schema (`name`, short discriminator, long
content). ADR 0044 adds **four optional graph fields**:

| Field | Type | Required | Purpose |
|---|---|---|---|
| `prerequisite_misconceptions` | list of misconception `name`s | optional | Misconceptions that must be addressed *before* this one (DAG; ordering-sensitive) |
| `related_misconceptions` | list of misconception `name`s | optional | Bidirectional siblings; no ordering |
| `concept_refs` | list of Notation Registry `concept.id`s | optional | Concepts this misconception attaches to (per ADR 0043) |
| `discipline_scope` | list of strings | optional | Disciplines this applies to (default: implied by course) |

All four are **optional** — a misconception with no declared
relationships is a valid v1 entry. Adding relationships is a
progressive enhancement.

## Field specifications

### `prerequisite_misconceptions` (optional)

A list of misconception `name`s that **must be addressed in earlier
chapters** before this one. Models the directed prerequisite graph
as a DAG.

```mdx
<Aside
  kind="misconception"
  name="redshift-as-ordinary-doppler"
  prerequisite_misconceptions={[
    "universe-with-a-center",
    "expansion-vs-motion-in-space"
  ]}
>
  Students who haven't first untangled the "universe with a center"
  model conflate cosmic redshift with classical Doppler shift...
</Aside>
```

Audit invariants:

- **M5** (ERROR): cycle detected in the prerequisite graph (DAG
  violation).
- **M6** (ERROR): a prerequisite references a misconception not
  introduced in any earlier chapter (by `introduced_in` ordering).

Empty list (`[]`) is meaningful — it explicitly declares "this
misconception has no prerequisites" (a *root* in the DAG).

### `related_misconceptions` (optional)

A list of misconception `name`s that are **bidirectional siblings**
— relations without ordering semantics. Two misconceptions might
share a conceptual structure or appear in similar contexts without
one being a prerequisite of the other.

```mdx
<Aside
  kind="misconception"
  name="brightness-is-intrinsic"
  related_misconceptions={[
    "flux-and-luminosity-interchangeable",
    "all-stars-equally-bright"
  ]}
>
  Students often assume that how bright a star looks is a property
  of the star itself, not a function of distance...
</Aside>
```

No cycle constraints (the relation is bidirectional by definition).
No ordering constraints (siblings don't have prerequisite semantics).

### `concept_refs` (optional)

A list of [Notation Registry](notation-registry-schema.md) `concept.id`s
that this misconception attaches to. Creates a binding between the
misconception graph and the notation graph.

```mdx
<Aside
  kind="misconception"
  name="brightness-is-intrinsic"
  concept_refs={["flux", "stellar-luminosity", "distance-modulus"]}
>
  ...
</Aside>
```

The reverse index ("misconceptions attached to this concept")
renders on:

- The Notation Registry route (`/about-this-course/notation/`) per
  ADR 0043.
- The misconception graph route
  (`/about-this-course/misconception-graph/`) per ADR 0044.

### `discipline_scope` (optional)

A list of disciplines this misconception applies to. Defaults to
the discipline implied by the course's pedagogy contract. Useful
for misconceptions that span fields:

```mdx
<Aside
  kind="misconception"
  name="correlation-implies-causation"
  discipline_scope={[
    "statistics",
    "epidemiology",
    "social-science",
    "data-journalism"
  ]}
>
  ...
</Aside>
```

A future cross-course misconception index could query by discipline.

## Fully-filled example: ASTR 201 misconception graph

A real subset of ASTR 201's misconception graph illustrating
prerequisites + sibling links + concept refs across three chapters.

### Module 4 Lecture 1 — first appearance

```mdx
<Aside
  kind="misconception"
  name="universe-with-a-center"
  short="The universe has a center point from which it expanded"
  prerequisite_misconceptions={[]}
  related_misconceptions={["big-bang-as-explosion-in-space"]}
  concept_refs={["hubble-parameter", "redshift"]}
>
  Many students model the universe as expanding from a single center
  point — like a firework or an explosion happening in a pre-existing
  space. The geometry of cosmic expansion is fundamentally
  different: every point is equivalent; there is no center.

  <Intervention type="contrasting-cases" addresses="this">
    Predict what you'd observe if the universe had a center, then
    compare to the actual observation: isotropic Hubble flow from
    every vantage point.
  </Intervention>
</Aside>

<Aside
  kind="misconception"
  name="big-bang-as-explosion-in-space"
  short="The Big Bang was an explosion that happened at a point in space"
  prerequisite_misconceptions={[]}
  related_misconceptions={["universe-with-a-center"]}
  concept_refs={["hubble-parameter"]}
>
  The "Big Bang" terminology evokes a pre-existing space + a
  detonation event in that space. The model is fundamentally
  different: space itself is what expands.

  <Intervention type="refutation-text" addresses="this">
    The misconception: "the Big Bang was an explosion that happened
    at a point in space." Why this is wrong: the Big Bang *is* the
    expansion of space itself; there is no pre-existing space for
    an explosion to occur within.
  </Intervention>
</Aside>
```

### Module 4 Lecture 2 — builds on Lecture 1

```mdx
<Aside
  kind="misconception"
  name="expansion-vs-motion-in-space"
  short="Galaxies are moving through space away from us"
  prerequisite_misconceptions={["universe-with-a-center"]}
  related_misconceptions={["redshift-as-ordinary-doppler"]}
  concept_refs={["recession-velocity", "redshift"]}
>
  Once students accept that the universe has no center, the next
  trap is to think galaxies are *moving* through a fixed space. They
  aren't — space itself is expanding; galaxies are roughly at rest
  in their local comoving frames.

  <Intervention type="bridging-analogy" addresses="this">
    Bread baking with raisins: raisins don't move through the bread;
    the bread expands between them. From any raisin's perspective,
    every other raisin recedes.

    <Limits>
      The bread has an outside; the universe doesn't. The analogy
      describes the relative recession but not the absence of a
      boundary.
    </Limits>
  </Intervention>
</Aside>
```

### Module 4 Lecture 3 — builds on Lectures 1 & 2

```mdx
<Aside
  kind="misconception"
  name="redshift-as-ordinary-doppler"
  short="Cosmological redshift is classical Doppler shift from recession velocity"
  prerequisite_misconceptions={[
    "universe-with-a-center",
    "expansion-vs-motion-in-space"
  ]}
  related_misconceptions={[]}
  concept_refs={["redshift", "recession-velocity"]}
>
  Once students grasp expansion-not-motion, they may still default to
  classical Doppler formulas (v/c approximation) for cosmic redshift.
  These give correct answers in the small-z limit but break down for
  cosmologically interesting z; the underlying physics is *expansion
  of the metric*, not motion through space.

  <Intervention type="predict-then-reveal" addresses="this">
    Predict z for a galaxy with v_recession = 0.5c using classical
    Doppler. Then derive the correct cosmological relation and
    compare. Discuss why both give similar answers for v ≪ c.
  </Intervention>

  <Intervention type="contrasting-cases" addresses="this">
    Side-by-side: a galaxy receding at 100 km/s (classical Doppler
    valid) vs. a galaxy at z = 1 (classical Doppler wrong by ~50%).
  </Intervention>
</Aside>
```

### Resulting graph (assembled at build time)

The audit walks all three chapters and assembles:

```text
universe-with-a-center  (root, no prereqs)
   │
   ├── expansion-vs-motion-in-space   (prereq: universe-with-a-center)
   │      │
   │      └── redshift-as-ordinary-doppler  (prereq: both above)
   │
   └── redshift-as-ordinary-doppler   (also prereq: universe-with-a-center)

big-bang-as-explosion-in-space  (root, related to universe-with-a-center)
```

The `<MisconceptionGraphPage>` renders this as a directed graph
visualization (React Flow per [ADR 0016](../decisions/0016-react-flow-for-concept-maps.md)
when that lands) plus a tabular fallback.

## How the audit uses these fields

The [Representation Alignment Audit's misconception family](../decisions/0044-misconception-graph-and-intervention-library.md#artifact-4-six-new-audit-invariants)
checks:

- **M1** (from PR-C4) — orphan misconception in registry without
  chapter usage.
- **M2** (from PR-C4) — misconception name collision across chapters.
- **M3** (new) — misconception declared but no `<Intervention>`
  paired with it.
- **M4** (new) — `<Intervention>` used with `addresses` referencing
  no known misconception.
- **M5** (new, ERROR) — cycle detected in `prerequisite_misconceptions`.
- **M6** (new, ERROR) — prerequisite references a misconception not
  introduced in any earlier chapter (by chapter ordering).
- **M7** (new, ERROR) — `<Intervention type>` references a name not
  in `intervention-index.ts`.
- **M8** (new, INFO) — `<Intervention type="bridging-analogy">`
  doesn't declare `<Limits>`.

## Authoring guidelines

### When to declare prerequisites vs related

- **Prerequisite**: "you can't *resolve* X until Y is resolved." If
  attacking X without first resolving Y leaves the student with no
  ground to stand on, it's a prerequisite.
- **Related**: "X and Y share conceptual structure" or "X and Y
  often co-occur in student responses." If the student can engage
  with X without first resolving Y, it's related, not prerequisite.

When in doubt, default to **related**. Overdeclaring prerequisites
creates an artificially-rigid curriculum sequence; underdeclaring
related misses cross-references.

### How to evolve a misconception's graph fields

1. Edit the relevant `<Aside kind="misconception">` directly. Graph
   fields are part of the chapter source.
2. If multiple chapters reference the misconception, update each
   chapter's declaration.
3. The audit walks the union; the most-recently-edited chapter is
   not authoritative (it's the *union* that defines the graph).
4. Write a TDR per [ADR 0040](../decisions/0040-teaching-decision-records.md)
   if the change is load-bearing (e.g., adding a prerequisite that
   reorders a module).

### Avoiding common authoring traps

- **Don't declare every related misconception you can think of.** A
  dense graph buries the load-bearing structure. Declare relations
  that affect *curriculum decisions* (sequence, intervention
  selection).
- **Don't omit `prerequisite_misconceptions: []` on roots.** The
  empty list is meaningful — it asserts "this is a root." Audit
  tools may eventually warn on undeclared roots.
- **Don't use prerequisites to express "we cover this earlier in the
  course."** Chapter ordering is captured separately. Prerequisites
  are about *cognitive dependency*, not authoring order.

## Rendering on the course site

`/about-this-course/misconception-graph/` renders the assembled
graph with:

- Directed-edge visualization (React Flow per ADR 0016 when
  shipped; tabular fallback otherwise).
- Per-misconception drill-down showing the chapter where it's
  introduced + which interventions address it + linked Notation
  Registry concepts.
- Filter by `discipline_scope` (when populated).

Implementation lands in the follow-up code PR per
[ADR 0044 Consequences](../decisions/0044-misconception-graph-and-intervention-library.md#consequences).
