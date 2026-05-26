---
title: 'Pilot report: ASTR 201 Module 3 Lecture 3 — Nuclear Fusion & the Four Forces'
short_title: 'Pilot: M3-L3 Nuclear Fusion'
description: 'Fourth ADR 0064 chapter migration — figure-dense conceptual-physics profile (the four forces + quantum tunneling). First chapter authored against the post-#195–197 hardened platform; exercises the new author-trap lint, WorkedExample invariants, and the D5 definition-reference audit.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

The **fourth** chapter migration under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md), and the first
authored **against the hardened platform** (after PRs #195–197 closed the eight
pilot-surfaced issues #187–194). It converts **ASTR 201 Module 3 Lecture 3 —
"Nuclear Fusion and the Four Forces"** from Quarto `.qmd` into a Sophie MDX
reading in the astr201 consumer repo at
`src/content/sections/stellar-structure-evolution/units/lecture-03-nuclear-fusion/`.
It is the direct continuation of [M3-L2](./m3-l2-hydrostatic-equilibrium.md) —
"what keeps the core hot," the question M3-L2's *Looking Ahead* posed.

**Structural-density rotation (ADR 0064 §4).** A fourth distinct profile:

| Pilot | Dominant profile |
| --- | --- |
| m2-l3 Spectra & Composition | OMI spine + GlossaryTerm density |
| m3-l2 Hydrostatic Equilibrium | equation / derivation / worked-example density |
| m2-l2 Surface Flux & Colors | multi-representation (`<MultiRep>`) + visual/scaling |
| **m3-l3 Nuclear Fusion** | **figure-dense conceptual physics (20 figures; four forces + quantum tunneling)** |

Source `astr201-sp26/` was read-only. Scope: full reading (Parts 1–6 + CNO
enrichment + Synthesis + Summary), a sibling `practice.mdx` (8 problems), 3
equation registry entities, **20 figures**, 1 `<WorkedExample>`, and 1
`<OMIFlow>`. **No PR opened** — built + verified locally, awaiting HITL sign-off.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `learning-objectives:` + `## Learning Objectives` | `<LearningObjectives>` + `<Objective>` | ✅ | 6 objectives. |
| `{{< fig >}}` | `<Figure name>` | ✅ | **20 figures** (NASA force infographics, generated SVG/PNG schematics, reaction-network diagrams); all assets committed in the source repo — no Python execution needed. |
| `{{< include eq >}}` + `{{< eqrefcard >}}` | `<KeyEquation refId>` + registry | ✅ | 3 entities: `de-broglie`, `mass-energy`, `pp-chain-net`. The last is a **reaction equation** ($4\,{}^1\mathrm{H}\rightarrow{}^4\mathrm{He}+\dots$) — validated cleanly as a registry entity. |
| `### Worked example` (de Broglie λ) | `<WorkedExample>` | ✅ | 1 labeled example; the Coulomb-barrier + mass-deficit calcs stay inline display-math (the source doesn't label them as worked examples). `\begin{aligned}` blocks render as display `$$…$$`. |
| `### Observable → Model → Inference` (neutrinos → pp-chain → fusion) | `<OMIFlow>` | ✅ | A clean 1/1/1 arc → a single standalone `<OMIFlow>` (OF-1 strict-3 holds). |
| `.callout-warning` "Misconception Check" ×6 | `<Callout variant="misconception">` + `<Intervention>` | ✅ | Each given a **distinct title** so the `addresses` slugs are unique (6 misconceptions, 6 interventions). |
| `.callout-tip` "Think First" | `<Predict>` | ✅ | 3 (conceptual multiple-choice prompts). |
| `.callout-tip` "Check Yourself" + collapsible solution | `<Callout variant="tip">` + `<Dropdown>` | ✅ | math renders in children. |
| `.callout-note` "Causal Map / Reading Map / Stop-and-Synthesize" | `<Callout variant="info">` | ✅ | |
| `.callout-important` "Big Idea / One Sentence / Final Takeaway" | `<Callout variant="key-insight">` | ✅ | |
| `.callout-warning` "Notation Warning / Precision Check" | `<Callout variant="warning">` | ✅ | cautions, not misconceptions. |
| `### Enrichment: Where forces live` / CNO section | `<Callout variant="the-more-you-know">` + prose | ✅ | |
| inline technical terms | `<GlossaryTerm>` + `<Aside kind="definition">` | ✅ | 10 terms (Coulomb barrier, tunneling, de Broglie, uncertainty principle, Gamow window, weak/strong interaction, binding energy/nucleon, mass deficit, deuterium, CNO cycle). |
| 8 Practice Problems | separate `practice.mdx` | ✅ | decision 0001 §6. |

## Pedagogy structure map

**Eight-role (ADR 0058):** *model/inference* — the `<OMIFlow>` + the equation
`<DerivationStep>` children (de-Broglie speed→λ; mass-deficit→energy; the
three pp steps). *observable* — `<Observable>` in all 3 equation files + the
OMIFlow observable (solar neutrinos). *assumption* — `<Assumption>`
(non-relativistic momentum, rest-mass energy, net-reaction). *approximation* —
`<BreaksWhen>` (relativistic momentum, CNO takeover). *misconception* — 6
`<Callout variant="misconception">` + 6 `<Intervention>` + `<CommonMisuse>` on
all 3 equations. *numerical* — 1 `<WorkedExample>` (de Broglie λ, with DimCheck).
*uncertainty* — surfaced conceptually (Heisenberg) but not as A10's component.

**OMIFlow:** one arc — solar neutrinos (observable) → pp-chain prediction
(model) → core fusion (inference). No `framing:"OMI"`; the chapter is
figure/concept-driven, not OMI-driven.

## Pedagogical decisions log

- **20 figures, all standalone `<Figure>`.** No inline Python this time — the
  source's `figures/` generators (`make_*.py`) had already produced committed
  PNG/SVG assets, so the migration just registered them (no `_freeze` recovery
  or code execution).
- **`pp-chain-net` as a registry equation.** A reaction equation, not a formula,
  but it fits the registry schema (tex + species symbols) and renders cleanly —
  widening what `<KeyEquation>` entities can represent.
- **One labeled `<WorkedExample>`** (de Broglie); Coulomb-barrier and
  mass-deficit derivations stay inline, faithful to the source's labeling.
- **6 distinctly-titled misconceptions** so each `<Intervention addresses>` slug
  is unique (a generic repeated "Misconception Check" title would collide).
- **Practice → separate `practice.mdx`**; **glossary terms added** per the
  standing instruction.

## Time spent per phase

Conversion-dominated; the hardened platform absorbed everything.

| Phase | Notes |
|---|---|
| Inventory + figure survey | Confirmed all 20 figure assets + 3 equation includes + no Video; read the full source. |
| Scaffold (unit JSON, 20 figures, 3 equations) | Largest mechanical block (20 figure registry entries). |
| Reading conversion (full) | Stub-with-equations built first to validate the reaction-equation entity + 20-figure registry. |
| `practice.mdx` | Small. |
| Verification | biome / typecheck / build / axe (desktop light+dark) / browser render-integrity. |

## Surprises

1. **First clean run against the hardened platform.** The new **MDX author-trap
   lint** (#196) passed on first full build (lesson applied from the M2-L2
   re-verification: no multi-line inline math, no raw `<digit`, no `<->`). The
   new **WorkedExample invariants** (#197, WE-1/WE-2) ran against the de-Broglie
   example and produced **no findings** — slot coverage satisfied.
2. **The D5 audit caught a real authoring gap.** I defined a "Weak interaction"
   `<Aside kind="definition">` but initially never referenced it with a
   `<GlossaryTerm>`; **D5** ("definition has zero `<GlossaryTerm>` references")
   flagged it as a build warning. Fixed by wrapping one mention. The
   definition/reference audit (D4 forward, D5 inverse) is an effective
   bidirectional safety net for the glossary layer.
3. **Reaction equations work as registry entities.** `pp-chain-net`
   ($4\,{}^1\mathrm{H}\rightarrow{}^4\mathrm{He}+2e^+ +2\nu_e+26.7\,\mathrm{MeV}$)
   validated and renders as a `<KeyEquation>` card — the registry isn't limited
   to algebraic formulas.
4. **No new platform findings.** The only residual is the already-tracked
   mobile `scrollable-region-focusable` (#198), which applies to this chapter's
   KeyEquation-card math and wide tables at 375px as expected; desktop is clean.

## Recommendations + ADR backlog

- The migration playbook is now steady-state: with the platform hardened, a
  fourth chapter converted with **zero new platform issues** and only routine
  authoring fixes. ADR 0064's pilot phase has served its purpose; subsequent
  migrations can proceed as production work, tracking only genuinely new gaps.
- Carry-over open items unchanged: `<Video>` (still unbuilt; not needed here),
  Track-A/Track-B `<DifficultyPath>`, and the mobile a11y residual (#198).
- Next candidates: M2-L1 Distance & Parallax (completes the M2 chain) or M3-L4
  Radiation Transport (continues M3).

## Platform issues to file

**None new.** The mobile `scrollable-region-focusable` residual is already
tracked as [#198](https://github.com/drannarosen/sophie/issues/198). A minor
documented finding from the M2-L2 re-verification — the author-trap lint
over-scanning `{/* */}` comment regions — remains a candidate refinement, not
filed.

## Success criteria

- ✅ Full reading migrated truthfully (Parts 1–6 + CNO enrichment + Synthesis + Summary).
- ✅ Structural-density rotation: figure-dense conceptual profile (20 figures) — distinct from the three prior pilots.
- ✅ 3 equation registry entities (incl. a reaction equation) with biographies; all cited.
- ✅ 20 figures registered + rendering (0 broken).
- ✅ 1 `<WorkedExample>` (de Broglie, with DimCheck — WE invariants clean); 1 `<OMIFlow>`; 6 misconceptions w/ interventions; 10 GlossaryTerms.
- ✅ `pnpm build` **0 errors, 0 warnings** (16 benign infos); `astro check` 0/0/0; Biome clean; **author-trap lint clean**.
- ✅ axe-core **0 violations desktop light + dark**; render integrity (186 KaTeX, 20 figures, no leaked MDX, no hydration errors).
- ⚠️ Mobile `scrollable-region-focusable` — the tracked #198 platform residual, not a chapter defect.
- ⚠️ `practice.mdx` authored; emits the expected #189 unrouted-warning.
- ⬚ Not committed/PR'd — awaiting HITL sign-off.
