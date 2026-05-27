---
title: 'Pilot report: ASTR 201 Module 3 Lecture 6 — The Boundaries of Stardom'
short_title: 'Pilot: M3-L6 Mass Limits'
description: 'Production migration of ASTR 201 Lecture 3-6 (Mass Limits) into the astr201 consumer repo. Maps 6 equation includes to 3 reused + 3 new entities (heisenberg, hydrogen-burning-minimum, salpeter-imf), takes 3 mass-limits glossary terms canonical (ADR 0086), maps 3 Misconception Check boxes to Interventions, preserves the Gravity Scoreboard, and reuses the L4 eddington-force-balance figure. No Practice Problems section.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 6 — "The Boundaries of
Stardom: Mass Limits"** from Quarto `.qmd` into the **astr201 consumer repo** at
`src/content/sections/stellar-structure-evolution/units/lecture-06-mass-limits/`.
It lands at **order 6** (after L1–L5). Source `astr201-sp26/` was read-only.
Scope: full reading (guiding question + Concept Throughline + Parts 1–5 +
Reference Tables + Summary + Gravity Scoreboard). At **770 lines** this is a
mid-size source. **No `practice.mdx`** — the source has no Practice Problems
section (it ends at "Looking Ahead"). It is also the first migrated reading that
mixes **reused and new equation entities from a set of source includes** (4 reused,
2–3 new), rather than all-new or all-inline.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 4 figures: 3 new (`eta-carinae-hubble` from `Hubble_EtaCarinae.jpeg`, `eddington-vs-main-sequence-luminosity`, `mass-limits-spectrum`) + **reused `eddington-force-balance`** (already registered in L4). |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | 6 includes → **4 reused** (`core-temperature-scaling`, `de-broglie`, `eddington-luminosity`, `mass-luminosity`) + **3 new** (`heisenberg`, `hydrogen-burning-minimum`, `salpeter-imf`). The source's `core-temperature` eqrefcard maps to the astr201 `core-temperature-scaling` entity. |
| inline IMF `dN/dM ∝ M^-2.35` (no include) | `<KeyEquation refId="salpeter-imf">` | ✅ promoted | Authored as a new entity at the gate (Anna's call) and rendered as a card rather than inline. |
| `### Worked Example:` (prose) + `### Unit sanity check` | `<WorkedExample>` | ✅ remap | 1 worked example (zero-point energy of a confined electron); the standalone "Unit sanity check" heading → `.DimCheck`. |
| `:::{.callout-note .omi}` "Observable → Model → Inference" ×2 | `<OMIFlow>` | ✅ direct | 2 clean strict-3 arcs: the Concept-Throughline mass-range arc and the Part-3 minimum-mass arc. |
| `:::{.callout-warning}` "Misconception Check" ×3 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | (degeneracy-from-heat; Eddington ≠ instant explosion; limits ≠ observational accident) — distinct titles so the `addresses` slugs don't collide. The "Precision Check" warning stays `variant="warning"`. |
| `:::{.callout-important}` Big Idea ×2 | `<Callout variant="key-insight">` | ✅ direct | |
| `:::{.callout-note}` Reading-Map / Math-Grammar / Required-Reading / Interpretation / QM-Toolkit | `<Callout variant="info">` | ✅ direct | |
| `:::{.callout-note collapse}` Enrichment ×2 | `<Callout variant="the-more-you-know">` | ✅ direct | Brown Dwarfs; Pair-Instability Supernovae. |
| `:::{.callout-tip}` + collapse Solution | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | 5 Check-Yourself boxes; Reasoning Checkpoints (no solution) stay plain tip Callouts. |
| `:::{.callout-note}` "Gravity Scoreboard — Reading 6" + ASCII | `<Callout variant="key-insight">` + code fence | ✅ motif preserved | This source *does* carry a scoreboard (unlike L5). |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 3 canonical definitions. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **2 `<OMIFlow>`**: `omi-mass-range` (limited
observed mass range → gravity/quantum/radiation competition → mass range fixed by
fundamental physics) and `omi-min-mass` (faint L0 boundary → virial heating vs
degeneracy → star/brown-dwarf boundary near 0.08 M_⊙). Both clean strict-3.

### Glossary canonical (ADR 0086)

This is the mass-limits chapter, so it **takes 3 terms canonical**: Heisenberg
uncertainty principle, Brown dwarf, Initial mass function — all new (verified
pre-merge that none were already defined anywhere). Terms owned elsewhere are
referenced as prose: **degeneracy pressure** (already defined non-canonical in
M3-L2) and **de Broglie wavelength** (M3-L3) are *not* redefined here; Eddington
luminosity / radiation pressure / opacity (M3-L4), core temperature / virial
theorem (M3-L2), mass-luminosity (M3-L5), and Pauli exclusion principle (deferred
to R8) are also prose. This keeps degeneracy pressure's eventual canonical home in
Reading 8 (Chandrasekhar) free.

### Equation registry

Three new entities. `heisenberg` ($\Delta x\,\Delta p \geq \hbar/2$, with the
$\hbar$ constant) `see-also` `de-broglie`. `hydrogen-burning-minimum`
($M_\mathrm{HBMM}\approx0.08\,M_\odot$) `derives-from` both `core-temperature-scaling`
(virial heating) and `heisenberg` (degeneracy halting it) — encoding the
ignition-vs-degeneracy race in the `related` graph. `salpeter-imf`
($dN/dM\propto M^{-2.35}$) `see-also` `mass-luminosity`. The four reused entities are
referenced by `refId` only (not re-authored).

## Pedagogical decisions log

- **3 new equation entities (incl. salpeter-imf)** — confirmed at the gate; Anna chose
  to promote the inline IMF to its own card with a biography (high-mass slope, flattens
  below ~0.5 M_⊙).
- **Reuse core-temperature-scaling / de-broglie / eddington-luminosity / mass-luminosity**
  by refId — the chapter is a synthesis that revisits four earlier results.
- **3 mass-limits terms canonical here**; degeneracy pressure + de Broglie referenced as
  prose (owned by M3-L2 / M3-L3), Pauli exclusion deferred to R8.
- **3 Misconception Check → misconception + Intervention**; the lone "Precision Check"
  stays `variant="warning"`.
- **1 WorkedExample** (zero-point energy), "Unit sanity check" → `.DimCheck`.
- **Gravity Scoreboard preserved** — this source carries one (Reading 6).
- **No `practice.mdx`** — migrate-truthfully: no Practice Problems section in source.

## Surprises

**1. First mixed reuse/new include set.** Earlier chapters' includes were all-new
(L4) or there were none (L5). M3-L6 is a synthesis reading whose 6 includes split
4-reused / 2-new, so the equation-entity step was a per-include ownership lookup
(does the astr201 registry already have it?) rather than a uniform action. The
`core-temperature` → `core-temperature-scaling` id remap is the kind of detail that
only surfaces by checking the registry, not the source filename.

**2. A figure asset whose filename ≠ figure id.** `eta-carinae-hubble`'s asset is
committed as `Hubble_EtaCarinae.jpeg`; the figure id is `eta-carinae-hubble`. Copied
to `public/figures/eta-carinae-hubble.jpeg` (preserving the `.jpeg` extension) so
`src` follows the `/figures/<id>.<ext>` convention.

**3. Degeneracy pressure was already homed.** It would be natural to define degeneracy
pressure canonical in the chapter that introduces the Heisenberg origin of it — but
M3-L2 already carries a (non-canonical) definition, and Reading 8 is its true home.
Referenced as prose here to avoid a premature takeover.

## Platform issues to file

1. **Gap: `<Video>`** — not needed by this chapter.
2. **Tracked residual #198** — no occurrence: all 7 tables use inline-math cells
   (no stacked fractions), so there is zero vertical sub-pixel overflow and desktop
   axe is clean in light + dark without intervention.

## Success criteria

- ✅ Full reading migrated truthfully (guiding question, Concept Throughline, Parts 1–5,
  Reference Tables, Summary, Gravity Scoreboard, both O→M→I arcs). No practice problems
  in source → no `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 6), 3 new `figures.ts` entries + assets
  (reusing `eddington-force-balance`), 3 new equation entities (reusing 4 existing).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 4 figures, 0 broken; 287 KaTeX;
  OMIFlow 2/2/2; 7 KeyEquation cards (7 Observable biography slots); 1 WorkedExample
  numerical + 1 DimCheck; 3 interventions; 3 canonical glossary defs; no leaked MDX;
  the section sidebar reads L1→L2→L3→L4→L5→L6; axe **0 violations desktop, light
  (6/6) + dark (4/4)**.
- ✅ ADR 0086: 3 mass-limits terms canonical here (no collision).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
