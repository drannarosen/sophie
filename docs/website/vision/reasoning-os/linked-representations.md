---
title: Linked representations
short_title: Linked representations
description: The design principle that one parameter cursor should co-vary multiple linked views, and why this requires a state primitive architecturally distinct from useInteractive.
tags: [vision, reasoning-os, linked-representations, state, architecture, c-tier]
---

# Linked representations

A Sophie page often presents the same physical system from
multiple angles: an equation, a plot, a geometric diagram, a
simulation, a tabular form. The current platform lets each of
those exist independently. The Reasoning-OS thesis claims they
should *co-vary*: one parameter cursor, multiple synchronized
views.

This page describes the principle, sketches its target shape, and
explains why the underlying state primitive (registered as
[A11](../features/accepted.md) in accepted-pending-ADR) is
architecturally distinct from
[`useInteractive`](../../decisions/0007-persistence-indexeddb.md).
This page is **C-tier work**, deliberately deferred — naming the
principle now is what lets [ADR 0058](../../decisions/0058-epistemic-component-contract.md)
ship without designing around a state model that doesn't exist
yet.

## The principle

Students struggle with parameter sensitivity not because the math
is hard but because the page presents each representation in
isolation. Changing stellar mass on the HR-diagram page does not
change the spectrum panel. Changing eccentricity on the orbit-
geometry plot does not update the angular-momentum graph. The
representations are *describing the same physical system* but the
page treats them as independent figures.

Linked-representation pages invert this. One parameter cursor
("stellar mass," "orbital eccentricity," "blackbody temperature")
is the page's authoritative state. Every representation on the
page subscribes to the cursor and re-renders continuously as the
cursor moves. The reader sees the *shape* of the parameter
dependence — what changes, what stays constant, what becomes
unstable at the limits — instead of memorizing discrete cases.

The principle is not "interactive figures should respond to user
input." That's just interactivity. The principle is *"all
representations of the same physical system on the same page
share one source of truth, and that source of truth is the
page-level parameter cursor."*

## A worked target: the stellar-structure page

A future stellar-structure chapter page might carry:

- **Parameter cursor:** mass slider (0.1 → 100 M⊙).
- **Linked view 1 — HR diagram.** The star's track position
  updates as mass changes; the cursor sweeps the main sequence.
- **Linked view 2 — interior structure plot.** Radial profiles of
  ρ, P, T, opacity update; convective vs. radiative zone
  boundaries shift.
- **Linked view 3 — spectrum.** Effective-temperature shift
  morphs the blackbody peak; absorption-line strengths update.
- **Linked view 4 — equation panel.** `<KeyEquation>` cards for
  hydrostatic equilibrium and the mass-luminosity relation
  display the cursor's mass in their parameter slot.
- **Linked view 5 — timescale indicator.** Kelvin-Helmholtz
  timescale, nuclear timescale, and free-fall timescale update.
- **Optional `<UncertaintyLens>` overlay.** Posterior bands on
  the HR-diagram track expand to show observational uncertainty
  in inferred mass.

The reader's intuition forms from continuity: dragging the
slider from 0.5 M⊙ to 50 M⊙ shows the *trajectory* through
parameter space, not nine static snapshots.

## Why this requires a new state primitive (A11)

Sophie already has a state primitive:
[`useInteractive`](../../decisions/0007-persistence-indexeddb.md)
(per ADR 0007 + ADR 0029). It exists to persist *per-component,
per-student* interaction state across sessions — a student's
answer to a `<Predict>`, the open/closed state of a
`<CollapsibleCard>`, the entered code in a `<CodeCell>`. The data
flow is:

```
component instance ──writes─→ IndexedDB
component instance ←─reads── IndexedDB
```

`useInteractive` is built for *durable, per-component,
per-student* state. It is *not* built for *ephemeral, cross-
component, page-shared* state. The two shapes are different:

| Concern              | `useInteractive` (ADR 0007)              | Linked-rep cursor (A11)            |
| -------------------- | ---------------------------------------- | ---------------------------------- |
| Lifetime             | persistent across sessions               | ephemeral within a page view       |
| Scope                | per-component instance                   | shared across multiple components  |
| Identity             | per-student                              | per-page (not per-student)         |
| Update rate          | one write per user event                 | high-frequency drag at ~60Hz       |
| Persistence          | IndexedDB write-through                  | in-memory only                     |
| Cross-tab sync       | yes (BroadcastChannel per ADR 0029)      | no (a slider is a single-tab cursor) |
| Failure mode         | "my answer didn't save"                  | "the spectrum panel didn't follow the slider" |
| Conflict resolution  | last-write-wins on stale timestamps      | not applicable — one writer per page |

