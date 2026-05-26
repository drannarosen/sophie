---
title: 'Pilot report: ASTR 201 Module 1 Lecture 1 — Spoiler Alerts'
short_title: 'Pilot: M1-L1 Spoiler Alerts'
description: 'Fifth ADR 0064 chapter migration and the first OMI-spine chapter — the Module 1 opener and course-thesis "trailer." First use of framing:"OMI" with multiple <OMIFlow> blocks (8 spoilers), exercising the OF-1/OF-2 audit invariants end-to-end.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

The **fifth** chapter migration under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md), and the **first to
declare `framing:"OMI"`** and render the Observable→Model→Inference spine with
multiple standalone `<OMIFlow>` blocks. It converts **ASTR 201 Module 1 Lecture
1 — "Spoiler Alerts"** from Quarto `.qmd` into a Sophie MDX reading in the
astr201 consumer repo at
`src/content/sections/foundations/units/lecture-01-spoiler-alerts/`. This is the
Module 1 opener — the wonder-first "movie trailer" for the whole course, whose
explicit thesis (*pretty pictures → measurements → models → inferences*) **is**
the OMI method. It sits alongside the already-migrated
M1-L2 "Tools of the Trade" in the `foundations` section.

**Structural profile.** A fifth distinct profile — the OMI keystone:

| Pilot | Dominant profile |
| --- | --- |
| m2-l3 Spectra & Composition | OMI spine + GlossaryTerm density |
| m3-l2 Hydrostatic Equilibrium | equation / derivation / worked-example density |
| m2-l2 Surface Flux & Colors | multi-representation (`<MultiRep>`) + visual/scaling |
| m3-l3 Nuclear Fusion | figure-dense conceptual physics (20 figures) |
| **m1-l1 Spoiler Alerts** | **narrative trailer; OMI-as-spine (`framing:"OMI"`, 8 `<OMIFlow>`) + 19 figures** |

Source `astr201-sp26/` was read-only. Scope: full reading (§1.1–1.6 + Quick
Practice + Self-Assessment), a sibling `practice.mdx` (9 problems), 2 **new**
equation registry entities, **19 figures** (16 new + 3 shared with M2-L2), 2
`<WorkedExample>`, **8 `<OMIFlow>`**, 1 misconception + intervention, 3
`<RetrievalPrompt>`, 1 `<Predict>`, and 10 GlossaryTerms. **No PR opened** —
built + verified locally, awaiting HITL sign-off.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `learning-objectives:` + `## Learning Objectives` | `<LearningObjectives>` + `<Objective>` | ✅ | 5 objectives. |
| `{{< fig >}}` | `<Figure name>` | ✅ | **19 figures** (NASA/JWST/Rubin/DESI imagery + course illustrations). 16 new registry entries; 3 (`decoder-ring`, `em-spectrum-temperature`, `energy-wavelength-connection`) **already shared with M2-L2** and referenced by name. |
| `{{< include eq >}}` + `{{< eqrefcard >}}` | `<KeyEquation refId>` + registry | ✅ | 2 **new** entities (`wave-relation`, `photon-energy`); `wien-displacement` + `flux-luminosity-distance` reused (already cited by M2-L2). |
| The 10-image **spoiler reel** (measure / infer / physics) | `<OMIFlow>` ×8 + `<Callout>` ×2 | ✅ | Spoilers 1–8 are clean 1-observable/1-model/1-inference → `<OMIFlow>` (slots reordered to O→M→I per OF-1). Spoilers 9–10 are genuinely **multi-observable** (velocities + lensing; distances + redshifts) → `<Callout>` with bold-label prose, per the OF-1 rule. `framing:"OMI"` declared (OF-2 satisfied). |
| `.callout-worked-example` ×2 | `<WorkedExample>` | ✅ | Visible-light frequencies; photon-energy ratio. Each: `.Problem` / `.Step` / `.DimCheck` / `.Result` (WE-1/WE-2 clean). |
| `.callout-check-yourself` (conceptual) | `<RetrievalPrompt>` | ✅ | 3 (four-observables, measurement-vs-inference, EM spectrum) — satisfies RET-1. |
| `.callout-check-yourself` (math) | `<Callout variant="tip">` + `<Dropdown>` | ✅ | inverse-square 9×, spectroscopy power, radio-vs-visible. |
| `.callout-prediction` | `<Predict>` | ✅ | 1 (nebula colors — conceptual, math-light). |
| `.callout-misconception` | `<Callout variant="misconception">` + `<Intervention>` | ✅ | 1 ("astronomy is just looking through telescopes"). |
| `.callout-roadmap` | `<Callout variant="roadmap">` | ✅ | Lecture roadmap, spoiler-reel roadmap, course-arc preview. |
| `.callout-summary` / `.callout-note` / `.callout-why-this-matters` | `<Callout variant="info">` | ✅ | Checkpoints, "first exposure" note, "not Astro 101." |
| `.callout-important` (four-observables toolkit) / `.callout-key-insight` | `<Callout variant="key-insight">` | ✅ | |
| `.callout-the-more-you-know` | `<Callout variant="the-more-you-know">` | ✅ | Planck's constant enrichment. |
| `.column-margin` (definitions) | `<Aside kind="definition">` + `<GlossaryTerm>` | ✅ | 10 paired terms (see below). |
| `.column-margin` (side-notes) | `<Aside kind="digression">` | ✅ | "Why c", Hertz, Doppler preview, JWST superpower, etc. |
| `{{< term photon >}}` | `<GlossaryTerm>` + `<Aside kind="definition">` | ✅ | |
| Quick-Practice solutions (`collapse`) | folded as collapsible `<Dropdown>` in reading | ✅ | **decision 0001 §4** — lecture-level solutions fold into the reading. |
| 9 graded Practice Problems | separate `practice.mdx` | ✅ | decision 0001 §6; the separate `-solutions.qmd` is an assessment concern and was **not** migrated. |

