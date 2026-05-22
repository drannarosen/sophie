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

- **Status**: **accepted** (Option C chosen 2026-05-21 — generalize `<ReasoningTrace>` as the role-labeled parent; `<OMIFlow>` becomes a 3-slot preset)
- **Deciders**: anna
- **Amends**: [0063](./0063-omiflow-composite-primitive.md) (re-frames `<OMIFlow>` as a preset of the new `<ReasoningTrace>` primitive, preserving its 3-slot OMI semantics)

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

## Decision

**Option C — generalize: `<ReasoningTrace>` as a role-labeled parent
primitive; `<OMIFlow>` becomes a 3-slot preset.**

```mdx
{/* General form (new <ReasoningTrace>) */}
<ReasoningTrace>
  <ReasoningTrace.Step role="observable">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="assumption">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="model">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="inference">...</ReasoningTrace.Step>
  <ReasoningTrace.Step role="check">...</ReasoningTrace.Step>
</ReasoningTrace>

{/* OMIFlow stays — re-framed as a preset of ReasoningTrace */}
<OMIFlow>
  <OMIFlow.Observable>...</OMIFlow.Observable>
  <OMIFlow.Model>...</OMIFlow.Model>
  <OMIFlow.Inference>...</OMIFlow.Inference>
</OMIFlow>
```

The `role` prop binds to [ADR 0058
(Epistemic Component Contract)](./0058-epistemic-component-contract.md)'s
eight-role taxonomy: `observable` / `model` / `inference` /
`assumption` / `approximation` / `uncertainty` / `numerical` /
`misconception`. Future authored patterns (e.g., compute steps,
validation checks) compose as additional role values, not as new
component types.

## Rationale

Option C is the SoTA-aligned choice because:

1. **It binds to ADR 0058's already-locked contract.** The eight
   epistemic roles (observable / model / inference / assumption /
   approximation / uncertainty / numerical / misconception) are
   the platform's authoritative vocabulary for "what role does
   this pedagogy element play in scientific reasoning?" A
   role-labeled `<ReasoningTrace.Step>` makes the contract usable
   *as a primitive*, not just as a declarative annotation. Future
   epistemic-anatomy patterns extend by adding role values, not
   by adding component types.

2. **Preserves OMI's semantic identity.** `<OMIFlow>` stays as
   the named convention for the 3-slot Observable/Model/Inference
   pattern documented in
   [pedagogical-foundations.md](../explanation/pedagogical-foundations.md).
   Authors who want OMI's pedagogical framing get the familiar
   3-slot shape; authors who want a richer epistemic anatomy
   reach for `<ReasoningTrace>` with the slots they need.

3. **Matches Sophie's discriminated-union discipline.** Wedge A's
   schemas (Subsection, Unit, Artifact, Assessment) all use
   role/type discriminators within a single component contract
   rather than spawning one component per shape. ADR 0058's
   epistemic roles are the natural role discriminator for
   reasoning-anatomy components. Option C continues this
   architectural pattern.

4. **Avoids component proliferation.** Option B would ship two
   near-identical components and force every author to decide
   between them per usage. Sophie's house style is "one typed
   contract with discriminated variants, not N parallel
   components."

5. **Cheap migration path for OMIFlow.** Existing `<OMIFlow>`
   usage continues to work unchanged; the platform-internal
   refactor that makes `<OMIFlow>` consume `<ReasoningTrace>`
   underneath is transparent to authors. No author-visible
   breaking change.

6. **Future epistemic-anatomy patterns compose naturally.**
   When the next pattern surfaces (e.g., the Equation Clinic
   per ADR roadmap Tier A, which wants Assumption → Check →
   Diagnosis → Fix), it's a `<ReasoningTrace>` with the
   appropriate role labels, not a new component PR.

## Alternatives considered

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
  pedagogical-foundations.md; adding a 4th step technically
  isn't "OMI" anymore. Naming drift. Doesn't generalize when
  the *next* slot (Assumption, Compute, etc.) is needed.
