---
title: Author an equation biography
short_title: Equation biography
description: Chapter-author recipe for adding biography children (Observable / Assumption / Units / BreaksWhen / CommonMisuse) to a `<KeyEquation>`.
tags: [components, key-equation, equation-biography, authoring, pedagogy]
---

# Author an equation biography

A `<KeyEquation>` without biography is the symbol-and-name-and-math.
A `<KeyEquation>` *with* biography surfaces what the equation
observes, what it assumes, what units its symbols carry, where it
breaks down, and what students commonly misuse. The biography is
authored *at* the equation as children, not in surrounding prose, so
it survives indexing, audit, and AI authoring tooling.

:::{important} Status: in-progress
The 6 biography components are in active implementation per the
[2026-05-17 design hardening](../../plans/2026-05-17-equation-biography-design.md).
v1 ships `<Observable>`, `<Assumption>`, `<Units>`, `<BreaksWhen>`,
`<CommonMisuse>` as children of `<KeyEquation>` with rendering updates
to `<EqRef>` hover, `<ChapterEquations>`, and `<CourseEquations>`.
:::

## When to author a biography

Add biography children to a `<KeyEquation>` when:

- The equation is **load-bearing** for the chapter (vs incidental).
- The equation has **non-obvious assumptions** that determine its
  validity domain (most physics equations do).
- The equation is **commonly misapplied** in ways the chapter
  addresses.
- You want the equation to show up usefully in the chapter-end
  `<ChapterEquations>` roll-up and the course-wide `/equations`
  route.

Skip biography children when:

- The equation is an incidental algebraic step (won't appear
  prominently in roll-ups anyway).
- The equation's assumptions are obvious from context (e.g., a
  generic vector identity).

## All 6 children are optional

You can author incrementally — biographies don't have to be
complete to ship. The audit (E7 INFO) gently nudges toward
`<Observable>` when other biography children are present, but it
doesn't block. Author the children you have content for; add others
as the chapter matures.

## Source pattern (children-mode siblings of math body)

```mdx
<KeyEquation id="wiens-law" title="Wien's Law">
  $$\lambda_{peak} = b \, T^{-1}$$

  <Observable>
    Peak wavelength of thermal emission as a function of
    temperature.
  </Observable>

  <Assumption type="thermal-equilibrium">
    Source is in local thermodynamic equilibrium so the Planck
    distribution applies.
  </Assumption>

  <Assumption type="blackbody">
    Source emits as an ideal blackbody (no spectral lines, no
    continuum absorption shaping the peak).
  </Assumption>

  <Units symbol="T" unit="K" />
  <Units symbol="\lambda_{peak}" unit="cm" />

  <BreaksWhen>
    Non-thermal emission (synchrotron, masers, line emission);
    optically-thin sources without thermal coupling.
  </BreaksWhen>

  <CommonMisuse misconception="wiens-law-absorption-spectra">
    Applying Wien's law to identify the temperature of an
    absorption-line spectrum. The peak position depends on the
    continuum, not the absorption features.
  </CommonMisuse>
</KeyEquation>
```

Authoring rules:

- Math body (`$$...$$`) comes first
- Biography children in any order
- Repeating `<Assumption>` + `<Units>` + `<CommonMisuse>` encouraged
  (most equations have multiple of each)
- All 6 children optional — incremental authoring supported

## What each child captures

| Component | Body | Required props | Purpose |
|---|---|---|---|
| `<Observable>` | prose | none | Observational meaning — what real-world quantity the equation describes |
| `<Assumption>` | prose | none (optional `type=` slug) | Each assumption the equation encodes |
| `<Units>` | empty | `symbol`, `unit` | One symbol's unit declaration; repeat for each symbol |
| `<BreaksWhen>` | prose | none | The regime where the equation no longer applies |
| `<CommonMisuse>` | prose | none (optional `misconception=` cross-ref to misconception graph) | A common student misuse |

`<Assumption type=>` is a free-form slug at v1 (no platform catalog).
If patterns recur across courses, a future ADR may promote selected
types to a platform `assumption-index.ts`.

## Composition with ADR 0058 epistemic roles

