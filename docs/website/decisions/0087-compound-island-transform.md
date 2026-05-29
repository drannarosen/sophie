---
date: 2026-05-28T00:00:00.000Z
tags:
  - mdx
  - remark
  - assessment
  - formative
  - islands
  - accessibility
  - component-contract
status: shipped
validation:
  status: in-progress
  last_validated_date: "2026-05-28"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/mdx-plugins/compound-expand.test.ts
      date: "2026-05-28"
      notes: "Pure mdast-in/out unit tests for the transform: MCQ/MultiSelect → fieldset of native inputs with shared `choiceSlug` values + `data-correct`; FillBlank → prompt prose with inline `<input data-fb-slot>` (no leaked `correct`); Tabs → ARIA-tabs markup; controller-import self-injection; idempotency; duplicate-slug throws."
    - kind: test
      ref: packages/components/src/components/MCQ/MCQController.test.tsx
      date: "2026-05-28"
      notes: "Null-render controller restores/persists radio selection over the transform-emitted static DOM via `useInteractive`. Companion tests under MultiSelect/FillBlank/Tabs Controller.test.tsx (R11-excluded null-render islands, carve-out documented in scripts/lint-axe-render.ts)."
    - kind: test
      ref: examples/smoke/e2e/formative-render.spec.ts
      date: "2026-05-28"
      notes: "Build-level Playwright render+axe gate — the regression guard that would have caught the original empty-render bug. Loads the REAL built practice + reading pages; asserts 3 radios / 3 checkboxes / 2 FillBlank inputs / 3 tabs render, a nested island inside a choice body hydrates, Tabs is operable (click + `data-hydrated` signal), and both pages are axe-clean."
    - kind: review
      ref: "compound-island-transform bundle (commits 35b88a5..8bff7df)"
      date: "2026-05-28"
      notes: "AS-1..5 proof: the formative extractor sees the authored `<MCQ><MCQ.Choice>` shape because the transform runs LAST in the remark chain (after pedagogyIndexRemarkPlugin); AS-1..5 fire on the authored surface. Graduates `validation.status` to `validated` on bundle merge."
---

# ADR 0087: Compile-time expansion for interactive compound islands (static structure + controller island)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0004](./0004-component-contract-revisions.md) (the render+serialize+contract pattern adapts for transform-owned structure), [0005](./0005-theming-three-layers.md) (CSS delivery for transform-emitted unmangled markup)
- **Related**: [0019](./0019-radix-ui-primitives.md) (drops two Radix deps for native controls), [0038](./0038-pedagogy-index-pattern.md) (extractor reads the authored shape), [0073 Amendment 1](./0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27) (the formative-with-reveal v1 surface this transform lowers)
:::

## Context

