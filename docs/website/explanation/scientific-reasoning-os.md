---
title: Scientific Reasoning OS — author-facing reference
short_title: Reasoning OS reference
description: When to declare an epistemic role on a Sophie component, how implicit role works today, and the canonical lookup table for every Sophie pedagogy component.
tags: [explanation, reasoning-os, epistemic, authoring, reference]
---

# Scientific Reasoning OS — author-facing reference

This page is the *how to use* counterpart to the
[Reasoning-OS thesis](../vision/reasoning-os/index.md) and the
[ADR 0058 contract](../decisions/0058-epistemic-component-contract.md).
It is written for authors (human or AI) deciding whether and how to
declare an `epistemicRole` on a Sophie component.

If the [epistemic grammar](../vision/reasoning-os/epistemic-grammar.md)
is the *vocabulary*, this page is the *grammar's usage guide*.

## When to declare an epistemic role

The decision tree:

1. **Is the component encoding pedagogy content?** A component that
   participates in scientific reasoning — an equation, a misconception,
   a prediction, a derivation, a figure caption, an uncertainty
   overlay — is *pedagogy content*. A component that participates in
   *page chrome* — a chapter-reference link, a glossary tooltip, a
   search bar, a navigation breadcrumb — is *chrome*. Pedagogy content
   is in scope for `epistemicRole`; chrome is not.
