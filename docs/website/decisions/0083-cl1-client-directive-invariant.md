---
date: 2026-05-25T00:00:00.000Z
tags:
  - audit
  - invariants
  - hydration
  - ssr
  - ai-authoring
status: accepted-design
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: audit
      ref: packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts
      date: "2026-05-25"
      notes: "CL1 emission site for the four store-backed inline-ref components (`GlossaryTerm`, `EquationRef`, `FigureRef`, `ChapterRef`). Finding pushed before the lookup-prop early-return so bare-AND-malformed callsites still surface the hydration drift."
    - kind: audit
      ref: packages/astro/src/lib/pedagogy-index/extractors/equation-citations.ts
      date: "2026-05-25"
      notes: "CL1 emission site for `<KeyEquation>` — the fifth store-backed component. Co-located with the equations extractor because `<KeyEquation>` lives outside the inline-ref walker's element set."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/extractors/inline-refs.test.ts
      date: "2026-05-25"
      notes: "`describe('CL1 — missing client:* directive on store-backed inline-refs', …)` exercises all four inline-ref components in bare + gated configurations; mixed-callsite fixture asserts one finding per bare element."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/extractors/equation-citations.test.ts
      date: "2026-05-25"
      notes: "`describe('CL1 — missing client:* directive on <KeyEquation>', …)` mirrors the inline-ref suite; the mixed test asserts one CL1 finding alongside two entries when one callsite is bare and one is gated."
    - kind: deployment
      ref: https://github.com/drannarosen/sophie/pull/174
      date: "2026-05-25"
      notes: "PR #174 shipped CL1 as an extractor-layer finding that rides on `PedagogyIndex.extractorFindings` and surfaces as a build error via `packages/astro/src/lib/pedagogy-audit/invariants/extractor-findings.ts` (V0 + V8 passthrough). Closes the second-most-likely failure mode in the React #418 hydration regression class."
  notes: |
    Shipped as part of the post-PR-#172 hardening sequence; closes the
    "missing client:* directive" failure mode that ADR 0038 Amendment 2
    defends structurally via the `useHydrated` gate. CL1 is the
    build-time defence; the gate is the runtime defence; together they
    form a defence-in-depth pair against the React #418 hydration
    mismatch class for store-backed components in packed consumers.
---

