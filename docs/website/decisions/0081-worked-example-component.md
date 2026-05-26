---
date: 2026-05-26T00:00:00.000Z
tags:
  - component
  - pedagogy
  - worked-example
  - epistemic-contract
  - course-website
status: shipped
validation:
  status: in-progress
  last_validated_date: "2026-05-26"
  evidence:
    - kind: test
      ref: packages/components/src/components/WorkedExample/WorkedExample.test.tsx
      date: "2026-05-26"
      notes: "15 tests: schema (title required, positive-int number, optional Step label), epistemic-role const, render (region landmark named by title, kicker numbering, 4 slot labels, data-epistemic-role/data-dim-check/data-step-label hooks, aria-labelledby id isolation), + axe-core clean."
    - kind: manual
      ref: astr201/pilots/lecture-02-tools-of-the-trade.md
      date: "2026-05-26"
      notes: "Gap driver — the astr201 M1-L2 pilot (4 worked examples) was halted on this component per ADR 0064 §3; this ADR is the path-1 resolution. Conversion resumes after merge + sync."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/extractors/worked-examples.ts
      date: "2026-05-26"
      notes: "WS B+D — pedagogy-index extractor + WE-1 (units-at-every-step / QB6) + WE-2 (Problem + Result completeness) + WE-3 (unknown JSX child, R7 disposition) invariants now ship. Extractor populates PedagogyIndex.workedExamples with per-callsite slot-coverage summaries; checkWorkedExamples in invariants/worked-examples.ts consumes them. Closes the M3-L2 Hydrostatic Equilibrium pilot's Surprise #5 deferral (issue #188)."
---

# ADR 0081: WorkedExample epistemic component

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0058](./0058-epistemic-component-contract.md) (adds the `numerical`-role binding for a new component)
- **Related**: [0004](./0004-component-contract-revisions.md), [0046](./0046-equation-biography.md), [0064](./0064-chapter-migration-playbook.md), [0080](./0080-course-spec-format-v0-1.md)
:::

## Context

Two chapter-migration pilots surfaced the same gap. The M2-L3 "Spectra &
Composition" pilot approximated five worked examples as
`<Callout variant="deep-dive">`; [ADR 0064](./0064-chapter-migration-playbook.md)
§3 records that as a doctrine violation — *"loses the structural-role
signal a dedicated `<WorkedExample>` component would have carried"* — and
rules that *"the gap blocks the next migration that surfaces it."*

The next migration surfaced it. The ASTR 201 Module 1 Lecture 2 pilot
("Tools of the Trade") contains **four** worked examples (Earths-in-Sun,
two unit conversions, black-hole-anchor verification) and was halted at
ADR 0064 Step 2 pending this component (pilot report:
`astr201/pilots/lecture-02-tools-of-the-trade.md`).

A worked example carries a distinct epistemic role — applied,
step-by-step quantitative reasoning, including the dimensional check the
course's `QB6` quality bar ("units shown at every step") and principle
P1 require. A styled prose box does not encode that structure; an audit
cannot ask "does every worked example verify its units" of a `Callout`.

## Decision

**Ship `<WorkedExample>` as a content-only compound primitive in
`@sophie/components`, with typed slots and a fixed `numerical` epistemic
role.**

### Compound contract

```mdx
<WorkedExample title="How Many Earths Fit in the Sun?" number={1}>
  <WorkedExample.Problem>…</WorkedExample.Problem>
  <WorkedExample.Step label="Volume scales as R³">…</WorkedExample.Step>
  <WorkedExample.DimCheck>…</WorkedExample.DimCheck>
  <WorkedExample.Result>…</WorkedExample.Result>
</WorkedExample>
```

- **Root** `<WorkedExample title number?>` — renders a `<section
  aria-labelledby>` named region (R10), `data-epistemic-role="numerical"`.
- **Slots by component identity** (the [OMIFlow](./0063-omiflow-composite-primitive.md)
  precedent), not an author `role` prop: `Problem` (the givens), `Step`
  (repeatable, optional `label`; reuses the `<DerivationStep>` idiom),
  `DimCheck` (the dimensional verification), `Result` (answer +
  interpretation).
- **`DimCheck` carries `data-dim-check`** — the concrete hook a future
  audit invariant uses to enforce QB6/P1 ("every `WorkedExample` has a
  `DimCheck`") structurally rather than by reviewer vigilance.

### Epistemic role

The root binds `numerical` per [ADR 0058](./0058-epistemic-component-contract.md)
§2 (`as const satisfies EpistemicRole`). Finer per-slot roles (e.g.
`Result` → `inference`) are **deferred** until an audit needs them
(W2/YAGNI).

### Doctrine reaffirmed

Worked examples **must** use `<WorkedExample>`. The
`<Callout variant="deep-dive">` approximation and inline workarounds
remain disallowed ([ADR 0064](./0064-chapter-migration-playbook.md) §3).

### Deferred

The pedagogy-index extractor + slot-coverage audit invariant (ADR 0038)
are a fast-follow, added when the migration audit needs them. v1 ships
the component, contract, and role binding only.

## Rationale

- **Structural-role signal** is the whole point of §3; a prose-body box
  would just be a renamed `Callout`. Typed slots make the structure
  machine-legible.
- **`DimCheck` as a first-class slot** turns a presentational choice into
  an auditable one — the SoTA payoff §3 reached for.
- **Reuse over invention**: `Step` mirrors `<DerivationStep>`; the
  compound shape mirrors `<OMIFlow>`; styling composes the existing
  `@sophie/theme` token vocabulary (no new generator entry).

## Alternatives considered

- **Single prose body.** Rejected: reproduces the §3 failure mode (no
  structural signal).
- **Slim `Step` + `Result` only** (dimensional check as a conventional
  Step label). Rejected: loses the `QB6` audit hook that motivated the
  component.
- **Per-slot epistemic roles now.** Deferred: no audit consumes them yet
  (YAGNI).
- **Theme variant tint** (`--sophie-tier3-worked-example-label-bg`).
  Rejected for v1: avoids a `@sophie/theme` generator change; the
  existing neutral tokens suffice.

## Consequences

**Easier:**

- The astr201 Module 1 migration unblocks: L2's four worked examples (and
  L1/L3/L4's) map to `<WorkedExample>`; the M2-L3 chapter's five
  deep-dive approximations can be upgraded.
- A future audit can enforce QB6 via `data-dim-check` mechanically.

**Harder:**

- Authors learn a four-slot compound rather than a freeform box — the
  intended cost (structure is the point).

**Triggers:**

- astr201 M1-L2 conversion resumes post-merge (`pnpm sync:sophie`).
- Pedagogy-index extractor + "every WorkedExample has a DimCheck"
  invariant land when the migration audit demands them.

## References

- [ADR 0064](./0064-chapter-migration-playbook.md) §3 — the gap-handling
  doctrine this resolves (path 1).
- [ADR 0058](./0058-epistemic-component-contract.md) — eight-role
  contract; this adds the `numerical` binding.
- [ADR 0004](./0004-component-contract-revisions.md) — `ComponentContract`
  + axe-core requirement.
- [ADR 0063](./0063-omiflow-composite-primitive.md) — compound-primitive
  slot-by-identity precedent.
- astr201 pilot report `pilots/lecture-02-tools-of-the-trade.md` — the
  gap driver + the four worked examples to convert.
