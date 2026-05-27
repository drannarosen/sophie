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
as each PR lands. PR 4 has shipped `<PracticeProblem>` + `<Solution>` +
`<Hint>` (this page documents them below); the four formative-family
parents (`<QuickCheck>` / `<MCQ>` / `<MultiSelect>` / `<FillBlank>` /
`<NumericQuestion>`) ship in PRs 5–9.
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

## How `<Solution>` and `<Hint>` find their parent

Only the six formative-family parents declare `course` / `unit` / `id`
per [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md).
`<Solution>` and `<Hint>` inherit the parent's namespace at MDX-compile
time via the `sophieAutoImportsRemarkPlugin` (at
`packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`) — the
plugin walks each formative parent's subtree and writes the parent's
`course` / `unit` / `id` onto every descendant `<Solution>` / `<Hint>`
as explicit `course` / `unit` / `parentId` props. The plugin runs
**before** `remark-math`, so `$…$` content inside formative-family
children is unaffected.

**The author surface is minimal.** You write:

- No `import { … } from "@sophie/components"` line — the plugin
  injects it for every interactive component you use.
- No `client:load` directive — the plugin marks every interactive
  callsite for hydration.
- No `course` / `unit` / `parentId` on `<Solution>` or `<Hint>` —
  the plugin threads them from the wrapping formative parent.

```mdx
<PracticeProblem course="astr201" unit="m1-l2" id="kepler-3">
  <Hint number={1}>Apply Kepler's third law.</Hint>
  <Solution>$T = 1$ year.</Solution>
</PracticeProblem>
```

**Compile errors are loud and curated.** When the wrapping
formative parent omits `course` / `unit` / `id`, or declares any
of them as a JSX expression (`course={courseSlug}` rather than
`course="astr201"`), the plugin halts the MDX compile with a
curated `file:line` message identifying the gap. Bare `<Solution>`
or `<Hint>` outside any formative parent is also legal — the plugin
simply skips threading and the component renders without
`parentId`-namespaced persistence. (This is mainly useful for
storybook fixtures; chapter authors should always nest reveals
inside a formative parent.)