## Pedagogy structure map

**Eight-role (ADR 0058):** *observable / model / inference* — **8 `<OMIFlow>`**
arcs (the chapter spine) plus the `<Observable>` biographies of the 2 new
equations. *assumption / approximation* — `<Assumption>` + `<BreaksWhen>` on
`wave-relation` (vacuum propagation; medium dispersion) and `photon-energy`
(quantization; classical-wave limit). *misconception* — 1 `<Callout
variant="misconception">` + `<Intervention>` + `<CommonMisuse>` on both new
equations. *numerical* — 2 `<WorkedExample>` (both with DimCheck).

**OMIFlow + `framing:"OMI"`:** the first chapter to use it. Eight spoilers map to
strict-3 `<OMIFlow>`; the two multi-observable spoilers stay as `<Callout>` (OF-1
honored), and OF-2 (`framing:"OMI"` requires ≥1 OMIFlow) is satisfied 8×.

**GlossaryTerms (10):** Inference, Observable, Flux, Luminosity, Model, Standard
candle, Spectroscopy, Doppler effect, Photon, Lookback time — each paired with a
definition `<Aside>` (D4/D5 bidirectional clean).

## Pedagogical decisions log

- **OMI-as-spine (Anna's call, 2026-05-26).** This is the course's foundational
  OMI chapter, so the spoiler reel's measure/infer/physics triads render as
  `<OMIFlow>` rather than faithful bold-label prose — making the spine
  machine-legible and auto-populating the Library OMI rooms. The cost (a slight
  measure/physics/infer → O/M/I reordering, ~24 Library entries) was accepted.
- **Multi-observable spoilers stay prose.** Spoilers 9 (dark universe) and 10
  (cosmic history) chain several observables, so forcing them into strict-3
  `<OMIFlow>` would violate OF-1; they keep the source's bold-label structure
  inside a `<Callout>`.
- **3 shared figures, not duplicated.** `decoder-ring`,
  `em-spectrum-temperature`, and `energy-wavelength-connection` were already in
  `figures.ts` (used by M2-L2). The shared registry is keyed by `name`, so the
  chapter references them directly — no move, no duplicate entry.
- **2 new equation entities; 2 reused.** `wave-relation` and `photon-energy`
  authored fresh with full biographies; `wien-displacement` (Wien's-Law
  deep-dive) and `flux-luminosity-distance` (inverse-square deep-dive) kept as
  faithful inline `$$` display math — both entities already exist and are cited
  by M2-L2, so no R2 warning.
- **Quick-Practice solutions folded** as a collapsible `<Dropdown>` (decision
  0001 §4); the 9 graded problems split to `practice.mdx` (§6); glossary terms
  added per the standing instruction.

## Time spent per phase

Conversion-dominated; the hardened platform absorbed everything.

| Phase | Notes |
|---|---|
| Inventory + figure survey | 19 figures confirmed on disk; 3 already registered (shared with M2-L2); 2 of 3 equation includes new; no Video. |
| Gap-check + HITL gate | Presented mapping; Anna chose OMI-as-spine before conversion. |
| Scaffold (16 figures, 2 equations, stub) | Stub built first (F4/R2 warnings expected) to validate wiring. |
| Reading conversion (full) | §1.1–1.6 + 8 OMIFlow + 2 WorkedExamples + folded Quick Practice. |
| `practice.mdx` | Small (9 problems). |
| Verification | biome / typecheck / build / axe (desktop light+dark) / browser render-integrity. |

## Surprises

1. **`framing:"OMI"` + 8 OMIFlow blocks built clean on the first full pass.**
   OF-1 (slot source-order) and OF-2 (framing requires ≥1 OMIFlow) produced **no
   findings** — the O→M→I slot reordering held across all 8 spoilers, and the
   two multi-observable spoilers correctly stayed as `<Callout>`.
2. **The stub-build's F4/R2 warnings cleanly inverted on full conversion.** All
   16 new figure entries went from "declared, unused" to used, and both new
   equations from "declared, uncited" to cited via `<KeyEquation>` — zero
   residual registry warnings.
3. **Lazy-loaded figures look "broken" to a naive `naturalWidth` probe.** All 19
   `<Figure>` images carry `loading="lazy"`; only the above-the-fold figure has
   `naturalWidth > 0` until scrolled. HEAD fetches returned 200 for all, and
   force-eager-loading cleared every false positive — a render-integrity check
   must force-load or scroll, not trust `naturalWidth` at load time.
4. **OMIFlow renders `data-omi-role`, not `data-epistemic-role`,** on its slots
   — worth recording for future render-integrity probes (8/8/8 confirmed).
5. **No new platform findings.** Only the already-tracked mobile
   `scrollable-region-focusable` (#198) residual applies; desktop is clean.

## Recommendations + ADR backlog

- The playbook remains steady-state: a fifth chapter, the first to exercise the
  full OMI-spine path, converted with **zero new platform issues**.
- Carry-over open items unchanged: `<Video>` (still unbuilt; not needed here),
  Track-A/Track-B `<DifficultyPath>`, and the mobile a11y residual (#198).
- Next candidates: M1-L3 Gravity & Orbits (continues the Module 1 chain) or M2-L1
  Distance & Parallax.

## Platform issues to file

**None new.** The mobile `scrollable-region-focusable` residual is already
tracked as [#198](https://github.com/drannarosen/sophie/issues/198).

## Success criteria

- ✅ Full reading migrated truthfully (§1.1–1.6 + Quick Practice + Self-Assessment).
- ✅ First OMI-spine chapter: `framing:"OMI"` + 8 `<OMIFlow>` (OF-1/OF-2 clean); 2 multi-observable spoilers correctly kept as `<Callout>`.
- ✅ 2 new equation registry entities (`wave-relation`, `photon-energy`) with biographies, both cited; 2 reused.
- ✅ 19 figures registered + rendering (0 broken after force-load); 3 shared with M2-L2, not duplicated.
- ✅ 2 `<WorkedExample>` (with DimCheck — WE invariants clean); 3 `<RetrievalPrompt>` (RET-1); 1 `<Predict>`; 1 misconception w/ intervention; 10 GlossaryTerms (D4/D5 clean).
- ✅ `pnpm build` **0 errors, 0 warnings** (18 benign infos); `astro check` 0/0/0; Biome clean; author-trap lint clean.
- ✅ axe-core **0 violations desktop light + dark** at 1280px; render integrity (148 KaTeX, 19 figures, no leaked MDX, no hydration errors — only the favicon 404).
- ⚠️ Mobile `scrollable-region-focusable` — the tracked #198 platform residual, not a chapter defect.
- ⚠️ `practice.mdx` authored; emits the expected #189 unrouted-warning.
- ⬚ Not committed/PR'd — awaiting HITL sign-off.
