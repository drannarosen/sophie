---
date: 2026-05-19T00:00:00.000Z
tags:
  - pedagogy
  - reasoning-os
  - component-contract
  - composite-primitive
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0063: `<OMIFlow>` composite primitive (A8)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Prerequisite**: [0058](./0058-epistemic-component-contract.md) (eight-role epistemic contract)
- **Sibling-deferred**: [0059](./0059-linked-representation-state-primitive.md) (linked-rep integration → v2)
- **Related**: [0030](./0030-audience-and-ai-author-model.md), [0031](./0031-compound-component-layout-primitives.md), [0038](./0038-pedagogy-index-pattern.md), [0043](./0043-notation-registry-multirep-alignment-audit.md), [0061](./0061-ai-optimized-codebase-design.md)
:::

## Context

[ADR 0058](./0058-epistemic-component-contract.md) §5 *"Audit invariant
deferred to a later ADR"* promised that A8's graduation would carry the
chapter-level OMI-coherence gate — *"every chapter declaring
`framing: 'OMI'` reaches all three observable / model / inference
roles."* This ADR delivers that follow-up and graduates A8
([accepted features §A8](../vision/features/accepted.md#a8-omiflow-composite-primitive))
from accepted-pending-ADR to shipped.

A8 is also the first **composite** pedagogy component built end-to-end
on the eight-role contract: three slots, each declaring its role at the
slot-component-name layer rather than via an author-supplied prop. The
contract IS the slot binding. Future composite primitives (A9
`<AssumptionStack>`, A10 `<UncertaintyLens>`) inherit the same shape;
A8 proves it works.

The motivating chapter is ASTR 201 Module 3 (stellar spectra →
temperature → composition), which Anna has identified as the first
real-content target. Platform validation lands in the smoke target
first: `examples/smoke`'s `spoiler-alerts.mdx` ships the first
synthetic `<OMIFlow>` callsite in PR-B of the implementation sequence.

The full 14-decision brainstorm is captured at
[`docs/plans/2026-05-19-omiflow-design.md`](../../plans/2026-05-19-omiflow-design.md);
this ADR is the audit-trail counterpart that locks those decisions.

## Decision

`<OMIFlow>` is a **compound component** with three named slots whose
component names deterministically bind their epistemic roles:

| Slot                        | Role          |
|-----------------------------|---------------|
| `<OMIFlow.Observable>`      | `observable`  |
| `<OMIFlow.Model>`           | `model`       |
| `<OMIFlow.Inference>`       | `inference`   |

The 14 v1 decisions follow. Each inherits from a pattern already locked
elsewhere; the OMIFlow ADR's job is to bind them into one coherent
composite shape.

### 1. v1 is pure layout

`<OMIFlow>` v1 is a **pure three-panel layout primitive**. No
parameter-driven cross-slot recomputation; no shared state between
slots. Linked-representation integration ([ADR 0059](./0059-linked-representation-state-primitive.md))
is a deliberate v2 amendment that lands after the interactive-figures
workstream graduates. Pure-layout is *composable* with linked-rep:
the v2 amendment adds the wiring without redesigning the slot shape.

### 2. Visual: flat 3-panel grid + subtle chevrons

Desktop: three panels side-by-side with a thin `›` between them.
Mobile + print: panels stack vertically with the chevron rotating to
`↓`. No SVG-arrow complexity; CSS-only. The chevrons earn the "Flow"
in the component's name without inheriting the maintenance cost of
SVG path geometry.

### 3. Slot requirements: strict-3

Every `<OMIFlow>` MUST contain exactly one `<OMIFlow.Observable>`,
exactly one `<OMIFlow.Model>`, and exactly one `<OMIFlow.Inference>`.
The extractor throws on missing or duplicated slots. This is the
cleanest invariant: a Zod literal tuple at the schema layer, a hard
extractor error in CI, and a trivially-provable chapter-level audit
gate (one `<OMIFlow>` per OMI chapter satisfies OF-2 by construction).

### 4. Source-order tolerance: liberal in, strict out

Authors may write slots in any source order. The renderer always emits
canonical `observable → model → inference`. The extractor records the
as-authored order on the entry, and OF-1 (WARN) flags out-of-order
source as a likely typo or mid-refactor state. *Be liberal in what you
accept, strict in what you produce.*

### 5. Per-slot heading: role label + optional title

Each slot's title bar shows the role label as a small-caps prefix
(`OBSERVABLE`, `MODEL`, `INFERENCE`). If the author supplies a
`title=` attribute, it appends after a separator: `OBSERVABLE — H-α
line emission`. The role binding is visible without authoring work; a
helpful `title` enriches but never replaces the role label.

### 6. Concept binding: optional `concept=` prop

The root `<OMIFlow>` accepts an optional `concept="…"` prop that binds
the composite to a [Notation Registry](./0043-notation-registry-multirep-alignment-audit.md)
concept slug. v1 carries no audit invariant on this field — it is
forward-compatible surface for the future MultiRep ↔ OMIFlow cross-
link. Concept binding also drives the anchor when `id=` is absent (see
decision 10).

### 7. Nested content: arbitrary MDX per slot

Each slot accepts arbitrary MDX — prose, math, `<Figure>`,
`<KeyEquation>`, `<Callout>`, anything. v1 imposes no preemptive
restrictions on which Sophie components may appear inside a slot.
YAGNI on slot-content allow-lists; if a pattern abuse surfaces, add
the invariant then.

### 8. No compact / variant: single canonical shape

v1 ships one layout, one shape. No `compact`, `dense`, `inline`, or
variant props. Ship the canonical primitive first; variants earn
their existence by producing concrete consumer requests we can point
at.

### 9. Pedagogy-index shape: one entry per callsite

The pedagogy-index extractor emits **one `OMIFlowEntry` per
`<OMIFlow>` callsite** carrying all three slot bodies as nested
`{ title, body }` records. Slots do not become separate index entries.
Rationale: cross-cutting audit invariants need to introspect the
*combination* of slots within a single composite; a flat per-slot
table would lose that grouping. The shape mirrors how
[ADR 0046](./0046-equation-biography.md) carries biography children
under one parent entry.

### 10. Anchor convention: `omi-${…}` precedence chain

Anchor derivation, in priority order:

1. Explicit `id=` attribute always wins.
2. Otherwise, if `concept=` is present: `omi-${slug(concept)}`.
3. Otherwise: auto-numbered `omi-${counter}` (chapter-scoped, restarts
   at 1 per chapter).

Intra-chapter anchor collisions throw at extract time (the *D1*-style
gate from PR-B's deep-dive extractor). Cross-chapter collisions on
*explicit-id-derived* anchors throw at accumulator time; auto-numbered
`omi-${N}` anchors are chapter-scoped and exempt from the cross-
chapter check.

### 11. Role binding source: slot component name (hardcoded)

`<OMIFlow.Observable>` is **always** role `observable`. The binding
is not author-overridable; there is no `<OMIFlow.Observable
role="model">` escape hatch. The contract IS the slot binding.
Allowing override would defeat the whole point of slot-name-binds-
role: an extractor or auditor could no longer trust that slot
identity implies role.

### 12. a11y shape: role="group" + per-slot landmarks

Outer element: `<div class="omi-flow" role="group"
aria-labelledby="${id}-label">`. Each slot wraps in a `<section>`
with its own `aria-labelledby` pointing at the slot's title span.
The composite presents as one labeled group containing three labeled
sections — the screen-reader experience matches the visual three-
panel structure. axe-clean per [ADR 0004](./0004-component-contract-revisions.md).

### 13. Print mode: stack vertically with `↓` chevrons

`@media print` collapses to the mobile-stack layout. One CSS rule;
no separate print template. The three panels and their chevrons
print as a vertical OMI strip; the role labels (decision 5) keep the
flow readable in monochrome.

### 14. First migration target: smoke chapter, then ASTR 201 M3

PR-B migrates the smoke target (`examples/smoke`'s
`spoiler-alerts.mdx`) first as platform-validation surface. The real-
content ASTR 201 Module 3 migration ships as a *separate content PR*
in the consumer repo so Anna's chapter-authoring time stays
decoupled from platform-side debug.

## Rationale

Three load-bearing arguments support the locked decisions above; each
points at a specific decision-table row.

### Pure-layout v1 is composable with linked-rep v2

Decision 1 is the load-bearing scope choice. The v1 surface is small
enough to ship in three PRs over ~3 days; doubling that surface with
parameter-coupled cross-slot state would pull A11 (linked-rep) into
A8's critical path and double the audit / VR / e2e burden. Because
the layout is *additive over* the slot contract, v2 adds linked-rep
wiring without changing decisions 3, 9, 10, 11, or 12. Pure layout is
not a step-down from the "real" version; it is the substrate the
"real" version composes onto.

### Strict-3 slot tuple makes the audit gate trivially provable

Decisions 3 + 9 + 11 together produce an audit-friendly shape: at
extract time the schema rejects entries that don't match the tuple
shape (compile-time + parse-time double-binding, per ADR 0058's
canonical role-declaration shape). At audit time, OF-2 reduces to
"index.omiFlows.some(o => o.chapter === slug)" — one line. Compare to
a liberal-slots design (zero-or-many `observable`s, zero-or-many
`model`s) where the audit would need to count + dedupe + report
per-role coverage, and Anna would inevitably ship a chapter with an
accidentally-empty model slot.

### Slot-name binds role is what makes the eight-role contract legible in MDX

Decision 11 is the headline. ADR 0058 documented eight roles. ADR
0046 carried them via component constants (`OBSERVABLE_EPISTEMIC_ROLE
= "observable"` declared on `<Observable>`). A8 takes that pattern to
its strongest form: the slot's *name* (`<OMIFlow.Observable>`) is
literally the role. AI authoring can read the JSX and know the
epistemic structure without inspecting any prop. Human authors writing
the MDX get role declaration *for free* — they could not authorize
the slot without naming its role. The contract becomes prose-legible.

## Alternatives considered

- **Prop-based shape**: `<OMIFlow observable={…} model={…}
  inference={…} />`. Rejected. Violates the compound-component pattern
  locked by [ADR 0031](./0031-compound-component-layout-primitives.md)
  and the `<LearningObjectives>` PR-C4 refactor (children-mode replaced
  inline prop arrays for AI-authoring legibility). Inline prop arrays
  also defeat the
  [CLAUDE.md "AI-authoring-friendly source-component patterns"](../../../CLAUDE.md)
  principle: MDX extraction is mechanical only when JSX tree shape
  reflects pedagogy shape.

- **Liberal slot requirements** (any subset, any count per role).
  Rejected. Defeats the audit invariant's elegance (decision 3
  rationale); produces silently-broken chapters where one role panel
  is empty; multiplies the renderer's layout branches without
  observable upside.

- **Author-overridable role binding**
  (`<OMIFlow.Observable role="model">`). Rejected. The contract IS the
  slot binding (decision 11). Allowing override means an extractor
  can't trust slot identity, which means the eight-role taxonomy from
  ADR 0058 loses its primary leverage point in MDX.

- **Linked-rep integration in v1**. Rejected. Doubles the surface area
  and pulls A11 into A8's critical path. Composable as v2 amendment
  per decision 1. The decoupling lets each ADR's audit / VR / e2e
  surface ship independently.

- **Per-slot pedagogy-index entries** (decision 9 alternative). Three
  rows per callsite — one per slot — would flatten the index for
  per-role queries but lose the *combination* needed for OF-2 and
  future cross-slot consistency audits. The one-entry-per-callsite
  shape keeps the related-slot grouping discoverable; per-role
  queries become a one-liner `.flatMap` over the same data.

- **Separate `<OMIChapter>` wrapper** instead of slot binding on a
  per-callsite primitive. Considered as a coarser-grained alternative
  — a chapter-level wrapper that *contains* the three roles instead
  of a per-callsite composite. Rejected because it ties the role
  declaration to the *chapter* rather than to the *visualization
  unit*, which fails when a chapter wants two OMI flows for two
  different observables (Module 3 has one; a future chapter might
  have several). The composite primitive scales to N flows per
  chapter naturally; an `<OMIChapter>` wrapper does not.

## Consequences

**Easier:**

- ADR 0058's deferred OMI-coherence audit invariant graduates as
  **OF-2** in this PR sequence (PR-C). The contract has somewhere to
  bind.
- AI authoring can target OMI chapters with a single named primitive.
  The slot-name → role contract makes the JSX self-documenting.
- ASTR 201 Module 3 unlocks a visual OMI surface (post-PR-C, as a
  separate content PR).
- MultiRep ↔ OMIFlow cross-link surface opens via the optional
  `concept=` binding without locking semantics today (decision 6).
- A9 `<AssumptionStack>` and A10 `<UncertaintyLens>` inherit the
  slot-binds-role pattern. The pattern is no longer hypothetical.

**Harder:**

- One more component schema + extractor + accumulator slot to maintain
  on every cross-cutting pedagogy refactor. Bounded — the shape
  mirrors `<Misconception>` and `<DeepDive>` from PR-B exactly.
- Future linked-rep integration (v2) requires re-opening
  `<OMIFlow.{slot}>` to accept the `useLinkedParameter` hook surface.
  Decoupled from v1; lands in its own amendment.

**Triggers:**

- Implementation: PR-A (this ADR + schema + extractor + accumulator +
  OF-1), PR-B (component + stories + axe + VR baselines + smoke
  fixture), PR-C (OF-2 chapter-level invariant + e2e + docs sweep).
  See [`docs/plans/2026-05-19-omiflow-implementation.md`](../../plans/2026-05-19-omiflow-implementation.md).
- Future amendment: linked-representation integration after A11's
  `useLinkedParameter` graduates into general use.
- Future ADRs: A9 `<AssumptionStack>` and A10 `<UncertaintyLens>` —
  same slot-binds-role pattern, different role sets.
- Future content PR: ASTR 201 Module 3 OMI migration (separate
  consumer repo).

## References

- [ADR 0058](./0058-epistemic-component-contract.md) — eight-role contract (prerequisite)
- [ADR 0059](./0059-linked-representation-state-primitive.md) — linked-rep primitive (sibling-deferred)
- [ADR 0030](./0030-audience-and-ai-author-model.md) — AI as primary author
- [ADR 0031](./0031-compound-component-layout-primitives.md) — compound-component pattern
- [ADR 0038](./0038-pedagogy-index-pattern.md) — pedagogy-index extractor / accumulator pattern
- [ADR 0043](./0043-notation-registry-multirep-alignment-audit.md) — Notation Registry (for `concept=` binding)
- [ADR 0046](./0046-equation-biography.md) — canonical role-declaration shape (component const + `EpistemicRoleSchema.extract`)
- [ADR 0061](./0061-ai-optimized-codebase-design.md) — atomic-docs rule (this ADR sweep satisfies)
- [`docs/plans/2026-05-19-omiflow-design.md`](../../plans/2026-05-19-omiflow-design.md) — full 14-decision brainstorm
- [`docs/plans/2026-05-19-omiflow-implementation.md`](../../plans/2026-05-19-omiflow-implementation.md) — executable PR-A/B/C plan
- [ADR 0064](./0064-chapter-migration-playbook.md) — chapter-migration playbook locked by the ASTR 201 M2-L3 pilot this ADR motivated; cites OF-2 conformance as step 4 of the migration protocol
- [pilots/m2-l3-spectra-composition.md](../pilots/m2-l3-spectra-composition.md) — the M2-L3 pilot report (worked example for ADR 0064's template); OMI-arc map shows OMIFlow exercised at production-chapter scale
