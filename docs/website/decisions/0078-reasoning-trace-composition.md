---
date: 2026-05-21T00:00:00.000Z
tags:
  - components
  - composition
  - epistemic-role
  - reasoning-trace
  - omiflow
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0078: Reasoning Trace component — extend OMIFlow vs. ship `<ReasoningTrace>` (composition design)

:::{admonition} ADR metadata

- **Status**: **proposed** (decision pending — three options below)
- **Deciders**: anna
- **Amends** (if A or C chosen): [0063](./0063-omiflow-composite-primitive.md)

:::

## Context

The course-website roadmap's external review (2026-05-21, ChatGPT
follow-up) proposed a **Reasoning Trace component** for exposing
the chain of scientific reasoning behind a worked example:

```mdx
<ReasoningTrace>
  <Observe>We measure an apparent brightness.</Observe>
  <Model>Assume isotropic emission from a point source.</Model>
  <Infer>Use inverse-square dilution to estimate luminosity.</Infer>
  <Check>Verify units: flux × area gives power.</Check>
</ReasoningTrace>
```

This is *adjacent to* but *distinct from* a worked example:

- A **worked example** solves a problem; its annotations are
  step-by-step procedural ("first do X, then do Y").
- A **reasoning trace** exposes the epistemic anatomy of the
  approach: observable inputs, modeling assumptions, inferential
  moves, validation checks.

It is *very* adjacent to [ADR 0063 (`<OMIFlow>`
composite primitive)](./0063-omiflow-composite-primitive.md), which
ships exactly three slots: `<OMIFlow.Observable>`, `<OMIFlow.Model>`,
`<OMIFlow.Inference>`. The new `<Check>` slot proposed in the
external review fits naturally on the same OMI spine.

This adjacency forces a composition-design decision: **do we extend
`<OMIFlow>` to a 4-slot pattern (adding `<Check>`), ship
`<ReasoningTrace>` as a sibling component with more slots, or
generalize both under a single role-labeled primitive?** Each choice
has real downstream consequences:

- The 3-slot OMI pattern has specific pedagogical meaning rooted in
  [pedagogical-foundations.md](../explanation/pedagogical-foundations.md)
  (the OMI verbal "framing" of a scientific claim). Diluting it to
  4+ slots may blur a deliberate semantic.
- Ad-hoc proliferation of similar epistemic-chain components
  (`<OMIFlow>`, `<ReasoningTrace>`, future `<OMIWithCheck>`,
  `<EpistemicChain>`, etc.) is the slippery-slope failure mode
  Sophie consistently avoids (per ADR 0058's eight-role contract
  being deliberately *additive and small*).
- The right call probably depends on whether `<Check>` is a
  one-off OMI extension (option A) or the first of several future
  slots to come — Assumption, Approximation, Numerical, etc. per
  ADR 0058's full role taxonomy (which favors option C).

The trigger is that *if* we ship Reasoning Trace functionality
in Wedge B or C, the composition decision needs to be made up-front
— either it amends ADR 0063 or it stands as a new ADR. Recording
the decision now (even if implementation is months away) prevents
the "two near-identical components shipped by accident" failure
mode.

## Decision space

Three viable options. **Anna picks**; this ADR records the choice +
rationale once made.

### Option A — Amend ADR 0063: 4-slot OMIFlow

```mdx
<OMIFlow>
  <OMIFlow.Observable>...</OMIFlow.Observable>
  <OMIFlow.Model>...</OMIFlow.Model>
  <OMIFlow.Inference>...</OMIFlow.Inference>
  <OMIFlow.Check>...</OMIFlow.Check>  {/* NEW, optional */}
</OMIFlow>
```

- Pros: One component; backwards-compatible (4th slot optional);
  preserves OMI as the canonical epistemic-anatomy primitive.
- Cons: "OMI" already had a specific 3-letter meaning in
  pedagogical-foundations.md; adding a 4th step technically isn't
  "OMI" anymore. Naming drift.
- Best for: if `<Check>` is a *one-off* extension and we don't
  expect more slots later.

### Option B — New `<ReasoningTrace>` as a sibling component

```mdx
<ReasoningTrace>
  <ReasoningTrace.Observe>...</ReasoningTrace.Observe>
  <ReasoningTrace.Assume>...</ReasoningTrace.Assume>
  <ReasoningTrace.Model>...</ReasoningTrace.Model>
  <ReasoningTrace.Compute>...</ReasoningTrace.Compute>
  <ReasoningTrace.Infer>...</ReasoningTrace.Infer>
  <ReasoningTrace.Check>...</ReasoningTrace.Check>
</ReasoningTrace>
```