These two state shapes don't share a substrate. Forcing the
linked-rep cursor into `useInteractive` would either (a) write
~60 IndexedDB transactions per second of slider drag (bad), or
(b) bypass IndexedDB for the cursor while keeping it for everything
else (creating two state models that look similar but behave
differently — worse).

The right shape is a small, page-local, reactive store (likely
[Zustand](https://zustand-demo.pmnd.rs/) or equivalent — the
specific library choice is the future A11 ADR's call) that
components subscribe to via a `useLinkedParameter("mass")`-style
hook. The store lives in React tree scope; it has no IndexedDB
binding; it is deliberately ephemeral.

## Why "ephemeral" matters

A linked-rep cursor's *position* is ephemeral by design.
Persisting *"the last value the student dragged the mass slider
to"* would either be useless (the student doesn't care if their
slider position is restored on revisit) or actively bad (the
slider position is a navigational state, not a learning artifact,
and restoring it muddles the distinction). What matters is the
student's *answer to a `<Predict>` about what happens at high
mass* — and that's already `useInteractive` territory.

The clean separation:

- *"What happens if I change this parameter?"* — A11 cursor;
  ephemeral; in-memory.
- *"Predict what will happen at 80 M⊙."* — `<Predict>` answer;
  durable; IndexedDB.

Conflating the two shapes is the architectural mistake A11 is
designed to avoid.

## Why this is C-tier work

The principle is real; the primitive is well-scoped; the use
cases are concrete. The reason it ships *after* ADR 0058's
contract is sequencing:

1. The eight-role grammar must exist first so that linked-view
   declarations can name *which role* each view holds (the HR
   diagram is `observable`; the equation panel is `model`; the
   uncertainty band is `uncertainty`).
2. The pedagogy-index extractor must know about role-tagged
   views so audit invariants and AI authoring can reason about
   them.
3. The first user of A11 is A8 `<OMIFlow>` — and A8 makes more
   sense to ship with linked-rep state already available than to
   ship A8 with hard-wired panel coupling and then refactor.

The cheap-path-to-pre-A11 today: components that *want* shared
state pass props from a common parent (the standard React
pattern). This works for two-component coupling within a single
section; it doesn't scale to page-wide cursors. A11 is the
scaling answer.

## Open questions for the A11 ADR

When A11 is drafted, it will need to resolve:

- **Store library.** Zustand (small, hooks-first, no provider
  needed) vs. Jotai (atom-based, finer granularity) vs. a
  bespoke `useSyncExternalStore`-based primitive
  ([React docs](https://react.dev/reference/react/useSyncExternalStore)).
- **Scope boundaries.** Page-level by default; section-level
  opt-in? Per-chapter? The "page" in MDX is fuzzy.
- **Animation API.** Does the store ship with built-in motion
  primitives (Framer/Motion integration), or do components
  declare their own transitions on cursor updates?
- **Server-side rendering.** A page-level cursor has a default
  value at SSR time; does it hydrate cleanly when the client
  takes over?
- **Cross-component role declaration.** Does A11 require linked
  components to declare their epistemic role at subscription
  time (so the store knows the view set), or does it stay
  role-agnostic?
- **Composability with `useInteractive`.** A `<Predict>`
  embedded inside a linked-rep section needs to read the
  *current cursor value* to know what the student is predicting
  *about* — at the moment of answer submission, the ephemeral
  cursor must produce a durable snapshot in the `<Predict>`'s
  IndexedDB write.

These are real architectural decisions, not pro-forma list items.
The A11 ADR is where they get resolved.

## See also

- [ADR 0058 — Epistemic Component Contract](../../decisions/0058-epistemic-component-contract.md)
  — declares the role taxonomy that A11 subscriptions will name.
- [ADR 0007 — Persistence (IndexedDB)](../../decisions/0007-persistence-indexeddb.md)
  — the per-component persistence primitive A11 is *not*.
- [ADR 0029 — BroadcastChannel last-write-wins](../../decisions/0029-broadcast-channel-last-write-wins.md)
  — refines `useInteractive`'s cross-tab semantics; A11 has no
  equivalent because cursors are single-tab.
- [features/accepted.md](../features/accepted.md) — A11 entry
  with status line.