Each biography component declares its `epistemicRole` as a hardcoded
const (you don't set it — it ships with the component):

| Component | epistemicRole |
|---|---|
| `<Observable>` | `observable` |
| `<Assumption>` | `assumption` |
| `<BreaksWhen>` | `approximation` (validity-domain marker) |
| `<Units>` | (none — descriptive metadata) |
| `<CommonMisuse>` | (none — cross-refs misconception graph) |

This means the pedagogy index carries a uniform `epistemicRole`
field on every biography entry — consumers (audit, AI authoring,
theme tokens) read role from one place. v2 queries like "show me
every `assumption` declared in Module 4" become trivial.

## How biographies render

### Hover (compact summary)

`<EqRef slug="wiens-law">` hover preview adds a compact summary line
below the math:

```
┌─────────────────────────────────────────┐
│ Wien's Law         $$λ_peak = b T⁻¹$$   │
│ 2 assumptions · 1 misuse                │
│ valid in: thermal equilibrium           │
└─────────────────────────────────────────┘
```

### ChapterEquations + CourseEquations (full)

The chapter-end roll-up and the course-wide `/equations` route render
full biography sections per equation:

```
## Wien's Law
$$\lambda_{peak} = b T^{-1}$$

**Observable:** Peak wavelength of thermal emission…

**Assumptions:**
- thermal-equilibrium — Source is in local thermodynamic…
- blackbody — Source emits as an ideal blackbody…

**Units:** T [K], λ_peak [cm]

**Breaks when:** Non-thermal emission (synchrotron, masers, …).

▸ Common misuses (1)   [collapsed]
```

The `<CommonMisuse>` list collapses behind `<details>` disclosure
(typically the bulkiest field; progressive disclosure during review).

## Cross-referencing the misconception graph

Use `<CommonMisuse misconception="<slug>">` to cross-link the misuse
to a misconception declared in the chapter (or another chapter):

```mdx
<CommonMisuse misconception="wiens-law-absorption-spectra">
  Applying Wien's law to identify the temperature of an
  absorption-line spectrum…
</CommonMisuse>
```

This declares a bidirectional cross-reference: the equation's
`<CommonMisuse>` knows about the misconception; the misconception
graph (per ADR 0044) can list "equations where this misconception
shows up." E9 INFO nudges authors when the cross-ref is missing.

## What the audit checks

When you author biographies, three E-prefix invariants fire (all only
when biography children are present):

| ID | Severity | Check |
|---|---|---|
| E7 | INFO    | `<KeyEquation>` with biography children has `<Observable>` |
| E8 | WARNING | `<Units symbol="X">` matches the Notation Registry's `canonical_symbol` for the concept owning this equation (only when NR is opted-in) |
| E9 | INFO    | `<CommonMisuse>` has a `misconception="<slug>"` cross-ref |

E8 is the only correctness gate. E7 and E9 are authoring nudges that
don't block.

## Authoring tips

- **Author incrementally.** Don't try to write a complete biography
  for every equation. Start with `<Observable>` + `<Assumption>` on
  load-bearing equations; add others when chapter revision surfaces
  the need.
- **Use `<Assumption type=>` for recurring assumption families.**
  Even though v1 has no catalog, declaring `type="thermal-equilibrium"`
  vs `type="small-angle"` etc. seeds the pattern recognition that
  may later promote to a platform catalog.
- **Declare units in CGS.** Per Sophie's astronomy units convention,
  prefer cm/g/s/erg in `<Units unit=>`. AU/pc/Mpc are display-only.
- **Link `<CommonMisuse>` to misconceptions explicitly.** The
  bidirectional cross-ref (E9 nudges this) creates the
  equation-misconception-intervention chain that's the Reasoning OS
  thesis in microcosm.
- **Wien's law is the canonical fully-formed example.** Anchor your
  authoring style on the smoke-fixture Wien's law biography.

## Common pitfalls

- **Biography in prose instead of children.** Free-form prose
  describing assumptions and validity is lost to the pedagogy index +
  audit + AI tooling. Put it in `<Assumption>` and `<BreaksWhen>`.
- **`<Units>` symbol mismatch with the Notation Registry.** E8
  WARNING fires when the symbol you declare on `<Units>` doesn't
  match the registry's `canonical_symbol` for the concept. Fix in
  the registry (if the concept's canonical symbol changed) or in the
  `<Units>` declaration (if you typoed).
- **Forgetting `<Observable>` while authoring other children.** E7
  INFO surfaces the gap. The observable is the equation's *reason
  for existing* — it deserves authoring even for incomplete
  biographies.

## See also

- [Equation Biography schema reference](../reference/equation-biography-schema.md) — full schema spec
- [ADR 0046](../decisions/0046-equation-biography.md) — design rationale
- [ADR 0058](../decisions/0058-epistemic-component-contract.md) — the 8-role taxonomy biography children bind to
- [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md) — Notation Registry (E8 audit forward-binds)
- [ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md) — Misconception Graph (`<CommonMisuse misconception=>` cross-ref)
- [2026-05-17 EquationBiography design hardening](../../plans/2026-05-17-equation-biography-design.md) — v1 implementation plan
