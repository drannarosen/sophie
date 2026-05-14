---
title: MultiRep component reference
short_title: MultiRep component
description: Chapter-author reference for the `<MultiRep>` component and its child elements (`<RepVerbal>`, `<RepEquation>`, `<RepFigure>`, `<RepCode>`, `<RepIntuition>`). The component binds multiple representations of one concept and feeds the Representation Alignment Audit. Includes a fully-filled ASTR 201 example.
tags: [pedagogy, reference, components, multirep, representation-alignment, multiple-representations, lds]
---

# MultiRep component reference

`<MultiRep>` declares that several representations of a single
concept — prose description, equation, figure, code, physical
intuition — refer to the *same thing*. The component renders a
reader-toggleable / side-by-side view of the representations and
feeds the [Representation Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md)
with explicit binding metadata.

The full rationale lives at
[ADR 0043 — Notation Registry + MultiRep + Representation Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md).

## When to use `<MultiRep>`

Wrap a concept in `<MultiRep>` when:

- The concept appears in **two or more representational forms** in
  the chapter (e.g., prose + equation + figure).
- The chapter is the **introductory** appearance of the concept
  *or* introduces a **new representation** of an already-introduced
  concept.
- The concept has a **Notation Registry entry** (a `<MultiRep>`
  binding requires a registered concept; see audit invariant MR1).

Skip `<MultiRep>` when:

- The concept is referenced incidentally without crossing
  representational boundaries.
- The chapter discusses many concepts in passing without rebinding
  any of them.
- The concept is one-off and not in the registry.

## Source pattern (children-mode)

