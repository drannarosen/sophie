---
title: 'Pilot report: ASTR 201 Module 2 Lecture 5 — The HR Diagram'
short_title: 'Pilot: M2-L5 HR Diagram'
description: 'Production migration of ASTR 201 Lecture 5 (The HR Diagram) into the astr201 consumer repo — the Module 2 capstone. The largest source migrated so far (1056 lines). Adds magnitude-flux and distance-modulus entities, takes Hertzsprung-Russell diagram + Main sequence canonical (ADR 0086), and drops a source <style> block + table-scroll wrappers.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

Production migration of **ASTR 201 Module 2 Lecture 5 — "The HR Diagram: Finding
Patterns, Needing Models"** from Quarto `.qmd` into the **astr201 consumer repo**
at `src/content/sections/hr-diagram/units/lecture-05-hr-diagram/`. It lands in the
`hr-diagram` section at **order 5** — the **capstone of Module 2**, assembling
every prior measurement (distance, luminosity, temperature, composition, mass)
into one diagram and posing the questions that launch Module 3. Source
`astr201-sp26/` was read-only. Scope: full reading (front matter + Parts 1–5 +
Reference Tables + Summary + the O→M→I chain) plus a sibling `practice.mdx` with
all 12 graded problems (decision 0001 §6).

At **1056 lines** this is the largest source migrated to date, and the fifth
consumer chapter under [ADR 0064](../decisions/0064-chapter-migration-playbook.md).
It completes the `hr-diagram` section (L1 → L2 → L3 → L4 → L5).

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 9 figures: 8 new (registry + assets), `harvard-computers` reused (M2-L3 owns). |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | 2 new entities (`magnitude-flux`, `distance-modulus`) + reused `stefan-boltzmann`. Both new entities are distinct equations (Pogson relation vs. distance modulus) — no fold. |
| `:::{.callout-important}` | `<Callout variant="key-insight">` | ✅ direct | Big Idea, Cecilia Payne, "Why This Matters", course throughline, "Pause and Reflect", "What's Next". |
| `:::{.map-builder}` motif | `<Callout variant="key-insight" title="Map Builder — …">` | ✅ motif preserved | Axes Established → Structures Identified → Size Gradient → Mass Writes Addresses → Complete Map (5×) — same treatment as M2-L3's Spectrum Detective and M2-L4's Mass Detective. |
| `:::{.callout-warning}` "Common Misconception" | `<Callout variant="misconception">` + `<Intervention>` | ✅ direct | One misconception (red giants more massive) → `data-intervention-type`. "The Backward Scale" stays `variant="warning"` (a convention, not a misconception). |
| `:::{.callout-tip}` + collapse | `<Callout variant="tip">` + `<Dropdown label="…">` | ✅ direct | Think-First / Check-Yourself / Reasoning-Check; math in the Dropdown. |
| `:::{.callout-note collapse}` Deep Dive / Enrichment | `<Callout variant="deep-dive">` | ✅ direct | Log-laws survival kit; detailed evolution tracks (3 figures). |
| `{{< video URL >}}` ×2 | `<Callout variant="info">` + external link | ✅ decided | Hubble cluster + Gaia HR-diagram videos → Callout links (`<Video>` unbuilt; iframes fail axe). |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 16 definition asides (source had no Glossary section). |
| `<WorkedExample>` analog | `<WorkedExample>` (`.Problem`/`.Step`/`.DimCheck`/`.Result`) | ✅ direct | 3 worked examples (Comparing Two Stars, Distance from Magnitudes, Radius from HR). |
| raw `<style>` + `.hr-reading-table-scroll` wrappers | **dropped** | ✅ chrome | Sophie owns table styling; raw `<style>` is inappropriate in MDX. The two wide tables then hit the tracked #198 mobile-scroll residual (desktop axe is the gate). |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). One `<OMIFlow>` (`omi-hr-diagram`) renders the
summary "HR Diagram Chain": Observable = brightness + color + parallax for many
stars; Model = the magnitude / distance-modulus / Stefan-Boltzmann / structure
calibration stack; Inference = HR structure with mass as the hidden organizer.
The chain is genuinely multi-component, but each OMIFlow slot states one bundled
observable/model/inference, satisfying OF-1 slot structure.