[ADR 0073 Amendment 1](./0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
locked the formative-with-reveal v1 surface: six MDX components plus
two reveal primitives. Three of them are *compound* parents — `<MCQ>`,
`<MultiSelect>`, `<FillBlank>` — initially implemented the obvious way:
a `client:load` React component that introspects its MDX
component-children to find its `<MCQ.Choice>` / `<MultiSelect.Choice>`
/ `<FillBlank.Slot>` members, e.g.
`Children.toArray(children).filter(c => c.type === MCQ.Choice)`.

**This rendered EMPTY in the real Astro build.** The unit tests
passed (React Testing Library renders the children into a single React
tree), but the production build did not. The root cause is structural:
Astro renders a `client:load` island's MDX component-children into
*separate, nested* `<template data-astro-template>` islands, not as
React children of the parent island. The parent's runtime
`Children.toArray(children)` therefore finds **nothing** — neither at
SSR nor after hydration — so the component renders an empty
`<fieldset>` / empty prompt. The bug is invisible to RTL and visible
only in a real multi-island build.

The shipped `<Tabs>` component (chrome, not pedagogy) had the
**identical latent bug**: it introspected its `<Tab>` children at
runtime, so the real build produced an empty `role="tablist"` with no
triggers and no panels. No test caught it because no test exercised
the real island boundary — exactly the gap this ADR's regression
guard closes.

### Rejected alternatives

Each was considered and rejected before settling on compile-time
expansion:

- **Runtime children introspection** — the bug itself. A
  `client:load` island cannot see its MDX component-children; they are
  separate islands.
- **React Context** (parent provides a `ChoicesContext`, children
  consume it). The provider island is not an *ancestor* of the child
  islands in the rendered React tree — Astro splits sibling MDX tags
  into independent SSR passes, so Context cannot span the island
  boundary (the same constraint that defeated the original
  `FormativeContext` design for `<Solution>`/`<Hint>`, per
  [ADR 0073 Amendment 1 §3](./0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)).
- **`cloneElement`** to inject props into children — same problem; the
  children aren't React elements in the parent's tree to clone.
- **Serialize choice/panel bodies to HTML strings** and pass them as a
  prop. Flattens the body to static HTML, so any *nested* island
  inside a choice body (e.g. a `<GlossaryTerm>` in an answer option)
  loses its own hydration — nested islands become dead markup.
- **Astro `experimentalReactChildren`** — passes MDX children through
  as live React children, but mangles KaTeX/HTML style strings and
  other raw-HTML content; not viable for math-bearing choices.
- **`client:only`** — drops SSR entirely (no server-rendered markup,
  flash of empty content, no no-JS fallback). Unacceptable for content
  that must render statically.

## Decision

**The compound parents are lowered at MDX-compile time by a remark
plugin into static native markup plus a childless controller island.**
A remark plugin, `sophieCompoundExpandRemarkPlugin` (at
[`packages/astro/src/lib/mdx-plugins/compound-expand.ts`](../../../packages/astro/src/lib/mdx-plugins/compound-expand.ts)),
walks the mdast and replaces each compound parent with:

1. **Static native markup** the browser renders without any React:
   - `<MCQ>` → `<section data-pedagogy-role="mcq">` → `<fieldset
     role="radiogroup">` of `<label><input type="radio" name>` pairs.
   - `<MultiSelect>` → `<section data-pedagogy-role="multi-select">` →
     `<fieldset>` (no `radiogroup` role — wrong semantics for
     multi-select) of `<label><input type="checkbox" name>` pairs.
   - `<FillBlank>` → `<section data-pedagogy-role="fill-blank">` →
     the prompt prose with each inline `<FillBlank.Slot>` replaced by
     an inline `<input type="text" data-fb-slot data-slot-id>`.
   - `<Tabs>` → `<div data-sophie-tabs>` → `<div role="tablist">` of
     `<button role="tab">` triggers over sibling
     `<div role="tabpanel">` bodies.
2. **Each choice/panel body kept as live MDX** — the transform never
   serializes bodies to HTML strings. Nested islands inside a choice
   or tab panel (a `<GlossaryTerm>`, a `<KeyEquation>`) hydrate
   normally because they remain real mdast subtrees the MDX compiler
   turns into their own islands.
3. **A childless `*Controller` `client:load` island** —
   `<MCQController>` / `<MultiSelectController>` / `<FillBlankController>`
   / `<TabsController>` — that hydrates and operates on the static DOM
   it finds by querying the emitted `name` / `data-*` hooks. The
   formative controllers restore + persist the student's input via
   `useInteractive`; `<TabsController>` wires keyboard + ARIA-tabs
   selection (ephemeral, no persistence).

The transform **self-injects** the controller `import { … } from
"@sophie/components"` line + `client:load` directive, because it runs
*after* the auto-import pass (see chain position below).

### Chain position — runs LAST, after the pedagogy extractor

`sophieCompoundExpandRemarkPlugin` is registered **last** in the
chapter-MDX remark chain, after `pedagogyIndexRemarkPlugin`. This is
load-bearing: the formative extractor ([ADR 0038](./0038-pedagogy-index-pattern.md))
must see the *authored* `<MCQ><MCQ.Choice>` shape to fire AS-1..5 and
to compute index anchors. The transform and the extractor derive
identical choice slugs by construction — both call the shared
`choiceSlug` helper (math-aware, so a math-only choice like `$n = 2
\to n = 1$` slugifies the same way in both places) — so the rendered
`<input value>` and the index anchor agree. Because the transform runs
after the auto-import pass, the auto-importer cannot inject the
controller import; the transform self-injects it (idempotently merging
into any existing `@sophie/components` import).

### Virtual authoring tags + contract adaptation (ADR 0004)

`<MCQ>` / `<MCQ.Prompt>` / `<MCQ.Choice>` (and the `MultiSelect.*`,
`FillBlank.*`, `NumericQuestion.Answer`, and standalone `<Tab>`
equivalents) are **compile-time-only virtual tags** — they never reach
React. The only real React exports from `@sophie/components` are the
null-render `*Controller` islands. Choice/slot/answer children are
member-access (`MCQ.Choice`, `MultiSelect.Choice`, `FillBlank.Slot`,
`NumericQuestion.Answer`); `<Tab>` stays standalone (the transform
matches `child.name === "Tab"`), since Tabs is chrome with no
namespace discipline.

[ADR 0004](./0004-component-contract-revisions.md)'s
render + serialize + contract pattern **adapts** rather than breaks:
the transform owns *structure* (tested mdast-in/out + a build-level
axe gate); the controller owns *behavior* (a null-render side-effect
island, R11-excluded exactly like `interactive/ParameterCursor` — it
asserts store/DOM state, not rendered markup). The two together
satisfy the contract's intent (accessible structure + persisted
behavior) across the compile-time/runtime split the island model
forces.