- **Why rejected:** Optimizes for "one-off Check addition" but
  the analysis (and the roadmap's Tier A Equation Clinic +
  reasoning-trace need) suggests this is the first of multiple
  epistemic-anatomy patterns coming. Cheaper now; costlier later.

### Option B — New `<ReasoningTrace>` as a sibling component

```mdx
<ReasoningTrace>
  <ReasoningTrace.Observe>...</ReasoningTrace.Observe>
  <ReasoningTrace.Assume>...</ReasoningTrace.Assume>
  <ReasoningTrace.Model>...</ReasoningTrace.Model>
  ...
</ReasoningTrace>
```

- Pros: Clean semantic split; `<OMIFlow>` stays exactly as
  shipped; new component carries the broader epistemic-anatomy
  use case independently.
- Cons: Two similar components; authors must choose; risk of
  inconsistent usage; documentation tax. Violates Sophie's
  "one typed contract" architectural preference.
- **Why rejected:** No positive reason to ship two
  near-identical components when one role-labeled primitive
  covers both use cases cleanly.

## Consequences

What this decision makes:

- **Easier**:
  - Future epistemic-anatomy patterns (Equation Clinic per
    roadmap Tier A; Assumption Ledger; reasoning checks; etc.)
    ship as `<ReasoningTrace>` configurations rather than new
    components.
  - ADR 0058's eight-role contract becomes a *runtime-usable*
    primitive in the component layer, not just a declarative
    annotation in MDX prose.
  - AI authoring packets (per [ADR 0077](./0077-ai-authoring-packets.md))
    can target reasoning-anatomy generation with a uniform
    schema (role-labeled steps) regardless of pattern.
  - Cross-component audits (curriculum-CI per
    [ADR 0045](./0045-pedagogical-diff-curriculum-ci.md)) can
    ask uniform questions like "does every claim of inference
    in this chapter cite its observable + model?" by walking
    `<ReasoningTrace>` instances regardless of named preset.

- **Harder**:
  - Slightly more implementation work than Option A (generic
    role-aware `<ReasoningTrace.Step>` component + the OMIFlow
    preset wrapper).
  - `<OMIFlow>` becomes a thin wrapper over `<ReasoningTrace>`;
    the refactor has to preserve OMIFlow's existing rendering
    semantics exactly (visual regression baselines must hold).
  - One more concept for authors to learn (`<ReasoningTrace>`
    on top of `<OMIFlow>`), though the OMIFlow path remains
    canonical for the 3-slot OMI pattern.

- **Triggers**:
  - A future Wedge B or C ships `<ReasoningTrace>` + refactors
    `<OMIFlow>` to consume it underneath. Visual regression
    baselines must stay green for existing OMIFlow usage.
  - ADR 0063 (`<OMIFlow>`) gets an `Amends-by: 0078` admonition
    row pointing here.
  - Updates to [pedagogical-foundations.md](../explanation/pedagogical-foundations.md)
    and the [chapter-components reference](../reference/chapter-components.md)
    document the new general-vs-preset pattern.
  - Per Sophie's `feedback_no_backcompat_prelaunch`: the
    OMIFlow rewrite lands in the same PR as `<ReasoningTrace>`
    introduction, not split across PRs.

## References

- [ADR 0063 — `<OMIFlow>` Composite Primitive](./0063-omiflow-composite-primitive.md) (this ADR sits in composition-design conversation with 0063)
- [ADR 0058 — Epistemic Component Contract](./0058-epistemic-component-contract.md) (the 8-role contract that Option C binds `<ReasoningTrace>` to directly)
- [ADR 0031 — Compound component layout primitives](./0031-compound-component-layout-primitives.md) (the slot-component pattern Options A/B/C all use)
- [pedagogical-foundations.md](../explanation/pedagogical-foundations.md) (defines OMI's 3-letter meaning; constrains how far Option A can stretch)
- [course-website-roadmap.md § Future capabilities — Tier B](../status/course-website-roadmap.md) (Reasoning Trace catalogued here)
