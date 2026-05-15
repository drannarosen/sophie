---
title: MultiRep component reference
short_title: MultiRep component
description: >-
  Chapter-author reference for the `<MultiRep>` component and its child elements
  (`<RepVerbal>`, `<RepEquation>`, `<RepFigure>`, `<RepCode>`). The component
  binds multiple representations of one concept and feeds the Representation
  Alignment Audit. Includes a fully-filled ASTR 201 example.
tags:
  - pedagogy
  - reference
  - components
  - multirep
  - representation-alignment
  - multiple-representations
  - lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
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
    (Authoring tip: intuitive framing belongs in this prose body —
    e.g., "imagine an ant walking around the orbit; how far must
    it travel to reach the central mass?" The dedicated
    `<RepIntuition>` primitive was dropped in the 2026-05-14
    hardening; prose handles intuition.)
  </RepVerbal>
  <RepEquation refKey="kepler-3rd-law" symbol="r" />
  <RepFigure refName="orbit-geometry" symbolLabel="r" />
  <RepCode refName="orbit-simulation" symbol="r_au" />
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
the chapter. Verbal + equation without figure is valid; all four
forms together is valid; verbal + figure (skipping equation + code)
is valid.

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

<!-- Variable-substitution-equivalent form (hardened 2026-05-14) -->
<RepEquation
  refKey="kepler-3rd-law-au-form"
  symbol="r_au"
  equivalent_to="kepler-3rd-law"
  via="natural-units-substitution"
/>
```

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `refKey` | required | string | The referenced `<KeyEquation>`'s `eqKey` |
| `symbol` | required | string | Which symbol in the equation represents this concept |
| `equivalent_to` | optional | string (refKey) | **NEW (2026-05-14 hardening)**: declares this equation is a variable-substitution-equivalent form of another `<KeyEquation>` or `<RepEquation>` |
| `via` | optional | string (substitution slug) | **NEW (2026-05-14 hardening)**: names the substitution (e.g., `planck-substitution`, `unit-system-conversion`, `non-dimensionalization`, `small-z-limit`). Free-form slug; no v1 platform catalog. |

The `symbol` field is required because a single equation typically
contains many symbols; the binding declares *which one* is this
concept's representation.

**Equivalent forms.** `equivalent_to=<refKey>` + `via=<slug>`
declares two equations describe the same concept under a known
transformation. Use cases:

- Wien's law in wavelength form (`λ_peak = b/T`) vs frequency form
  (`ν_peak = aT`); `via="planck-substitution"`.
- SI vs CGS expressions; `via="unit-system-conversion"`.
- Dimensional vs non-dimensional forms; `via="non-dimensionalization"`.
- Exact vs approximation (e.g., full relativistic Hubble vs `z << 1`);
  `via="small-z-limit"`.

Audit invariants:

- **MR2** (WARNING) checks that `symbol` matches the registered
  concept's `canonical_symbol` (or a declared alias).
- **MR6** (INFO, hardened 2026-05-14) checks that
  `equivalent_to="X"` resolves to a real `<KeyEquation refKey="X">`
  in the chapter's equation index OR to another
  `<RepEquation refKey="X">` in the same MultiRep.

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

### `<RepCode>` (two-mode binding, hardened 2026-05-14)

Two binding modes — preferred is in-chapter `<CodeCell>`; alternative
is external artifact with full provenance.

**In-chapter binding (preferred):**

```mdx
<RepCode refName="orbit-simulation" symbol="r_au" />
<!-- ... and somewhere in the chapter: -->
<CodeCell name="orbit-simulation" pedagogical_kind="predict-then-run">
  # python code here
</CodeCell>
```

**External-mode binding (when in-chapter isn't appropriate):**

```mdx
<RepCode
  refName="orbit-simulation"
  symbol="r_au"
  external_url="https://github.com/drannarosen/astr201-demos/blob/v1.2/orbit.py"
  external_cache_hash="sha256:abc1234..."
  external_version="v1.2"
  authored_by="alrosen"
  authored_date="2026-05-14"
  reviewed_by="alrosen"
  reviewed_date="2026-05-14"