This compile-time threading is a deliberate architectural choice:
the original React-Context-based design (a `FormativeContext`
provider mounted by the parent shell) didn't survive Astro's MDX
island model — each top-level MDX JSX tag SSRs as its own React
tree, so Context cannot span sibling islands. Threading at
MDX-compile time produces the same authored ergonomics with a
different implementation layer. See
[ADR 0073 Amendment 1](../decisions/0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
§3 for the design rationale.

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

Bare-practice shell + namespace owner. Its `(course, unit, id)`
triple is read by the `sophieAutoImportsRemarkPlugin` at MDX-compile
time and threaded to nested `<Solution>` / `<Hint>` descendants; the
shell itself owns no IndexedDB key.

**Props.**

| Prop | Type | Notes |
|---|---|---|
| `course` | `string` (required) | IDB course key per ADR 0027. Static string literal — `course="astr201"`, not `course={courseSlug}`. |
| `unit` | `string` (required) | IDB unit key per ADR 0027. Static string literal. |
| `id` | `string` (required) | Namespace for descendants' persistence keys. Static string literal. |
| `children` | `ReactNode` (required) | Optional `<PracticeProblem.Prompt>` slot plus any number of `<Hint>` + a `<Solution>`. |

**Authoring requirement.** Declare `course` / `unit` / `id` on every
callsite as static string literals. The
`sophieAutoImportsRemarkPlugin` halts the MDX compile with a
curated `file:line` error when any are missing or declared as JSX
expressions. **Do NOT write** `import { PracticeProblem, … } from
"@sophie/components"` — the plugin injects it. **Do NOT write**
`client:load` on the shell — the plugin marks it.

**Persistence.** The shell owns no IDB key. Descendants' keys are
namespaced by the shell's `id` — `<Solution>` writes to
`solution:${id}:open` and each `<Hint number={N}>` writes to
`hint:${id}:${N}:open`.

**Landmark.** Renders as `<section aria-labelledby={`${id}-label`}>`
with a visible `<h3>` "Practice problem" label (R10 named-region
pattern).

**Print mode.** The shell carries `data-pedagogy-role="practice-problem"`;
descendants' `sophie-reveal` class auto-expands their disclosures
in handouts.

**Slots.** `<PracticeProblem.Prompt>` is a structurally-optional
compound slot — bare `<PracticeProblem>` with `<Hint>` + `<Solution>`
as direct children is supported (use when the prompt is supplied by
surrounding chapter prose).

```mdx
<PracticeProblem
  course="astr201"
  unit="m1-l2"
  id="kepler-3"
>
  <PracticeProblem.Prompt>
    Compute $T$ for $a = 1$ AU around a $1\,M_\odot$ star.
  </PracticeProblem.Prompt>
  <Hint number={1}>Apply Kepler's third law in solar units.</Hint>
  <Hint number={2}>Take the cube root.</Hint>
  <Solution>$T = a^{3/2} = 1$ year.</Solution>
</PracticeProblem>
```

See [ADR 0073 Amendment 1](../decisions/0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
§"The six v1 MDX components + two shared reveals".

### `<Solution>`

Single canonical full-reveal disclosure inside any formative-parent
scope. Pairs with `<Hint>` (the graduated-help sibling).

**Props.**

| Prop | Type | Notes |
|---|---|---|
| `label` | `string?` | Trigger-label override. Default flips between `"Show solution"` (closed) and `"Hide solution"` (open). Custom label stays fixed across both states. |
| `children` | `ReactNode` (required) | Solution body — full markdown / MDX supported. |
| `course` / `unit` / `parentId` | `string` (injected) | **Do not author.** The remark plugin writes these from the nearest formative-parent ancestor. |

**Authoring requirement.** Nest inside one of the six
formative-family parents (`<MCQ>` / `<MultiSelect>` / `<FillBlank>` /
`<NumericQuestion>` / `<QuickCheck>` / `<PracticeProblem>`). At v1
only `<PracticeProblem>` is shipped; PRs 5–9 add the other five.
Do NOT write `course`, `unit`, or `parentId` props — the
`sophieAutoImportsRemarkPlugin` threads them from the wrapping
parent at MDX-compile time. Bare `<Solution>` outside any
formative parent is legal (useful for storybook fixtures) but the
rendered component will have no `parentId`-namespaced persistence;
the chapter-author convention is always-nest.

**Persistence.** Open/closed state persists via `useInteractive`
([ADRs 0004](../decisions/0004-component-contract.md) +
[0007](../decisions/0007-indexeddb-persistence.md)) under the key
`solution:${parentId}:open` (a `string[]` — multi-shape carried
through from Radix Accordion even though `<Solution>` only ever has
one slug). `parentId` is the wrapping formative parent's `id`.

**Print mode.** Auto-expands in handouts via the global
`sophie-reveal` class (`textbook-layout.css` force-expands any
element under `.sophie-reveal [data-state]`).

```mdx
<Solution>
  H$\alpha$ is the $n=3 \to n=2$ transition; $\lambda = 656.3$ nm.
</Solution>
```

See [ADR 0073 Amendment 1](../decisions/0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
§"The six v1 MDX components + two shared reveals".

### `<Hint>`

Graduated-help sibling of `<Solution>`. Multiple `<Hint>` instances
at different `number` values render independently — each persists
its own open/closed state under a per-`number` key.

**Props.**

| Prop | Type | Notes |
|---|---|---|
| `number` | positive integer (required) | 1-indexed sequence number. Part of the persistence-key identity, so two `<Hint>` siblings with `number={1}` and `number={2}` get independent IDB entries. |
| `label` | `string?` | Trigger-label override. Default is `"Hint ${number}"`. |
| `children` | `ReactNode` (required) | Hint body. |
| `course` / `unit` / `parentId` | `string` (injected) | **Do not author.** The remark plugin writes these from the nearest formative-parent ancestor (same threading as `<Solution>`). |

**Authoring requirement.** Nest inside one of the six
formative-family parents (same constraint as `<Solution>`). Do NOT
write `course`, `unit`, or `parentId` — the
`sophieAutoImportsRemarkPlugin` threads them from the wrapping
parent.

**Persistence.** Open/closed state persists via `useInteractive`
under the key `hint:${parentId}:${number}:open` (a `string[]`).
`parentId` is the wrapping formative parent's `id`.

**Print mode.** Auto-expands in handouts via the global
`sophie-reveal` class.

```mdx
<Hint number={1}>Start from Kepler's third law.</Hint>
<Hint number={2}>Take the cube root of $a^3$.</Hint>
```

See [ADR 0073 Amendment 1](../decisions/0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
§"The six v1 MDX components + two shared reveals".

## Stable anchors — v2 readiness

Every formative-family parent accepts an optional `id` prop overriding
the `form-${counter}` auto-anchor. Authors who care about cross-unit
reference stability should supply `id` — see
[ADR 0073 Amendment 1](../decisions/0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
§9.a (v2-foreshadowing — three locked design seams). The auto-counter
is fine for v1 — no Assignments yet — but the explicit `id` shape is
the on-ramp.

## Common authoring traps

- **Declaring shell attrs as JSX expressions.** Write
  `course="astr201"`, not `course={courseSlug}`. The
  `sophieAutoImportsRemarkPlugin` reads attrs at MDX-compile time
  and cannot evaluate expressions — it halts the build with a
  curated `file:line` error pointing at the offending callsite.
- **Hand-writing imports or `client:load`.** Don't write
  `import { … } from "@sophie/components"` and don't write
  `client:load` on `<PracticeProblem>` / `<Solution>` / `<Hint>` —
  the remark plugin injects both. Author-written imports merge
  cleanly when present (idempotent), so leftover imports won't
  break the build, but the conventional author surface is
  zero-import.
- **Threading `course` / `unit` / `parentId` onto `<Solution>` or
  `<Hint>` by hand.** Don't. The plugin reads the wrapping
  formative parent's `(course, unit, id)` and writes the
  descendants' props for you. Explicit author-written values do
  win (the plugin never clobbers), but the convention is to omit.
- **Nesting `<Solution>` outside any formative parent.** Legal in
  storybook fixtures (renders the reveal without
  `parentId`-namespaced persistence) but a chapter-author bug
  every time — the AS-2 audit invariant flags formative items
  without a solution; the reverse — a solution without a
  formative item — has no audit signal yet (PR 11 lint job is
  expected to add one).
- *(Coming with PRs 5–9.)* Choice slug collisions in `<MCQ>` /
  `<MultiSelect>`.

## See also

- [ADR 0073](../decisions/0073-unified-assessment-schema.md) — the
  unified Assessment schema (broader vision; Amendment 1 scopes v1).
- [chapter-components.md](./chapter-components.md) — full Sophie
  component reference.
- [ADR 0058](../decisions/0058-epistemic-component-contract.md) —
  epistemic component contract.
