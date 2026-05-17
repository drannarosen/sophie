---
title: Author a MultiRep concept binding
short_title: Author a MultiRep
description: Chapter-author recipe for declaring a `<MultiRep>` block that binds verbal, equation, and figure representations of a single concept.
tags: [components, multirep, notation-registry, representation-alignment, authoring]
---

# Author a MultiRep concept binding

`<MultiRep>` binds multiple representations of one concept (prose,
equation, figure) so the reader can flick their attention between
them and feel them resolve into the same thing. The component is the
chapter-author's surface for the *multiple-representations-binding*
teaching move (Ainsworth 2006, DeFT framework) and feeds the
Representation Alignment Audit.

:::{important} Status: in-progress
The `<MultiRep>` component family is in active implementation per the
[2026-05-17 design hardening](../../plans/2026-05-17-multirep-design.md).
v1 ships `<RepVerbal>` + `<RepEquation>` + `<RepFigure>`. `<RepCode>`
is deferred pending `<CodeCell>` (ADR 0018).
:::

## When to use a MultiRep

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

## Prerequisite: declare the concept in the Notation Registry

`<MultiRep>` resolves its `concept` attribute against the consumer
repo's `notation-registry.yaml`. Before authoring a MultiRep, add
the concept to the registry:

```yaml
# notation-registry.yaml at consumer repo root
concepts:
  - id: "orbital-radius"
    verbal_label: "orbital radius"
    canonical_symbol: "r"
    epistemic_role: "observable"        # optional, per ADR 0058
    latex: "r"
    units: "cm (CGS); AU (display)"
    code_alias: "r_au"
    common_confusions:
      - symbol: "R"
        meaning: "stellar radius — reserved for the central body"
    introduced_in: "module-02/lecture-04"
```

The `epistemic_role` field is the role binding ADR 0058 §2 — the
single source of truth for the concept's role across all components
that reference it (MultiRep, future OMIFlow, AssumptionStack, etc.).

## Source pattern (children-mode)

```mdx
<MultiRep concept="orbital-radius">
  <RepVerbal>
    The orbital radius is the instantaneous distance between the
    orbiting body and the gravitational center it orbits. Imagine
    an ant walking along the orbit — how far must it travel to
    reach the central mass?
  </RepVerbal>

  <RepEquation refKey="kepler-3rd-law" symbol="r" />

  <RepFigure refName="orbit-geometry" symbolLabel="r" />
</MultiRep>
```

Three things to notice:

1. **The `concept` attribute resolves into the registry**, so the
   audit can verify the binding (MR1).
2. **Children are bindings, not content**. `<RepEquation>` and
   `<RepFigure>` reference existing `<KeyEquation>` / `<Figure>`
   declarations elsewhere in the chapter via `refKey` / `refName`;
   they don't re-author the math or the image.
3. **Source-order doesn't matter** — the renderer canonicalizes
   children into verbal → equation → figure regardless of MDX order.

## How it renders

A framed binding card with responsive grid (side-by-side on wide
viewports, stacked on narrow / print):

```
┌─ orbital radius ────────────────────────────────────────────────┐
│ [verbal]                              [equation]                │
│ The distance from the central         → see Kepler's 3rd law (r)│
│ mass to the orbiting body…                                      │
│                                       [figure]                  │
│                                       → see Fig. orbit-geometry │
└─────────────────────────────────────────────────────────────────┘
```

The card frame is the load-bearing visual signal: "these reps belong
together." Role pills (`[verbal]` / `[equation]` / `[figure]`) make
the representation type explicit at a glance.

## What the audit checks (Representation Alignment Audit)

When you author a `<MultiRep>`, the build-time audit fires these
invariants:

| ID | Severity | Check |
|---|---|---|
| MR1 | ERROR   | `concept` resolves in `notation-registry.yaml` |
| MR2 | WARNING | `<RepEquation symbol>` matches the concept's `canonical_symbol` or alias |
| MR4 | INFO    | `<RepFigure>` referenced figure's alt text mentions `verbal_label` or `canonical_symbol` |
| MR6 | INFO    | `<RepEquation equivalent_to="X">` X resolves to a `<KeyEquation>` or `<RepEquation>` in the same MultiRep |

NR1–NR4 also fire on the chapter's `<KeyEquation>` symbols against the
registry. See [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md)
for full severity rationale.

## Equivalent-equation forms

For variable-substitution-equivalent equations (Wien's law λ-form vs
ν-form, SI vs CGS, dimensional vs non-dimensional, exact vs
approximation), use `equivalent_to` + `via`:

```mdx
<MultiRep concept="peak-thermal-wavelength">
  <RepVerbal>The peak wavelength of thermal emission…</RepVerbal>
  <RepEquation refKey="wiens-law-wavelength" symbol="\lambda_{peak}" />
  <RepEquation
    refKey="wiens-law-frequency"
    symbol="\nu_{peak}"
    equivalent_to="wiens-law-wavelength"
    via="planck-substitution"
  />
</MultiRep>
```

`via` is a free-form slug at v1 (no platform catalog). MR6 INFO nudges
authors when `equivalent_to` doesn't resolve.

## Authoring tips

- **Bind on first appearance.** The most useful `<MultiRep>` blocks
  are at the *introduction* of a concept. Subsequent appearances
  assume the binding established earlier; they don't need re-binding
  unless a new representation is introduced.
- **Include intuition framing in `<RepVerbal>`.** Embodied / analogical
  intuition is hardest to teach and easiest to omit. A "think of this
  as…" sentence inside the prose surfaces what's missing from your
  conceptual model. (The dropped `<RepIntuition>` primitive was
  redundant; prose handles it.)
- **Keep `<RepVerbal>` short.** One or two sentences. The
  representations are the substance; the verbal label is the handle.
- **Don't fake representations.** If the chapter doesn't include a
  figure of the concept, skip `<RepFigure>`. A `<MultiRep>` declaring
  representations that don't actually appear in the chapter is
  dishonest scaffolding.
- **One binding per concept per chapter.** Multiple `<MultiRep>` blocks
  for the same concept in the same chapter create ambiguity. If you
  need to add representations later in the chapter, edit the original
  block.

## Common pitfalls

- **Forgetting registry opt-in.** Without
  `pedagogy-contract.yaml.math_and_units_standards.notation_registry`,
  the NR/MR audit invariants don't fire — silent registry drift.
- **Symbol drift in `<RepEquation symbol=…>`.** The symbol declared on
  `<RepEquation>` must match the registry's `canonical_symbol` (or a
  declared alias) — MR2 WARNING fires otherwise.
- **Alt text loses the binding.** `<RepFigure>` referenced figures
  should have alt text mentioning the concept's `verbal_label` or
  `canonical_symbol` — MR4 INFO surfaces the gap.

## See also

- [MultiRep component reference](../reference/multirep-component.md) — full prop tables
- [Notation Registry schema reference](../reference/notation-registry-schema.md) — YAML structure
- [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md) — design rationale
- [ADR 0058](../decisions/0058-epistemic-component-contract.md) — the 8-role taxonomy `epistemic_role` binds to
- [2026-05-17 MultiRep design hardening](../../plans/2026-05-17-multirep-design.md) — v1 implementation plan
