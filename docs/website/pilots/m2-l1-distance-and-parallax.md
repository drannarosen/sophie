---
title: 'Pilot report: ASTR 201 Module 2 Lecture 1 — Distance & Parallax'
short_title: 'Pilot: M2-L1 Distance & Parallax'
description: 'Eighth ADR 0064 chapter migration and the Module 2 opener — a second framing:"OMI" chapter. Reuses flux-luminosity-distance and the M1-L1 distance-ladder figures, authors three parallax/geometry entities, and renders two OMI inference chains.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

The **eighth** chapter migration under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md), and the **first
Module 2 lecture migrated since the pilot phase** (joining the already-present
M2-L2 Surface Flux & Colors). It converts **ASTR 201 Module 2 Lecture 1 —
"Distance & Parallax"** from Quarto `.qmd` into a Sophie MDX reading at
`src/content/sections/hr-diagram/units/lecture-01-distance-and-parallax/`,
opening the HR-diagram module (L1 Distance & Parallax → L2 Surface Flux & Colors).

**Structural profile.** A parallax/inverse-square geometry chapter (1,075 lines,
11 figures, 4 equation includes, Parts 1–7) that is **organized around the
Observable→Model→Inference framework** — Part 1 introduces it explicitly and the
Summary closes with it. This is the **second `framing:"OMI"` chapter** (after
M1-L1), but where M1-L1 was OMI-as-trailer, here OMI is the method threading a
single inference (parallax → distance → luminosity).

Source `astr201-sp26/` was read-only. Scope: full reading (Parts 1–7 + Summary +
Self-Assessment), a sibling `practice.mdx` (7 problems), **3 new** equation
entities + **1 reused**, 11 figures (9 new + 2 shared with M1-L1), 4
`<WorkedExample>`, 2 `<OMIFlow>`, 4 misconceptions + interventions, ~8
GlossaryTerms. **No PR opened** — built + verified locally, awaiting HITL sign-off.

## Registry continuity (the running theme)

| Entity | Status | Notes |
|---|---|---|
| `flux-luminosity-distance` | reused | authored for M2-L2, referenced in M1-L1; *derived two ways* here (concentric spheres + dimensional analysis) |
| `small-angle` | **new** | $s = \alpha d$ |
| `parallax-general` | **new** | $d = b/p$ (any baseline) |
| `parallax-parsec` | **new** | $d_{\rm pc} = 1/p_{\rm arcsec}$ (Earth baseline) |

Figures `cosmic-distance-ladder` and `standard-candles` — authored for M1-L1's
spoiler reel — are reused here for the real distance-ladder treatment (referenced
by name, not duplicated). *Flux*, *Luminosity*, and *Standard candle* glossary
terms are owned by M1-L1 and referenced as plain text.

## Pedagogical decisions log

- **Two `<OMIFlow>` chains under `framing:"OMI"`:** parallax angle → parallax
  geometry → distance (Part 4), and flux + distance → inverse-square law →
  luminosity (Part 6). The Summary keeps the source's 3-row OMI table.
- **The Part-4 parallax `<iframe>` demo → a `<Callout>` link.** A raw `<iframe>`
  has no `title` attribute and would fail axe's `frame-title` check (and raises
  CSP questions for an external cross-course embed), so it became a tip callout
  linking to the demo — preserving the "play first" pedagogy without the a11y risk.
- **Four misconceptions + interventions** (arcseconds-measure-distance,
  parallax-is-angular-size, p-is-the-full-shift, flux-equals-luminosity), each
  distinctly titled so the `addresses` slugs are unique.
- **Enrichment/Explore boxes preserved** as `<Callout variant="the-more-you-know">`
  (3D solar-neighborhood + massive-star maps, textbook parallax geometry, the
  Hipparcos→Gaia history, the dust-extinction explore) — migrate-truthfully.

## Surprises

1. **A misconception declared with the wrong `variant` orphans its intervention.**
   The flux-vs-luminosity box was authored as `variant="warning"` with a
   `<Intervention addresses="misconception-flux-equals-luminosity">` inside — but
   only `variant="misconception"` *declares* the slug, so the I1 audit flagged the
   intervention as referencing an undeclared misconception. Fix: switch the
   variant to `misconception`. (Lesson: an Intervention's `addresses` must match a
   `variant="misconception"` Callout title, not a `warning`.)
2. **Dropping Enrichment/Explore boxes shows up as F4.** An initial pass omitted
   three collapsible boxes to keep the reading tight; the build's F4 audit
   (figure declared, zero usages) caught all three unused figures, which doubled
   as a migrate-truthfully check. Restoring the boxes cleared F4 *and* the
   fidelity gap.
3. **Clean desktop axe again** — no #198 (the tables here are narrow), 0 violations
   light + dark.
4. **Glossary collision scan + scaffold-step unit JSON paid off** — only Flux /
   Luminosity / Standard candle collided (all referenced), and the hr-diagram
   sidebar showed L1→L2 immediately.

## Verification

- `pnpm exec biome check src/content` → clean.
- `pnpm typecheck` (astro check) → **0 / 0 / 0**.
- `pnpm build` → **0 errors, 0 warnings** (33 benign infos).
- Browser (desktop 1280px): console = favicon 404 only; 11/11 figures load (0 broken);
  **235 KaTeX**; 2 `<OMIFlow>` (2/2/2 slots); 4 `<WorkedExample>` (numerical + dim-check);
  no leaked MDX; no raw iframe; no hydration errors. hr-diagram sidebar order L1→L2.
- axe-core desktop light **+** dark: **0 violations**.

## Platform issues to file

**None new.**

## Success criteria

- ✅ Full reading migrated truthfully (Parts 1–7 + Summary + Self-Assessment), all Enrichment/Explore boxes preserved.
- ✅ Second `framing:"OMI"` chapter; 2 `<OMIFlow>` inference chains.
- ✅ 3 new equation entities + 1 reused (derived two ways); 11 figures (2 shared with M1-L1, referenced).
- ✅ 4 `<WorkedExample>` (DimCheck clean); 4 misconceptions + interventions; 1 `<RetrievalPrompt>`; 3 `<Predict>`; ~8 GlossaryTerms (D4/D5 clean; 3 referenced cross-chapter).
- ✅ Sidebar: unit JSON manifest authored in scaffold step; hr-diagram nav L1→L2.
- ✅ `pnpm build` 0/0; `astro check` 0/0/0; Biome clean; author-trap lint clean.
- ✅ axe desktop light + dark: **0 violations**.
- ⚠️ `practice.mdx` authored; emits the expected #189 unrouted-warning.
- ⬚ Not committed/PR'd — awaiting HITL sign-off.