`<MultiRep>` uses the **children-mode source pattern** established
by [PR-C4's LearningObjectives refactor](../decisions/0038-pedagogy-index-pattern.md):

```mdx
<MultiRep concept="orbital-radius">
  <RepVerbal>
    The distance from the central mass to the orbiting body.
  </RepVerbal>
  <RepEquation refKey="kepler-3rd-law" symbol="r" />
  <RepFigure refName="orbit-geometry" symbolLabel="r" />
  <RepCode refName="orbit-simulation" symbol="r_au" />
  <RepIntuition>
    Imagine an ant walking around the orbit — how far must it travel
    to reach the central mass?
  </RepIntuition>
</MultiRep>
```

Each child element declares one representation form. The parent
component:

1. Validates `concept` against the [Notation Registry](notation-registry-schema.md).
2. Renders the bound representations to readers (toggle / side-by-
   side; UI design TBD in the follow-up code PR).
3. Emits an entry to the pedagogy index for the build-time
   [Representation Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md#artifact-3-representation-alignment-audit-v1-8-invariants).

A `<MultiRep>` block declares *only the forms actually present* in
the chapter. Verbal + equation without figure is valid; all five
forms together is valid; verbal + figure + intuition (skipping
equation + code) is valid.

## `<MultiRep>` props

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `concept` | required | string | Registered concept `id` from `notation-registry.yaml` |
| `id` | optional | string | Anchor id (auto-generated from concept if omitted) |
| `layout` | optional | `"toggle" \| "side-by-side" \| "stack"` | Reader UI hint (default `"toggle"`; final styling in code PR) |

## Child elements

### `<RepVerbal>`

Plain-language description of the concept. Prose-only.

```mdx
<RepVerbal>
  The distance from the central mass to the orbiting body.
</RepVerbal>
```

| Prop | Required | Type | Purpose |
|---|---|---|---|
| (children) | required | inline markdown | The verbal description |

No external references. The audit doesn't validate `<RepVerbal>`
beyond presence.

### `<RepEquation>`

References an existing `<KeyEquation>` (per
[PR-C2](../decisions/0038-pedagogy-index-pattern.md)) by its `eqKey`.

```mdx
<RepEquation refKey="kepler-3rd-law" symbol="r" />
```

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `refKey` | required | string | The referenced `<KeyEquation>`'s `eqKey` |
| `symbol` | required | string | Which symbol in the equation represents this concept |

The `symbol` field is required because a single equation typically
contains many symbols; the binding declares *which one* is this
concept's representation.

Audit invariant **MR2** checks that `symbol` matches the
registered concept's `canonical_symbol` (or a declared alias).

### `<RepFigure>`

References an existing `<Figure>` (per
[PR-C3](../decisions/0038-pedagogy-index-pattern.md)) by its `name`.

```mdx
<RepFigure refName="orbit-geometry" symbolLabel="r" />
```

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `refName` | required | string | The referenced `<Figure>`'s `name` |
| `symbolLabel` | optional | string | The symbol label that appears in the figure (for alignment checks) |

Audit invariant **MR4** checks that the figure's `alt` text
references the concept's `verbal_label` or `canonical_symbol`.

### `<RepCode>`

References an existing `<CodeCell>` (per
[ADR 0018](../decisions/0018-codemirror-6-for-codecell.md)) by its
`name`.

```mdx
<RepCode refName="orbit-simulation" symbol="r_au" />
```

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `refName` | required | string | The referenced `<CodeCell>`'s `name` |
| `symbol` | required | string | The variable name representing this concept in the code |

Audit invariant **MR3** checks that `symbol` matches the
registered concept's `code_alias`.

### `<RepIntuition>`

Physical or conceptual intuition — analogies, mental models,
embodied descriptions. Prose-only.

```mdx
<RepIntuition>
  Imagine an ant walking around the orbit — how far must it travel
  to reach the central mass?
</RepIntuition>
```

| Prop | Required | Type | Purpose |
|---|---|---|---|
| (children) | required | inline markdown | The intuition prose |

No external references. The audit doesn't validate `<RepIntuition>`
beyond presence.

## Fully-filled example: ASTR 201 Module 2 — Kepler's Third Law

A real `<MultiRep>` from ASTR 201's Module 2 Lecture 4 binding
*orbital radius* across all five representations:

```mdx
## Orbital radius

Kepler's third law connects the orbital radius of a body to its
period; before we work the math, let's bind the concept across
its representations.

<MultiRep concept="orbital-radius">
  <RepVerbal>
    The orbital radius is the instantaneous distance between the
    orbiting body and the gravitational center it orbits. For a
    circular orbit it's constant; for an elliptical orbit it
    varies between perihelion and aphelion.
  </RepVerbal>

  <RepEquation refKey="kepler-3rd-law" symbol="r" />

  <RepFigure refName="orbit-geometry" symbolLabel="r" />

  <RepCode refName="orbit-simulation" symbol="r_au" />

  <RepIntuition>
    Picture an ant walking along the orbit. Its distance from the
    Sun — measured by a string stretched taut from the Sun to the
    ant — is *r*. The ant's path doesn't matter; only the
    stretched-string length does.
  </RepIntuition>
</MultiRep>

The five representations above are *the same thing* — when you
encounter *r* in an equation later in this chapter, your mental
model should already include the orbital geometry, the simulation
variable, and the ant analogy. Notation drift is how we lose that
binding; declaring it here prevents the drift.
```

## How the audit uses `<MultiRep>` bindings

The build-time [Representation Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md#artifact-3-representation-alignment-audit-v1-8-invariants)
walks every `<MultiRep>` block and checks four invariants per
block:

| Invariant | Severity | Check |
|---|---|---|
| **MR1** | ERROR | `concept` resolves in `notation-registry.yaml` |
| **MR2** | WARNING | `<RepEquation symbol>` matches the concept's `canonical_symbol` |
| **MR3** | WARNING | `<RepCode symbol>` matches the concept's `code_alias` |
| **MR4** | INFO | `<RepFigure>`'s referenced figure has alt text mentioning `verbal_label` or `canonical_symbol` |

These invariants are the *floor* — they catch the most common
drift modes (binding to a non-existent concept; equation/code
symbols drifting from registered names; figures whose alt text
loses the binding). The full list and severity rationale lives in
[ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md).

## How this connects to other Sophie machinery

### Notation Registry (per [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md))

`<MultiRep concept="…">` requires the concept to be registered.
Adding a `<MultiRep>` block for an unregistered concept is an
**ERROR** — the registry is the external source of truth.

### Pedagogy Contract (per [ADR 0042](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md))

A course opts into `<MultiRep>` + the audit by setting
`math_and_units_standards.notation_registry` in
`pedagogy-contract.yaml`. Courses that don't declare a registry
can't meaningfully use `<MultiRep>`.

### Teaching Move Library (per [ADR 0041](../decisions/0041-teaching-move-library.md))

`<MultiRep>` is the canonical Sophie component for the
*multiple-representations-binding* move (Ainsworth 2006 — DeFT
framework). The future
[`packages/components/src/pedagogy/move-index.ts`](../decisions/0041-teaching-move-library.md)
(see ADR 0041's *Where `pedagogy_intent` lives in code* section)
will declare:

```ts
MultiRep: ["multiple-representations-binding"],
```

### Pedagogy index (per [ADR 0038](../decisions/0038-pedagogy-index-pattern.md))

The `<MultiRep>` children-mode extractor produces an entry per
block in the build-time pedagogy index. The index entry shape is
TBD in the follow-up code PR but parallels the existing
`equations`, `figures`, `definitions` collections.

### Cosmic Playground demos (per [ADR 0008](../decisions/0008-cosmic-playground-protocol.md))

A `<RepCode refName="…">` may reference a Cosmic Playground demo
slug. The binding tells students "this demo *is* the code
representation of this concept" — the demo's runtime state
becomes the concept's interactive surface.

## Authoring tips

- **Bind on first appearance.** The most useful `<MultiRep>`
  blocks are at the *introduction* of a concept. Subsequent
  appearances assume the binding established earlier; they don't
  need to be re-bound unless a new representation is introduced.
- **Include `<RepIntuition>` even when the rest is rigorous.**
  Embodied / analogical intuition is the
  hardest-to-teach but easiest-to-omit form. Forcing yourself to
  write one surfaces what's missing from your conceptual model.
- **Keep `<RepVerbal>` short.** One or two sentences. The
  representations are the substance; the verbal label is the
  handle that ties them together.
- **Don't fake representations.** If the chapter doesn't include
  a code form of the concept, skip `<RepCode>`. A `<MultiRep>`
  block declaring representations that don't actually appear in
  the chapter is dishonest scaffolding.
- **One binding per concept per chapter.** Multiple `<MultiRep>`
  blocks for the same concept in the same chapter create
  ambiguity about which binding is canonical. If you need to
  add representations later in the chapter, edit the original
  block.

## Reader-facing behavior

The reader UI for `<MultiRep>` is TBD in the follow-up code PR
but the design intent is:

- **`layout="toggle"`** (default) — radio-button selector lets
  the reader pick which representation to view.
- **`layout="side-by-side"`** — all representations render in a
  responsive grid; useful for the binding-introduction usage.
- **`layout="stack"`** — sequential rendering; useful when the
  representations build on each other rather than equivalent
  views.

Accessibility per [ADR 0004](../decisions/0004-component-contract-revisions.md):
axe-core verifies every layout mode; keyboard navigation walks
the representations; screen readers announce the binding context
("orbital radius — verbal representation of 5").

## Updating a `<MultiRep>` block

When a binding changes:

1. Edit the children in place.
2. If the change is *load-bearing* (e.g., changes the
   `<RepEquation refKey>` to point at a different equation), write
   a TDR per [ADR 0040](../decisions/0040-teaching-decision-records.md)
   capturing the rationale.
3. If the change reflects a registry-level decision (e.g.,
   renaming the canonical symbol), update
   `notation-registry.yaml` first; the audit will catch chapters
   that haven't migrated.