### Glossary canonical (ADR 0086)

This is THE HR-diagram lecture, so it **takes `Hertzsprung-Russell diagram` and
`Main sequence` canonical** (re-defined here with the `canonical` flag; M2-L1 and
M2-L4 keep non-canonical definitions). `White dwarf` is re-defined non-canonical
(M2-L4 owns it — first substantive use, Sirius B). Pre-merge grep confirmed only
M2-L3's `Kirchhoff's laws` was already canonical, so no build-time canonical
collision.

### Equation registry

Two new entities. `magnitude-flux` (Pogson) carries the flux-ratio rearranged
form and a `<DerivationStep>` deriving the $-2.5$ coefficient from the 5-mag =
100× anchor. `distance-modulus` carries distance-from-modulus and
absolute-magnitude rearranged forms, derives-from `flux-luminosity-distance` (it
*is* the inverse-square law in log form), and see-also `parallax-parsec`. Its
`<BreaksWhen>` flags interstellar extinction (the classic distance-overestimate trap).

## Pedagogical decisions log

- **2 distinct new entities** (no fold) — magnitude-flux and distance-modulus are
  different equations, unlike M2-L4's kepler-solar/kepler-binary case.
- **L5 takes HRD + Main sequence canonical** — confirmed at the gate.
- **`<style>` block + scroll wrappers dropped** — presentation chrome; Sophie owns
  table styling.
- **Non-OMI + 1 OMIFlow + Map Builder motif** — confirmed at the gate; consistent
  with the L3/L4 detective-motif pattern.
- **2 videos → Callout links** (standing pattern). **No `<Predict>`** (every prompt
  has a math-bearing answer → tip + Dropdown).

## Surprises

**1. Stale Mermaid render-cache in `_files/`.** The source's
`lecture-05-hr-diagram-reading_files/figure-latex/` holds two `mermaid-figure-*.png`
from a previous Quarto render, but the current `.qmd` has **no inline Mermaid** —
the evolution figures are proper `{{< fig >}}` registry images. Confirmed by
reading the full source; nothing to migrate from `_files`. (Contrast M2-L4, which
*did* have a live Mermaid block → OMIFlow.)

**2. A raw `<style>` block at the top of the source.** First migrated chapter to
carry author CSS. Dropped rather than ported — it's presentation chrome, and raw
`<style>` would be inappropriate in the consumer MDX. The wide tables fall back to
the tracked #198 residual on mobile.

**3. Two `<` math traps.** `$m_A = 1.0 < m_B = 6.0$` and a `$> 100~\text{Gyr}$`
table cell would trip the author-trap lint (raw `<`/`>` before a digit). Reworded
to "smaller than" and "over 100 Gyr" respectively.

## Platform issues to file

1. **Gap: `<Video>`** — still unbuilt; this chapter's two videos are Callout links.
2. **Tracked residual #198** — wide reference tables (7-column main-sequence
   properties) hit `scrollable-region-focusable` at 375px. Desktop axe (the
   acceptance gate) is clean in light + dark.

## Success criteria

- ✅ Full reading + `practice.mdx` migrated truthfully (front matter, Parts 1–5,
  Reference Tables, Summary, O→M→I chain, 12 practice problems).
- ✅ Registries scaffolded: unit JSON (order 5), 8 new `figures.ts` entries +
  assets, 2 new equation entities.
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 11 figures, 0 broken; 405
  KaTeX; OMIFlow 1/1/1; 3 WorkedExample numerical + 3 DimCheck; 1 intervention;
  16 glossary terms; no leaked MDX or `<style>`; both new cards render; the
  hr-diagram sidebar reads L1→L2→L3→L4→L5; axe **0 violations desktop, light + dark**.
- ✅ ADR 0086: HRD + Main sequence canonical here (no collision with M2-L3 Kirchhoff).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