# ADR 0083: CL1 client:* directive invariant for store-backed components

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0038 Amendment 2](0038-pedagogy-index-pattern.md) (PR #172) fixed a
class of React #418 hydration mismatches in **packed consumers** of the
five store-backed components (`GlossaryTerm`, `EquationRef`,
`FigureRef`, `ChapterRef`, `KeyEquation`). The structural defence is a
`useHydrated`-at-top gate (§ A2.2): SSR + first client render always
emit bare children regardless of store state; the full tree only
appears after the mount-effect flips the gate.

The gate convention has one prerequisite the runtime cannot enforce:
the component must actually hydrate. § A2.6 spells this out — if a
callsite is rendered without a `client:*` directive (`client:load`,
`client:visible`, `client:idle`, `client:only`, or `client:media`),
Astro renders the component in static-Astro mode, React never mounts,
`useHydrated()` returns `false` forever, the gate stays closed, and the
component renders as **permanent bare prose** in production. Hover
popovers do not open; KaTeX never typesets; cross-references never
resolve.

This failure mode is silent at every layer that catches the related
class of bugs:

- **TypeScript** sees a well-typed component invocation; `client:*` is
  an Astro directive, not a React prop.
- **The runtime `useHydrated` gate** does what it's designed to do —
  emits bare prose — but never flips, so the bare-prose path becomes
  permanent rather than the SSR-only transient.
- **Unit tests** of the components themselves pass; the bug only
  exists at the MDX *callsite*.
- **The Phase 1.5 prose-integrity e2e suite** ([`glossary-term-prose-integrity.spec.ts`](../../../examples/smoke/e2e/glossary-term-prose-integrity.spec.ts))
  catches the regression empirically by asserting post-hydration
  trigger/footnote counts, but only for chapters routed through the
  smoke build.

For an AI primary author (per [ADR 0030](0030-audience-and-ai-author-model.md)
+ [ADR 0061](0061-ai-optimized-codebase-design.md)) the failure mode
is especially seductive: copying a component into a new MDX file
without copying the `client:load` attribute compiles, type-checks,
unit-tests, and renders quietly broken in production. The class of bug
is identical to the second-most-likely shape inside the React #418
family — distinct from § A2.2's gate-class but adjacent to it, and
just as structural.

A build-time invariant closes the loop.

## Decision

**CL1 (severity: ERROR) is a build-time audit invariant emitted by the
pedagogy-index extractors when any of the five store-backed components
appears at an MDX callsite without a `client:*` hydration directive.**

Concretely:

1. **Detection** is name-prefix only: any JSX attribute whose `name`
   starts with `client:` satisfies the invariant. CL1 does not
   constrain *which* directive is used (`client:load`,
   `client:visible`, `client:idle`, `client:only`, `client:media`) —
   only that *some* `client:*` directive is declared.
2. **Emission sites** are co-located with the existing extractors,
   not in a separate pedagogy-audit invariant file. Two extractors
   share the work because the five components are walked by two
   different element sets:
   - `packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts`
     emits CL1 for the four inline-ref components
     (`GlossaryTerm`, `EquationRef`, `FigureRef`, `ChapterRef`),
     which share the `inlineRefUsages` walker.
   - `packages/astro/src/lib/pedagogy-index/extractors/equation-citations.ts`
     emits CL1 for `<KeyEquation>`, which has its own walker
     because it lives outside the inline-ref element set.
3. **Surfacing** happens through the existing extractor-findings
   passthrough (`packages/astro/src/lib/pedagogy-audit/invariants/extractor-findings.ts`):
   CL1 findings ride on `PedagogyIndex.extractorFindings` and merge
   into the audit report alongside V0/V8, so build errors fail CI via
   the existing pedagogy-audit pass.
4. **Emission ordering** matters: CL1 is pushed *before* the
   lookup-prop early-return in `inline-refs.ts`. Authors who drop
   both `name=` and `client:load` see the CL1 hydration-drift error,
   not just the prop-type warning.

The runtime gate (§ A2.2) and the build-time invariant (CL1) form a
defence-in-depth pair: the gate prevents the hydration mismatch when
the component is hydrating; CL1 prevents the silent-bare-prose state
when the component fails to hydrate at all.

## Rationale

Four reasons make CL1 worth promoting to its own ADR rather than
leaving it as a § A2.6 mention inside ADR 0038.

1. **Citation discoverability.** § A2.6 is buried inside ADR 0038's
   Amendment 2 (line 770 of an 800+ line file). Reviewers grep for
   "CL1" expecting to find a decision, not a single mention of an
   audit code. Promoting CL1 to ADR 0083 makes the invariant a
   first-class citation target — PR descriptions, review comments,
   commit messages, and future ADRs (e.g. ADR 0085's `_template/`
   skeleton convention) can cite `ADR 0083` directly.

2. **Defence-in-depth legibility.** ADR 0038 Amendment 2 covers the
   runtime gate; ADR 0084 covers the packed-smoke CI gate; ADR 0085
   covers the authoring-affordance skeleton. CL1 fills the
   build-time-static-analysis layer between runtime and CI. The
   four ADRs form a coherent family (cross-referenced in ADR 0038's
   "ADR 0038 family" block); CL1 needs its own home for that family
   to exist.

3. **Class-of-issue framing.** CL1's *what* is "missing `client:*`
   directive"; CL1's *why* is "defend against a structural shape of
   bug, not patch one observed instance." Per AGENTS.md's
   "structural fixes over targeted patches" principle, the invariant
   is the structural defence. A standalone ADR makes the
   class-of-issue reasoning explicit.

4. **AI-author affordance.** Per ADR 0061, Sophie's codebase is
   designed for AI primary authoring. AI writers cite ADRs in
   commit messages and PR descriptions; an AI author who's told to
   "add CL1 coverage for a new store-backed component" has a
   sharper target with `ADR 0083` than with "ADR 0038 § A2.6."

## Consequences

### Positive

- **CI catches the failure mode at build time.** Authors (human or
  AI) who forget `client:load` see an ERROR-level finding with a
  resolution hint at the callsite, not silent bare prose in
  production.
- **The eight-line CL1 message is the documentation.** Every finding
  spells out the resolution (`add client:load (or another client:*
  directive)`) and cites the parent ADR (`ADR 0038 § A2.6`); no
  separate doc lookup needed.
- **Defence-in-depth pairing with the runtime gate** makes the
  hydration-class regression structurally implausible. Both layers
  would need to fail for the bug to ship.

### Negative / risks

Two known risks, each with a planned mitigation.

1. **False negatives if a new store-backed component is added but
   not declared in the extractor scope.** CL1's element set is
   hard-coded: `INLINE_REF_TARGETS` in `inline-refs.ts` and the
   `<KeyEquation>` check in `equation-citations.ts`. A sixth
   store-backed component shipped without an extractor update would
   slip past CL1 silently. **Mitigation**: [ADR 0085](0085-component-template-skeleton.md)
   formalizes the `_template/` skeleton convention; new store-backed
   components are copied from the skeleton and the extractor scope
   update is part of the same PR as the new component. The vitest
   meta-test in `Template.test.tsx` is the floor that catches
   incomplete copies.

2. **CI runtime cost is non-zero but trivial.** CL1 runs inside the
   existing pedagogy-index extractor pass — same single AST walk per
   MDX file, one extra `attrs.some(a => a.name?.startsWith("client:"))`
   check per matched element. Empirical cost on the smoke build is
   in the millisecond range; no separate CI job.

## Validation

CL1 is validated by four artifacts, listed in the frontmatter
`validation.evidence` block:

1. **Per-extractor unit tests** assert the finding shape on bare,
   gated, and mixed-callsite fixtures. The mixed test in each suite
   is the load-bearing case: it pins that CL1 fires per *callsite*,
   not per *component*, and that gated callsites do not produce
   false positives.
2. **The extractor-findings passthrough invariant** (audit-layer)
   merges CL1 into the build-error stream; the existing
   pedagogy-audit test surface confirms the merge path.
3. **PR #174 shipped the invariant to `main`** alongside the
   `useHydrated` gate it complements; the post-PR-#172 hydration
   regression class is closed by the gate + CL1 pair.
4. **Cross-repo verification at the runtime layer** (ADR 0038
   Amendment 2's astr201 console probe) confirms 0 × React #418 in
   the packed consumer; CL1 ensures the *next* packed consumer that
   omits `client:load` fails at build time rather than at runtime.

## References

- [ADR 0038](0038-pedagogy-index-pattern.md) — pedagogy-index pattern;
  Amendment 2 § A2.2 (runtime `useHydrated` gate) and § A2.6 (origin
  text for CL1).
- [ADR 0082](0082-chapter-layout-extraction.md) — chapter-layout
  extraction; the layout that hosts the store-backed components CL1
  protects.
- [ADR 0061](0061-ai-optimized-codebase-design.md) — AI-optimized
  codebase design; the rationale for promoting CL1 to its own ADR
  (citation discoverability for AI authors).
- [ADR 0085](0085-component-template-skeleton.md) — `_template/`
  skeleton convention; the authoring-affordance layer that defends
  against the false-negative risk in CL1's element-set hard-coding.
- [PR #174](https://github.com/drannarosen/sophie/pull/174) — the
  squash-merge that shipped CL1.
- `packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts` —
  CL1 emission site for the four inline-ref components.
- `packages/astro/src/lib/pedagogy-index/extractors/equation-citations.ts` —
  CL1 emission site for `<KeyEquation>`.
- `packages/astro/src/lib/pedagogy-audit/invariants/extractor-findings.ts` —
  passthrough invariant that surfaces CL1 in the audit report.
