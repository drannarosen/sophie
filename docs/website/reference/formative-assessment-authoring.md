---
title: Formative-assessment authoring
short_title: Formative authoring
description: >-
  Author-facing how-to for the formative-assessment family — six MDX components
  (MCQ, MultiSelect, FillBlank, NumericQuestion, QuickCheck, PracticeProblem)
  plus two shared reveals (Solution, Hint). v1 renders + reveals; grading
  deferred but seamed via the typed FormativeAnswer index entry.
tags:
  - authoring
  - assessment
  - mdx
  - reference
validation:
  status: in-progress
  last_validated_date: "2026-05-27"
  evidence: []
status: shipped
---

# Formative-assessment authoring

This page is the author-facing companion to
[ADR 0073 Amendment 1](../decisions/0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27).
The amendment locks the design; this page shows how to use it.

:::{note}
**Pre-launch.** PRs 3–9 of the formative-assessment implementation plan
ship the six components incrementally. This authoring how-to fills in
as each PR lands. Until then, sections below are scaffolds — read them
for the intended shape, but the components are not yet authorable.
:::

## When to use which component

| Component | Use case | Audit invariant |
|---|---|---|
| `<MCQ>` | Single-best-answer multiple choice (radio semantics) | AS-1 ERROR: exactly one `correct` choice |
| `<MultiSelect>` | Select-all-that-apply (checkbox semantics) | AS-5 ERROR: ≥1 `correct` choice |
| `<FillBlank>` | Text-fill with inline slots | AS-3 WARN: ≥1 `<FillBlank.Slot>` |
| `<NumericQuestion>` | Numeric answer + tolerance + unit | AS-4 ERROR: exactly one `<NumericQuestion.Answer>` |
| `<QuickCheck>` | Free-response, solution-only | (no specific invariant; AS-2 WARN if no `<Solution>`) |
| `<PracticeProblem>` | Bare practice shell (context owner for `<Solution>`/`<Hint>` when no MCQ/etc. wraps) | (no specific invariant; AS-2 WARN if no `<Solution>`) |

All six accept `<Solution>` (full reveal) and `<Hint number={N}>`
(progressive reveal) as children — these are the shared reveal
primitives.

## The parent-context discipline

Only the six formative-family parents declare `course` / `unit` / `id`
per [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md).
`<Solution>` and `<Hint>` read their context from a React provider the
parent sets up; bare `<Solution>` outside any formative parent throws
a curated render error.

(More content coming in PR 4 when `<Solution>` / `<Hint>` /
`<PracticeProblem>` ship.)

## Component reference

### `<MCQ>`

*(Coming in PR 6.)*

### `<MultiSelect>`

*(Coming in PR 7.)*

### `<FillBlank>`

*(Coming in PR 8.)*

### `<NumericQuestion>`

*(Coming in PR 9.)*

### `<QuickCheck>`

*(Coming in PR 5.)*

### `<PracticeProblem>`

*(Coming in PR 4.)*

### `<Solution>`

*(Coming in PR 4.)*

### `<Hint>`

*(Coming in PR 4.)*

## Stable anchors — v2 readiness

Every formative-family parent accepts an optional `id` prop overriding
the `form-${counter}` auto-anchor. Authors who care about cross-unit
reference stability should supply `id` — see
[ADR 0073 Amendment 1](../decisions/0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
§9.a (v2-foreshadowing — three locked design seams). The auto-counter
is fine for v1 — no Assignments yet — but the explicit `id` shape is
the on-ramp.

## Common authoring traps

*(Coming as PRs 4–9 land. Expected traps based on prior pilots:
forgetting `client:load` on the formative-family parent; nesting
`<Solution>` outside any formative parent; choice slug collisions in
`<MCQ>` / `<MultiSelect>`.)*

## See also

- [ADR 0073](../decisions/0073-unified-assessment-schema.md) — the
  unified Assessment schema (broader vision; Amendment 1 scopes v1).
- [chapter-components.md](./chapter-components.md) — full Sophie
  component reference.
- [ADR 0058](../decisions/0058-epistemic-component-contract.md) —
  epistemic component contract.
