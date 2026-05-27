---
title: 'Pilot report: ASTR 201 Module 3 Lecture 4 — Radiation Transport'
short_title: 'Pilot: M3-L4 Radiation Transport'
description: 'Production migration of ASTR 201 Lecture 3-4 (Radiation Transport) into the astr201 consumer repo. The largest source migrated to date (1101 lines). Adds 5 radiation-transport equation entities, takes 8 transport-core glossary terms canonical (ADR 0086), maps 3 Misconception Check boxes to Interventions, and is the first migrated chapter with no Practice Problems section.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 4 — "The Long Way Out:
Radiation Transport"** from Quarto `.qmd` into the **astr201 consumer repo** at
`src/content/sections/stellar-structure-evolution/units/lecture-04-radiation-transport/`.
It lands at **order 4** (after L1 Ages & Lifetimes, L2 Hydrostatic Equilibrium,
L3 Nuclear Fusion). Source `astr201-sp26/` was read-only. Scope: full reading
(guiding question + Parts 1–6 + Reference Tables + Summary + the two O→M→I chains).
At **1101 lines** this is the largest source migrated so far. **No `practice.mdx`**
— the source has no Practice Problems section (it ends at "Looking Ahead").

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 7 figures, all new (registry + assets). |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | **5 new entities** (`mean-free-path`, `random-walk`, `radiative-diffusion-flux`, `radiative-diffusion-luminosity`, `eddington-luminosity`) + reused `radiation-pressure`. flux + luminosity kept as separate cards (both load-bearing in stellar structure). |
| `### Worked example:` (prose, display-math steps) | `<WorkedExample>` | ✅ remap | 4 worked examples (mean-free-path, diffusion time, P_rad vs P_gas, Eddington L); Unit check → `.DimCheck`. |
| `:::{.callout-note .omi}` / opening O→M→I section | `<OMIFlow>` | ✅ direct | 2 chains: the opening diffusion-time chain and the luminosity-fusion self-regulation chain. |
| `:::{.callout-warning}` "Misconception Check" ×3 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | (small mfp ≠ slow photons; what diffuses; radiation pressure ≠ gas pressure) — distinct titles so the `addresses` slugs don't collide. Plain `.callout-warning` "Precision Check" boxes stay `variant="warning"`. |
| `:::{.callout-important}` Key Scaling / Takeaway / Convection def | `<Callout variant="key-insight">` | ✅ direct | |
| `:::{.callout-tip}` + collapse | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | Think-First / Check-Yourself; the Part-1 Think-First answer (a separate source "Solution" box) folded into its Dropdown. |
| `:::{.callout-note}` "Gravity Scoreboard — Reading 4" + ASCII | `<Callout variant="key-insight">` + code fence | ✅ motif preserved | |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 8 canonical definitions. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **2 `<OMIFlow>`**: `omi-diffusion-time` (steady
luminosity → optically-thick random walk → ~10^5-yr transport) and
`omi-self-regulation` (L_sun + T_eff → radiative diffusion → luminosity-fusion
self-regulation). Both clean strict-3.

### Glossary canonical (ADR 0086)

This is the radiation-transport home chapter, so it **takes 8 transport-core terms
canonical**: Opacity (from foundations), Radiative diffusion + Radiation pressure
(from M3-L2), plus the new Optical depth, Mean free path, Random walk, Convection,
and Eddington luminosity. Verified pre-merge that none were already canonical (only
M2-L3 Kirchhoff and M3-L1's timescale terms carried the flag). Mean molecular weight
and hydrostatic equilibrium are referenced as prose — they belong to M3-L2.

### Equation registry

Five new entities forming the transport chain via `related` links:
`random-walk` derives-from `mean-free-path`; `radiative-diffusion-flux`
derives-from `random-walk`; `radiative-diffusion-luminosity` derives-from the flux;
`eddington-luminosity` derives-from `radiation-pressure` (reused) and see-also
`newtonian-gravitation`. Each carries an opacity-as-resistance / random-walk-slowness
biography with `<BreaksWhen>` covering optically-thin surfaces and convective zones.

## Pedagogical decisions log

- **5 entities, flux + luminosity separate** — confirmed at the gate; the luminosity
  form $L(r)$ is the actual stellar-structure transport equation.
- **8 transport-core terms canonical here** — confirmed at the gate (the home chapter).
- **Non-OMI + 2 OMIFlows + Gravity Scoreboard** — confirmed at the gate.
- **3 Misconception Check → misconception + Intervention** — the right epistemic
  mapping (each names a wrong idea and refutes it).
- **No `practice.mdx`** — migrate-truthfully: the source has no practice problems,
  so none were invented.

## Surprises

**1. First chapter with no Practice Problems.** Every prior migrated reading carried a
Practice Problems section → `practice.mdx`. M3-L4 ends at "Looking Ahead" with none,
so there is no practice artifact — a reminder that the `practice.mdx` sibling is
source-driven, not mandatory.

**2. A free-floating "Solution" box.** The Part-1 "Think First" prompt's answer
appeared as a separate `:::callout-note ## Solution` *after* the intervening
mean-free-path derivation. Folded into the Think-First `<Dropdown>` so the Q and A
sit together — faithful in content, cleaner in structure.

**3. Eight canonical takeovers in one chapter.** The most canonical re-homing in a
single migration so far — three terms reclaimed from foundations/M3-L2 plus five new
ones. The build-time one-canonical-per-slug guard passed because the prior
definitions were all non-canonical.

## Platform issues to file

1. **Gap: `<Video>`** — not needed by this chapter.
2. **Tracked residual #198** — desktop axe (the acceptance gate) is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (guiding question, Parts 1–6, Reference Tables,
  Summary, both O→M→I chains). No practice problems in source → no `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 4), 7 new `figures.ts` entries + assets,
  5 new equation entities (reusing radiation-pressure).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 8 figures, 0 broken; 287 KaTeX;
  OMIFlow 2/2/2; 4 WorkedExample numerical + 4 DimCheck; 3 interventions; all 6
  equation cards render; Gravity Scoreboard ASCII preserved; no leaked MDX; the
  section sidebar reads L1→L2→L3→L4; axe **0 violations desktop, light + dark**.
- ✅ ADR 0086: 8 transport-core terms canonical here (no collision).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