/>
```

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `refName` | required | string | The referenced `<CodeCell>`'s `name` (in-chapter mode) OR a stable identifier (external mode) |
| `symbol` | recommended | string | The variable name representing this concept in the code |
| `external_url` | required for external mode | string (URL) | Location of the external artifact |
| `external_cache_hash` | required for external mode | string (sha256) | Content hash at review time |
| `external_version` | required for external mode | string (tag) | Human-readable version (e.g., `v1.2`) |
| `authored_by` | required for external mode | string | Who authored the external artifact |
| `authored_date` | required for external mode | ISO 8601 date | When it was authored |
| `reviewed_by` | required for external mode | string | Who reviewed it |
| `reviewed_date` | required for external mode | ISO 8601 date | When it was reviewed |

**Mode discrimination**: presence of `external_url` selects external
mode; absence selects in-chapter mode. Mode-specific required
attributes:

- *In-chapter mode*: only `refName` required; `<CodeCell name>`
  matching must exist in chapter.
- *External mode*: ALL eight attributes required (the three
  `external_*` + four structured provenance fields).

Audit invariants:

- **MR3** (WARNING) checks `symbol` matches the registered
  concept's `code_alias`.
- **MR5** (ERROR, hardened 2026-05-14) — half-specified external
  mode (declares `external_url` but missing any of the other
  external-mode required attributes) OR neither mode resolves
  (no `external_url` AND no in-chapter `<CodeCell>` matching
  `refName`). Severity is ERROR because half-specified external
  code breaks audit reproducibility.

Runtime diagnostic behavior (per
[ADR 0053](../decisions/0053-conformance-failure-modes.md) when it
graduates): when an external URL becomes unreachable post-deploy,
`<RepCode>` renders a diagnostic placeholder showing the URL +
provenance + Wayback link.

### ~~`<RepIntuition>`~~ (DROPPED in 2026-05-14 hardening)

The `<RepIntuition>` primitive was dropped during the 2026-05-14
hardening pass. Rationale: it was prose by another name — every
intuition framing could equally well live inside `<RepVerbal>`,
and the separate primitive's distinction was conceptually fuzzy.
Reduces component-inventory surface; no functional loss.

**Migration**: move any intuition content into `<RepVerbal>` (use
a leading framing sentence like *"Think of this as..."* if you
want to foreground the intuition):

```mdx
<!-- Before (pre-hardening): -->
<MultiRep concept="orbital-radius">
  <RepVerbal>The distance from the central mass...</RepVerbal>
  <RepIntuition>Imagine an ant walking around the orbit...</RepIntuition>
</MultiRep>

<!-- After (post-hardening): -->
<MultiRep concept="orbital-radius">
  <RepVerbal>
    The distance from the central mass to the orbiting body.
    Imagine an ant walking around the orbit — how far must it
    travel to reach the central mass?
  </RepVerbal>
</MultiRep>
```

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
    varies between perihelion and aphelion. (Intuition: picture
    an ant walking along the orbit. Its distance from the Sun —
    measured by a string stretched taut from the Sun to the
    ant — is *r*. The ant's path doesn't matter; only the
    stretched-string length does.)
  </RepVerbal>

  <RepEquation refKey="kepler-3rd-law" symbol="r" />

  <RepFigure refName="orbit-geometry" symbolLabel="r" />

  <RepCode refName="orbit-simulation" symbol="r_au" />
</MultiRep>

The four representations above are *the same thing* — when you
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

*Speculative; pending Phase 4 design.* `<RepCode>` at v1
references `<CodeCell>` entries (ADR 0018). A future extension
could allow `<RepCode>` to also reference a Cosmic Playground
demo slug — making the demo's runtime state the concept's
interactive representation — but this requires manifest-schema
work on Cosmic Playground's side and is **not** committed by
ADR 0043.

## Authoring tips

- **Bind on first appearance.** The most useful `<MultiRep>`
  blocks are at the *introduction* of a concept. Subsequent
  appearances assume the binding established earlier; they don't
  need to be re-bound unless a new representation is introduced.
- **Include intuition framing in `<RepVerbal>` even when the rest
  is rigorous.** Embodied / analogical intuition is the
  hardest-to-teach but easiest-to-omit form. Forcing yourself to
  include an intuition sentence ("Think of this as...") in
  `<RepVerbal>` surfaces what's missing from your conceptual
  model. (Pre-hardening this used to be its own `<RepIntuition>`
  primitive; dropped 2026-05-14 — prose handles it.)
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