### Native controls + dropping two Radix dependencies

Native `<input type="radio" name>` / `<input type="checkbox" name>`
give roving focus, arrow-key navigation, single-select enforcement
(shared `name`), and the accessible-name algorithm **for free** — the
exact behaviors `@radix-ui/react-radio-group` and
`@radix-ui/react-checkbox` were carried for. Lowered to native markup,
those two Radix dependencies are removed (cleanup tracked separately).
`<Tabs>` uses a hand-rolled ARIA-tabs controller (WAI-ARIA "automatic
activation" pattern: roving `tabindex`, arrow/Home/End, click) over
the static buttons + panels. This narrows [ADR 0019](./0019-radix-ui-primitives.md)'s
Radix-primitive reach: Radix stays the default for *interactive
disclosure / overlay* primitives, but compound *form-control* groups
that lower to native inputs do not need it.

### CSS delivery (ADR 0005 adaptation)

Transform-emitted static HTML has **no CSS-Module class hashes** — the
structure exists only at MDX-compile time, never as a React component,
so per-component CSS-Module hashing cannot attach. Formative styles
therefore ship as pure `:global(...)` selectors (targeting the
semantic structure + `data-*` hooks) inside `*.module.css` files. The
`*.module.css` extension is deliberate: `scripts/build-css-modules.ts`
globs only `*.module.css` files and concatenates them into the single
`dist/styles.css` bundle that `@sophie/astro`'s `<SophieChapter>`
side-effect-imports once. A raw `.css` file would not be picked up by
that pipeline. This is the documented adaptation of
[ADR 0005](./0005-theming-three-layers.md)'s "CSS Modules in
components" rule for markup that has no component to scope to.

### Standing regression guard

**Every compound-island family ships a build-level Playwright
render+axe assertion.** RTL unit tests *cannot* catch the
island-boundary bug — they render children into one tree, which is
precisely the shape the real build does not produce. The check that
would have caught the original empty-render bug is
[`examples/smoke/e2e/formative-render.spec.ts`](../../../examples/smoke/e2e/formative-render.spec.ts):
it loads the *real* built practice + reading pages and asserts the
native controls render (3 radios / 3 checkboxes / 2 FillBlank inputs /
3 tabs), that a nested island inside a choice body hydrates, that Tabs
is operable, and that both pages are axe-clean. This is a **standing
rule**: any future compound island lowered by this transform must add
a build-level render+axe assertion to the smoke e2e suite. A passing
unit test is necessary but not sufficient.

### Two accessibility decisions

**(a) Math-only choice labels.** axe's `label` rule reports the
KaTeX-rendered math-only radios as nameless — axe does not implement
accessible-name computation over presentation MathML. But the
*browser's* real accessible-name algorithm computes a clean name (e.g.
"n = 2 → n = 1") from the MathML, verified against the accessibility
tree. The spec therefore asserts the **real computed name** via
`getByRole({ name })` (a stronger check than the linter's) and
disables **only** axe's `label` rule on that one call, documented at
the call site. We do **not** override the clean MathML-derived name
with a raw-LaTeX `aria-label` — doing so would degrade the real
screen-reader output to satisfy a linter that simply lacks MathML
support.

**(b) No unconditional correct-answer marker at v1.** The first
implementation stamped the correct choice with `data-correct` and a
CSS `::after "✓"`. That marker **leaked the answer**: it was visible on
the page *and* surfaced in the control's accessible name ("n = 3 → n =
2 ✓") before the student answered. The CSS comment claimed
"reveal-only," but [ADR 0073](./0073-unified-assessment-schema.md) v1
has no cross-island reveal state to gate the marker on, so it cannot be
reveal-gated at v1. The marker is removed for v1; the answer is
disclosed via `<Solution>`. `data-correct` **stays** on the emitted
input as the extractor's source of truth + the v2 hook for
reveal-gated marking. Reveal-gated correct-answer marking is deferred
to v2 along with grading.

## Consequences

### Positive

- **Compound islands render in the real build.** The class of
  empty-render bugs (MCQ, MultiSelect, FillBlank, and the latent Tabs
  instance) is structurally foreclosed: structure is static markup, so
  there is no runtime children-introspection to fail.
- **Nested islands inside choice/panel bodies still hydrate** —
  bodies are kept as live MDX, not serialized.
- **Native controls** give a11y semantics for free and drop two Radix
  dependencies.
- **The extractor sees the authored shape** (transform runs last), so
  AS-1..5 fire on the surface the author actually wrote, and slugs
  agree by construction via the shared `choiceSlug`.
- **The regression guard is the right shape** — a build-level
  render+axe gate that exercises the real island boundary the unit
  tests cannot.

### Negative

- **A second authoring layer.** Authors write virtual tags that never
  exist at runtime; debugging requires understanding that the rendered
  DOM is transform-emitted, not React-rendered. Mitigated by the
  documented authoring surface ([chapter-components.md](../reference/chapter-components.md),
  [formative-assessment-authoring.md](../reference/formative-assessment-authoring.md))
  and the loud compile-time throws on duplicate slugs / slot ids.
- **The transform is load-bearing for every chapter build.** A
  regression in it produces empty or malformed formatives across all
  chapters. Mitigated by the pure-function unit tests + the smoke e2e
  gate.
- **CSS ships unmangled `:global`** — formative selectors are not
  scoped, so they must target distinctive semantic structure +
  `data-*` hooks to avoid collisions. Documented in the
  `formative.module.css` header.

### Neutral

- **`data-correct` ships but does nothing visible at v1.** It is the
  extractor/v2 source of truth, not a v1 feature; its presence is
  intentional dead weight against the v2 reveal-gated-marking work.

## Implementation notes

- Transform: [`packages/astro/src/lib/mdx-plugins/compound-expand.ts`](../../../packages/astro/src/lib/mdx-plugins/compound-expand.ts)
  (registry-driven `COMPOUND_ISLANDS` for choice-based parents; single
  `FILL_BLANK` + `TABS` specs for the slot-based + chrome paths;
  idempotent; self-injects the controller import + `client:load`).
- Shared JSX/ESM helpers: [`packages/astro/src/lib/mdx-plugins/_shared/jsx-attrs.ts`](../../../packages/astro/src/lib/mdx-plugins/_shared/jsx-attrs.ts).
- Shared math-aware slug: `choiceSlug` /  `extractSlugText` in
  [`packages/astro/src/lib/pedagogy-index/jsx-utils.ts`](../../../packages/astro/src/lib/pedagogy-index/jsx-utils.ts)
  (the extractor and the transform import the same function).
- Chain registration: [`packages/astro/src/mdx-config.ts`](../../../packages/astro/src/mdx-config.ts)
  (`sophieCompoundExpandRemarkPlugin` registered after
  `pedagogyIndexRemarkPlugin`).
- Controllers: `packages/components/src/components/{MCQ,MultiSelect,FillBlank,Tabs}/*Controller.tsx`
  (null-render; R11-excluded with documented carve-outs in
  [`scripts/lint-axe-render.ts`](../../../scripts/lint-axe-render.ts)).
- CSS: `packages/components/src/components/_formative/formative.module.css`
  (pure `:global` selectors; concatenated by
  [`scripts/build-css-modules.ts`](../../../scripts/build-css-modules.ts)).
- Regression guard: [`examples/smoke/e2e/formative-render.spec.ts`](../../../examples/smoke/e2e/formative-render.spec.ts).

## Amendments

### Amendment 1 — math-only choice `label` disable CLOSED (2026-05-28)

§"Two accessibility decisions" **(a)** disabled axe's `label` rule on the
practice spec's one call site because axe does not compute an accessible
name over presentation MathML, so it reported math-only choice radios as
nameless (a tooling blind-spot, not a real a11y bug). That disable is now
**CLOSED**: [ADR 0089](./0089-latex-speech-accessibility.md) bakes an
explicit SRE ClearSpeak `aria-label` onto each math-only choice `<input>`
at build time (rehype `rehypeChoiceSpeech`, reading the speech
`rehypeKatexSpeech` already computed for the choice's `.katex` subtree).
The `label` rule now runs **strict platform-wide** — the
`.disableRules(["label"])` call is removed from
[`examples/smoke/e2e/formative-render.spec.ts`](../../../examples/smoke/e2e/formative-render.spec.ts),
which stays axe-clean with the rule on. The label is sourced from SRE
speech, not raw LaTeX, so it *improves* the real screen-reader output
rather than degrading it to satisfy the linter (resolving the concern
(a) explicitly flagged). `data-choice-input` — the marker
`rehypeChoiceSpeech` selects on — is the same hook the controllers use.

## References

- [ADR 0073 Amendment 1](./0073-unified-assessment-schema.md#amendment-1-formative-with-reveal-v1-2026-05-27)
  — the formative-with-reveal v1 surface this transform lowers.
- [ADR 0004](./0004-component-contract-revisions.md) — the component
  contract whose render/serialize split adapts here.
- [ADR 0005](./0005-theming-three-layers.md) — theming layers; the CSS
  delivery adaptation for unmangled markup.
- [ADR 0019](./0019-radix-ui-primitives.md) — Radix primitives; this
  ADR narrows the reach for native-lowerable form-control groups.
- [ADR 0038](./0038-pedagogy-index-pattern.md) — pedagogy-index
  pattern; the extractor that reads the authored shape (artifact-scoped
  per Amendment 3).