- Pros: Clean semantic split; `<OMIFlow>` stays OMI (3 slots,
  fixed meaning); `<ReasoningTrace>` carries the broader
  epistemic-anatomy use case with as many slots as warranted.
- Cons: Two similar components; authors must choose between them
  for any given passage; risk of inconsistent usage; documentation
  has to explain the distinction.
- Best for: if `<Check>` is part of a broader pattern (Assume +
  Compute + Check + ...) that warrants its own component identity.

### Option C — Generalize: `<ReasoningTrace>` with role-labeled children, `<OMIFlow>` becomes a preset

```mdx
{/* General form */}
<ReasoningTrace>
  <ReasoningTrace.Step role="observable">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="assumption">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="model">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="inference">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="check">...</ReasoningTrace.Step>
</ReasoningTrace>

{/* OMIFlow stays as a convenience preset */}
<OMIFlow>  {/* equivalent to a 3-step ReasoningTrace with observable/model/inference roles */}
  <OMIFlow.Observable>...</OMIFlow.Observable>
  <OMIFlow.Model>...</OMIFlow.Model>
  <OMIFlow.Inference>...</OMIFlow.Inference>
</OMIFlow>
```

- Pros: One canonical primitive (`<ReasoningTrace>`) bound to
  ADR 0058's eight-role taxonomy directly; `<OMIFlow>` becomes a
  named convention for the 3-slot OMI pattern (one of many
  possible patterns); future extensions (Check, Compute, Validate,
  Approximation, Uncertainty, Numerical, Misconception) compose
  naturally without proliferating component types.
- Cons: Slightly more implementation work (a generic Step
  component with role-aware rendering); OMIFlow becomes a thin
  wrapper.
- Best for: if Sophie expects to ship multiple epistemic-chain
  patterns over time and wants the eight-role contract to be the
  single source of truth for what reasoning anatomies can look
  like.

### Recommendation

**Option C.** It's the SoTA-over-simple call. It preserves OMI's
semantic identity (the 3-slot pattern stays the named convention)
while making the broader epistemic-anatomy primitive a true general
case bound to ADR 0058's contract. Future slot additions (e.g.,
shipping `<Assumption>` or `<Check>` as siblings) don't require new
component types — they're new roles within the existing
`<ReasoningTrace>` primitive. This matches Sophie's general
preference for typed-contract-with-role-discriminator over
component-per-shape proliferation (the same pattern that gave
Wedge A discriminated unions over enums for Subsection / Unit
types).

Option A is the cheaper-now / costlier-later move. Option B is the
"keep them separate by safety" move with the documentation tax.
Both are defensible; Option C is the platform-aligned move.

If implementation considerations make Option C heavier than budgeted,
**fall back to Option A** (cheap; reversible later if more slots
arrive); **avoid Option B** unless we have a positive reason to
ship two near-identical primitives.

## Rationale (will be filled in once Anna picks)

[Placeholder — once Anna selects A / B / C, this section captures
*why* the choice fits Sophie's component-composition discipline.
The Decision-space section above moves to Alternatives.]

## Alternatives considered

[Placeholder — the two not-chosen options from the Decision space
move here with their pros/cons preserved.]

## Consequences

[Placeholder — once Anna picks, this section enumerates what the
choice makes easier / harder / triggers. Common triggers regardless
of choice:]

- A future Wedge B or C ships the chosen component(s).
- Updates to
  [pedagogical-foundations.md](../explanation/pedagogical-foundations.md)
  and the
  [chapter-components reference](../reference/chapter-components.md)
  document the chosen pattern.
- If Option A or C: ADR 0063 gets an `Amends-by:` admonition row
  pointing here.

## References

- [ADR 0063 — `<OMIFlow>` Composite Primitive](./0063-omiflow-composite-primitive.md) (this ADR sits in composition-design conversation with 0063)
- [ADR 0058 — Epistemic Component Contract](./0058-epistemic-component-contract.md) (the 8-role contract that Option C binds `<ReasoningTrace>` to directly)
- [ADR 0031 — Compound component layout primitives](./0031-compound-component-layout-primitives.md) (the slot-component pattern Options A/B/C all use)
- [pedagogical-foundations.md](../explanation/pedagogical-foundations.md) (defines OMI's 3-letter meaning; constrains how far Option A can stretch)
- [course-website-roadmap.md § Future capabilities — Tier B](../status/course-website-roadmap.md) (Reasoning Trace catalogued here)
