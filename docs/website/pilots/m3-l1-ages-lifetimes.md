---
title: 'Pilot report: ASTR 201 Module 3 Lecture 1 — Ages & Lifetimes'
short_title: 'Pilot: M3-L1 Ages & Lifetimes'
description: 'Production migration of ASTR 201 Lecture 3-1 (Stellar Ages and Lifetimes) into the astr201 consumer repo — the Module 3 opener, filling the L1 gap left when L2/L3 were migrated as the early ADR-0064 pilots. Adds 4 timescale equation entities, takes the timescale glossary terms canonical, and preserves the Gravity Scoreboard ASCII motif.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 1 — "The Clock Is Ticking:
Stellar Ages and Lifetimes"** from Quarto `.qmd` into the **astr201 consumer repo**
at `src/content/sections/stellar-structure-evolution/units/lecture-01-ages-lifetimes/`.
It lands at **order 1** — the **Module 3 opener**, filling the gap left when L2
(Hydrostatic Equilibrium) and L3 (Nuclear Fusion) were migrated first as the early
ADR-0064 pilots. With this in place the section sidebar reads L1 → L2 → L3. Source
`astr201-sp26/` was read-only. Scope: full reading (front matter + Parts 1–5 +
Reference Tables + Summary) plus a sibling `practice.mdx` with all 8 graded problems
(decision 0001 §6). This is the first **Module 3** consumer chapter migrated since
the L2/L3 pilots, and it directly continues the $t_{\text{MS}} \propto M^{-2.5}$
lifetime thread from M2-L4/L5.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 5 figures, all new (registry + assets). |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | **4 new entities**: `dynamical-timescale`, `kelvin-helmholtz`, `nuclear-timescale`, `lifetime-scaling`. `lifetime-scaling` ($\tau \propto M^{-2.5}$) kept as its own entity (headline result, used throughout) rather than folded into nuclear-timescale. |
| `### Worked Example:` (prose, display-math steps) | `<WorkedExample>` (`.Problem`/`.Step`/`.DimCheck`/`.Result`) | ✅ remap | The source's 4 worked examples are prose sections, not callout boxes. Converted to the component, mapping the Units check → `.DimCheck` and the Sanity check → `.Result`. (The "Quick Ratio Example" stays inline — a brief illustration, not a full problem.) |
| `:::{.callout-important}` | `<Callout variant="key-insight">` | ✅ direct | Big Idea; Gravity Scoreboard. |
| `:::{.callout-tip}` + collapse | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | Think-First / Check-Yourself / Check-Your-Model; math in the Dropdown. |
| `:::{.callout-note collapse}` Enrichment | `<Callout variant="deep-dive">` | ✅ direct | "The Ratio That Changed Everything" energy comparison. |
| `:::{.callout-note .omi}` | `<OMIFlow>` | ✅ direct | The turnoff → nuclear-lifetime → cluster-age chain (clean strict-3). |
| `:::{.callout-note}` "Gravity Scoreboard" + ASCII box | `<Callout variant="key-insight">` + fenced code block | ✅ motif preserved | The ASCII scoreboard kept verbatim in a fenced code block (the migrate-truthfully memory flags it as a preserve-verbatim motif). |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 4 canonical definitions (source had no Glossary section). |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). One `<OMIFlow>` (`omi-turnoff-age`):
Observable = the cluster main-sequence turnoff; Model = $\tau_\text{nuc} \propto
M^{-2.5}$; Inference = cluster age. Clean strict-3, satisfying OF-1.

### Glossary canonical (ADR 0086)

This is **the timescales chapter**, so it takes the timescale terms canonical:
`Dynamical timescale` (re-defined `canonical`, taking over from M3-L2's earlier
non-canonical passing mention — verified the only pre-existing canonical marker
was M2-L3's `Kirchhoff's laws`, so no collision), plus `Kelvin-Helmholtz
timescale`, `Nuclear timescale`, and `Main-sequence turnoff` (new, canonical).
Reused terms (main sequence, mass-luminosity relation, hydrostatic equilibrium,
HR diagram) are referenced as plain prose — their canonical homes are set in
M2/M3-L2.

### Equation registry

Four new entities, each with full biography. They form a derivation chain encoded
in the `related` links: `kelvin-helmholtz` derives-from `gravitational-potential-energy`
(the $GM^2/R$ reservoir) and see-also `virial-theorem`; `nuclear-timescale`
derives-from `mass-energy` ($E=mc^2$) and see-also `mass-luminosity`;
`lifetime-scaling` derives-from both `nuclear-timescale` and `mass-luminosity`
(the $L \propto M^{3.5}$ substitution). `dynamical-timescale` see-also
`hydrostatic-equilibrium` (the balance its short timescale enforces).

## Pedagogical decisions log

- **4 entities, lifetime-scaling separate** (not folded) — confirmed at the gate;
  $\tau \propto M^{-2.5}$ is a headline result with its own card in the source.
- **Timescale terms canonical here** — confirmed at the gate (the timescales chapter).
- **Non-OMI + 1 OMIFlow + Gravity Scoreboard motif** — confirmed at the gate.
- **Prose worked examples → `<WorkedExample>`** — the source wrote them as `###`
  headings with display-math steps; the component is the right epistemic home
  (WE-1/WE-2 slot-coverage invariants).
- **No misconception components** — the source has none (the true/false "more
  massive lives longer" is a Check-Yourself, not a misconception box); nothing invented.

## Surprises

**1. The opener arrived last.** Because L2/L3 were the original ADR-0064 pilots, the
section had a structural gap at L1 — and "Dynamical timescale" was already defined
(non-canonical) in L2 as a passing mention. Migrating the opener let it take the
timescale terms canonical, the same ownership move as M2-L5 with HRD/main-sequence.
A reminder that out-of-order migration leaves canonical-ownership cleanup for the
chapter that is the term's true home.

**2. Inline `<` math traps in derivations.** The Kelvin-Helmholtz derivation uses
$dE/dt < 0$ and $dR/dt < 0$, and the lifetime table had a `>` -before-digit cell —
all reworded ("is negative", "longer than the universe's age") to avoid the
author-trap lint.

## Platform issues to file

1. **Gap: `<Video>`** — not needed by this chapter.
2. **Tracked residual #198** — desktop axe (the acceptance gate) is clean in light + dark.

## Success criteria

- ✅ Full reading + `practice.mdx` migrated truthfully (front matter, Parts 1–5,
  Reference Tables, Summary, 8 practice problems).
- ✅ Registries scaffolded: unit JSON (order 1), 5 new `figures.ts` entries +
  assets, 4 new equation entities.
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 7 figures, 0 broken; 242 KaTeX;
  OMIFlow 1/1/1; 4 WorkedExample numerical + 4 DimCheck; no leaked MDX; Gravity
  Scoreboard ASCII preserved; all 4 equation cards render; the section sidebar reads
  L1→L2→L3; axe **0 violations desktop, light + dark**.
- ✅ ADR 0086: 4 timescale terms canonical here (no collision with M2-L3 Kirchhoff).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