2. **Does the component already encode a role implicitly?** If yes,
   prefer the existing implicit-role pattern over adding a redundant
   explicit field. The [lookup table below](#lookup-table)
   documents every implicit pattern Sophie recognizes today.
3. **Is the role one of the eight canonical roles?** The eight roles
   are closed at v1 per
   [ADR 0058](../decisions/0058-epistemic-component-contract.md). If
   the content doesn't fit any of the eight, it is more likely chrome
   than a missing ninth role. (If you genuinely believe a ninth role
   is needed, propose an ADR amending 0058 rather than coining a new
   role inline.)
4. **Are you authoring a *composite* component with multiple
   role-bearing slots?** Then declaring role per slot is mandatory
   (per ADR 0058 §4). The first composites — A8 `<OMIFlow>`, A9
   `<AssumptionStack>`, A10 `<UncertaintyLens>` — will ship with
   per-slot role declarations as part of their authoring ADRs.

If you've followed the tree to *"yes, declare a role explicitly"*,
the syntax is one optional Zod field on the component's prop
schema:

```ts
const SomeComponentPropsSchema = z.object({
  // ...other props
  epistemicRole: EpistemicRole.optional(),
});
```

and the authoring shape in MDX:

```mdx
<SomeComponent epistemicRole="inference">
  ...content...
</SomeComponent>
```

If the answer at any step is *"no, don't declare a role"*, leave
the component as-is. The contract is additive, not required.

(lookup-table)=
## Implicit-role lookup table

The canonical mapping from existing Sophie components to epistemic
roles. The pedagogy-index extractor
([ADR 0038](../decisions/0038-pedagogy-index-pattern.md)) normalizes
implicit signals to the same shape as the explicit field, so
consumers see a uniform read.

| Component / surface                          | Implicit role     | Signal                                           |
| -------------------------------------------- | ----------------- | ------------------------------------------------ |
| `<Callout variant="misconception">`          | `misconception`   | `variant="misconception"`                        |
| `<Callout variant="key-insight">`            | (none)            | chrome / pedagogy-emphasis, not an epistemic role |
| `<Callout variant="warning">`                | (none)            | chrome                                           |
| `<Callout variant="tip">`                    | (none)            | chrome                                           |
| `<Callout variant="caution">`                | (none)            | chrome                                           |
| `<Callout variant="roadmap">`                | (none)            | chrome                                           |
| `<Callout variant="summary">`                | (none)            | chrome                                           |
| `<Callout variant="info">`                   | (none)            | chrome                                           |
| `<KeyEquation>` math body                    | `model`           | the `$$...$$` block is the equation-as-model     |
| `<KeyEquation>` child `<Observable>`         | `observable`      | child component type                             |
| `<KeyEquation>` child `<Assumption>`         | `assumption`      | child component type                             |
| `<KeyEquation>` child `<Units>`              | (none)            | metadata on `model`, not its own role            |
| `<KeyEquation>` child `<BreaksWhen>`         | `approximation`   | validity-domain marker = approximation marker    |
| `<KeyEquation>` child `<CommonMisuse>`       | `misconception`   | cross-ref into the misconception graph           |
| `<Predict>`                                  | (slot-dependent)  | the predicted *quantity* is `observable` or `inference`; the prediction itself is a teaching move, not a role |
| `<ConfidenceCheck>`                          | (none)            | metacognition teaching move; not an epistemic role |
| `<Reflection>`                               | (none)            | metacognition teaching move                      |
| `<ComprehensionGate>`                        | (none)            | retrieval-practice teaching move                 |
| `<LearningObjectives>`                       | (none)            | pedagogy chrome — declares goals, not roles      |
| `<Objective>`                                | (none)            | pedagogy chrome                                  |
| `<Figure>`                                   | (caption-dependent) | a Figure rendering a model prediction is `model`; a Figure showing data is `observable`; declare via `epistemicRole=` when ambiguous |
| `<Aside>` (general)                          | (none)            | depends on `kind=`; chrome by default            |
| `<CollapsibleCard>`                          | (none)            | progressive-disclosure chrome                    |
| `<InteractiveCheckbox>`                      | (none)            | teaching-move chrome                             |
| `<EffortLog>`                                | (none)            | metacognition / metric chrome                    |
| `<GlossaryTerm>`                             | (none)            | reference chrome                                 |
| `<ChapterRef>` / `<EquationRef>` / `<FigureRef>` | (none)            | reference chrome                                 |
| `<Search>`                                   | (none)            | site chrome                                      |
| Chapter `framing: 'OMI'`                     | section-level     | the section has slots `observable` → `model` → `inference` even if not yet rendered via `<OMIFlow>` |
| Chapter `framing: 'PMI'`                     | section-level     | the section's `problem`/`model`/`implementation`/`interpretation` arc; PMI roles are not directly the epistemic eight |
| Misconception graph node (ADR 0044)          | `misconception`   | graph-node type                                  |
| Future A8 `<OMIFlow>` slots                  | per-slot          | three slots: `observable` / `model` / `inference` (declared in A8's ADR) |
| Future A9 `<AssumptionStack>` entries        | `assumption`      | (with optional `approximation` variant per entry — A9's ADR resolves) |
| Future A10 `<UncertaintyLens>` overlay       | `uncertainty`     | A10's ADR declares                               |

When a row says *"(none)"*, the component is **chrome or
teaching-move**, not epistemic content. The pedagogy-index
extractor does not record an `epistemicRole` for chrome rows; AI
authoring should not target chrome rows with role-aware prompts.

When a row says *"(slot-dependent)"* or *"(caption-dependent)"*,
the role lives on the *content inside* the component, not the
component itself. If the wrapping is genuinely ambiguous (a
`<Figure>` could be showing either data or a model rendering),
declare `epistemicRole=` on the component to disambiguate.

## Anti-patterns

Six common authoring mistakes the contract is designed to flag:

### 1. Declaring `epistemicRole` on chrome

```mdx
<!-- WRONG -->
<ChapterRef chapter="2" epistemicRole="observable">
  See Chapter 2's transit example.
</ChapterRef>
```

`<ChapterRef>` is reference chrome. The *content* it points at may
have a role; the reference itself does not. Cross-references are
not epistemic content. The schema should reject `epistemicRole` on
chrome components (future code PR enforcement).

### 2. Using `model` when you mean *equation*

```mdx
<!-- WRONG -->
<KeyEquation refId="wiens-law" epistemicRole="model">
  $$\lambda_{peak} = b T^{-1}$$
</KeyEquation>
```

Two issues: (a) the role is redundant — the implicit-role table
already maps `<KeyEquation>` math body to `model`. (b) even if it
weren't redundant, the *equation* is an *expression of* the model
(in this case, the model "blackbody emission from a thermalized
source"). Conflating equation and model conflates representation
with referent. Skip the explicit field; let the implicit signal
carry it.

### 3. Conflating `assumption` and `approximation`

```mdx
<!-- WRONG -->
<KeyEquation refId="small-angle">
  $$\sin\theta \approx \theta$$

  <Assumption>Small angle: θ ≪ 1 radian.</Assumption>
</KeyEquation>
```

The "small-angle" relation is an **approximation**, not an
**assumption** — it has a validity domain (good to ~1% for
θ < 0.25 rad). The right shape uses `<BreaksWhen>` (which the
implicit-role table maps to `approximation`):

```mdx
<!-- RIGHT -->
<KeyEquation refId="small-angle">
  $$\sin\theta \approx \theta$$

  <BreaksWhen>
    θ ≳ 0.25 rad — the next-order correction (−θ³/6) becomes
    non-negligible.
  </BreaksWhen>
</KeyEquation>
```

Use `<Assumption>` for *binary* preconditions on validity
("thermal equilibrium holds," "spherical symmetry assumed").
Use `<BreaksWhen>` for *graded* simplifications with a named
validity domain.

### 4. Treating `<Predict>` as if it were an epistemic role

```mdx
<!-- WRONG -->
<Predict epistemicRole="prediction" prompt="..." />
```

There is no `prediction` role. Prediction is a **teaching move**
(per [ADR 0041](../decisions/0041-teaching-move-library.md)), not
an epistemic role. The predicted *quantity* (a transit depth, a
light-curve duration) has a role (`observable`, in this case), but
the act of predicting is a pedagogical action, not a role on the
prediction.

If you want to declare what the student is predicting *about*,
that's a future enhancement on `<Predict>` to declare the role of
its prediction slot. It's not the same as the component itself
carrying a role.

### 5. Adding `epistemicRole="data"` or `epistemicRole="derivation"`

Neither `data` nor `derivation` is in the eight-role taxonomy.

- "Data" is what `observable` names. Use `observable`.
- A "derivation" is a *rendering* of a model — a sequence of steps
  showing how the equation is built. The derivation's *content* is
  role-`model` throughout (each step expresses the model at a
  different level of expansion); the derivation as a whole is
  pedagogy chrome (progressive disclosure of `model`).

If the closed eight feels constraining for your use case, that's a
signal worth surfacing. Open an issue or propose an ADR amending
0058 rather than coining a fresh role in source.

### 6. Declaring roles in prose rather than in components

```mdx
<!-- WRONG (or at least: doesn't earn role-aware tooling) -->
The observable here is the transit depth. The model is a
limb-darkened Mandel-Agol transit. The inference is a posterior
on planet radius.
```

This is fine prose. But the role declarations are in *words*, not
*schema*. The pedagogy-index extractor cannot read them; AI
authoring cannot reason about them; future audit invariants cannot
gate on them. The reasoning-OS contract pays off precisely when
roles are in *components*, not in *prose*. Promote the three
sentences to three role-bearing components (an `<OMIFlow>` slot
each, post-A8) when the page is structured enough to support it.

## How implicit role becomes explicit at extraction time

The pedagogy-index extractor walks the MDX AST and emits a
normalized `PedagogyIndex[*].epistemicRole` field for every
pedagogy-content node, populated from either:

- the explicit `epistemicRole=` prop (if declared), OR
- the implicit-role lookup table entry for the component shape,
- with the explicit prop winning if both are present and they
  disagree (the disagreement itself is a soft warning the audit
  surfaces — future audit invariant).

A consumer of the pedagogy index reads `.epistemicRole` uniformly
regardless of which authoring path was used. This is the
SoTA-pattern justification for keeping implicit role around: it
reduces authoring friction for ~90% of cases without forcing a
retrofit pass over already-shipped components.

## See also

- [vision/reasoning-os/](../vision/reasoning-os/index.md) —
  the thesis section this page implements.
- [vision/reasoning-os/epistemic-grammar.md](../vision/reasoning-os/epistemic-grammar.md)
  — the eight roles in author-facing prose.
- [ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md)
  — the contract this page documents the authoring face of.
- [ADR 0038 — Pedagogy-index pattern](../decisions/0038-pedagogy-index-pattern.md)
  — the extractor that normalizes implicit-role signals.
- [reference/chapter-components.md](../reference/chapter-components.md)
  — full component-by-component authoring reference (independent
  of role declarations).
