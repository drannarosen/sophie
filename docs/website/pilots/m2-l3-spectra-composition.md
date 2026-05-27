---
title: 'Pilot report: ASTR 201 Module 2 Lecture 3 — Spectra & Composition (consumer migration)'
short_title: 'Pilot: M2-L3 Spectra & Composition'
description: 'Production migration of ASTR 201 Lecture 3 (Spectra & Composition) from Quarto into the astr201 consumer repo. First consumer chapter to add a new equation entity (equilibrium-temperature) and to exercise ADR 0086 multi-chapter glossary collisions. Supersedes the original smoke-example pilot (recoverable in git history).'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

:::{note} This report supersedes the original smoke-example pilot
The earlier version of this file documented the **2026-05-20 smoke-example
pilot** — the worked example that became the evidence base for
[ADR 0064](../decisions/0064-chapter-migration-playbook.md) and the motivating
chapter for [ADR 0063](../decisions/0063-omiflow-composite-primitive.md)
`<OMIFlow>`. That migration targeted `examples/smoke` and used the pre-maturity
approach (framing:"OMI" with 5 OMIFlow chains; `<WorkedExample>` not yet built;
no equation-registry entity for equilibrium temperature). It is recoverable from
git history (the smoke pilot was last the live content before this commit). This
report documents the **production migration into the astr201 consumer repo**,
which deliberately diverges from the smoke pilot in several places (see § *Pedagogy
structure map*).
:::

## Pilot context

Production migration of **ASTR 201 Module 2 Lecture 3 — "Spectra & Composition"**
from its Quarto `.qmd` source into a Sophie MDX reading in the **astr201 consumer
repo** at
`src/content/sections/hr-diagram/units/lecture-03-spectra-and-composition/`. It
lands in the `hr-diagram` section at **order 3**, after M2-L1 (Distance &
Parallax) and M2-L2 (Surface Flux & Colors), completing the Module 2 spectroscopy
rung of the inference chain. Source `astr201-sp26/` was read-only. Scope: full
reading (front matter + Parts 1–7 + Summary + Self-Assessment + Key Equations /
Constants tables + Glossary) plus a sibling `practice.mdx` with all 9 graded
problems (decision 0001 §6).

**Two blockers cleared before conversion.** This session began after astr201 was
synced to current Sophie `main`, which surfaced two halts:

1. **CourseSpec v0.1 → v0.2 drift.** `course.sophie.yaml` still used
   `assessment.grade_weights` (removed in the [ADR 0080](../decisions/0080-course-spec-format-v0-1.md)
   Amendment 2 clean break). Migrated to the top-level `grading.categories` block
   (weights summing to 1.0) + `grading.letter_scale` + `assessment.category_refs`;
   `spec_version` stays `"0.1"` (additive amendment, not a version bump).
2. **`@sophie/astro` route-exports gap (platform fix).** The course-info-projection
   sprint added three injected route dispatchers (`course-landing`,
   `section-landing`, `info-page`) but never wired their `exports` subpaths in
   `packages/astro/package.json`. Node's closed-allowlist `exports` resolution
   meant the astr201 packed-copy build ENOENT'd on `section-landing.astro`. Fixed
   in **[Sophie PR #203](https://github.com/drannarosen/sophie/pull/203)** (3
   exports keys + a regression test that derives the injected-route set from
   `integration.ts` and asserts exports-completeness). Two pre-existing
   same-sprint drift artifacts (`validation.md` regen; `course-info-schema.md`
   missing page-status frontmatter) were cleared directly on `main` to green CI.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 15 figures: 10 new (added to `figures.ts` + assets copied), 5 reused by name (`three-types-of-spectra`, `hydrogen-absorption`, `hydrogen-emission`, `altair-spectrum-annotated`, `rayleigh-scattering-sky`) — owned by M1-L1/M1-L4. |
| `{{< include _includes/equations/X.qmd >}}` | `<KeyEquation refId="X">` | ✅ direct | 3 reused entities (`bohr-energy`, `photon-energy`, `doppler-shift`). |
| (derived inline, no include) planetary `T_eq` | **new entity** `equilibrium-temperature` | ✅ new | Part 6's named, formula-sheet equation. Authored with full biography (Observable / 3 Assumptions / 4 DerivationSteps / BreaksWhen / CommonMisuse) and the 279 K ratio-method form as a `rearranged_form`. Boltzmann distribution stayed inline (qualitative scaling, not a clean entity). |
| `{{< video URL >}}` | `<Callout variant="info">` + external link | ✅ decided | One JWST/exoplanets video → a Callout link (the `<Video>` component is still unbuilt; raw iframes fail axe `frame-title`). |
| `:::{.callout-important}` (Big Idea, Connections) | `<Callout variant="key-insight">` | ✅ direct | |
| `:::{.callout-warning}` "Two Myths…" / "Common Confusions" | `<Callout variant="misconception">` + `<Intervention type="refutation-text">` | ✅ semantic remap | 7 misconceptions total, each with a **distinct title** so the `addresses` slugs don't collide. |
| `:::{.callout-note}` "Observable → Model → Inference" | `<OMIFlow>` | ✅ direct | 2 clean 1-obs/1-model/1-inf arcs (Kirchhoff, Doppler). |
| `:::{.callout-tip}` Quick Check + collapse answers | `<Callout variant="tip">` + `<Dropdown label="Answers">` | ✅ direct | Math renders in the Dropdown children. |
| `:::{.callout-tip}` "Predict First" / "Think First" | `<Predict>` | ✅ direct | 2 `<Predict>` (Balmer-strength, greenhouse). |
| `:::{.callout-note collapse}` Enrichment (Track B) | `<Callout variant="deep-dive">` | ✅ direct | Harvard Computers, MK system, N₂/O₂, sky-blue. |
| `:::{.spectrum-clue}` "Spectrum Detective — Clue N" | `<Callout variant="key-insight" title="Spectrum Detective — Clue N">` | ✅ motif preserved | The recurring detective motif (Clues 0–3 + Case Closed) carried as titled key-insight callouts. |
| `:::{.callout-note}` "Worked Example N" | `<WorkedExample>` (`.Problem` / `.Step` / `.DimCheck` / `.Result`) | ✅ direct | 5 worked examples; all 5 carry a `.DimCheck`. (The smoke pilot had to approximate these with deep-dive callouts — the component now exists.) |
| "Learning Objectives" header + bullets | `<LearningObjectives>` + `<Objective>` | ✅ direct | 8 objectives. |
| inline glossary (13-term Glossary section) | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ direct | 16 definition asides (the 13 source terms + Spectrum, Photosphere, Boltzmann distribution). |
| `- [ ]` self-assessment task list | `- ☐ ` bulleted list (ballot-box glyph) | ✅ a11y remap | GFM task-lists render `<input type=checkbox disabled>` with no label → axe `label` violation. The ballot-box glyph preserves the checklist appearance with no form control. |

## Pedagogy structure map

### OMI arcs — deliberate divergence from the smoke pilot

The smoke pilot declared `framing:"OMI"` and expanded to **5 OMIFlow chains**
(treating composition, temperature, and climate as separate arcs). The consumer
migration is **not** OMI-framed: the chapter's spine is its 7 Parts, with OMI as a
recurring *motif* (the "Spectrum Detective" clues), not the organizing structure.
Per [ADR 0063](../decisions/0063-omiflow-composite-primitive.md) OF-1 strict-3,
only the **2 genuinely clean 1-observable / 1-model / 1-inference arcs** are
`<OMIFlow>`; the others are prose + the Summary table.

| Arc | Observable | Model | Inference | `<OMIFlow id=…>` |
|---|---|---|---|---|
| Kirchhoff's third law | Dark lines at specific wavelengths | Cool gas in front of a hotter continuum absorbs | Two-layer star: photosphere + cooler atmosphere | `omi-kirchhoff-absorption` |
| Radial velocity | All lines shifted by the same fractional amount | Non-relativistic Doppler Δλ/λ₀ = vᵣ/c | Line-of-sight velocity (binary-mass bridge) | `omi-doppler-velocity` |

Composition, temperature, and the climate energy-balance arc are carried as prose
+ worked examples + the Summary "Observable → Model → Inference" table — they are
multi-observable or application-shaped, not strict-3, so forcing them into
`<OMIFlow>` would have failed OF-1.

### Eight-role component-mapping (ADR 0058)

- **observable / model / inference** — the 2 OMIFlow chains + the equation-registry
  `<Observable>` biographies (`equilibrium-temperature`, reused `doppler-shift` etc.).
- **assumption** — 3 `<Assumption>` children in `equilibrium-temperature.mdx`
  (energy-balance, blackbody, rapid-redistribution).
- **misconception** — 7 `<Callout variant="misconception">` + `<Intervention>` pairs.
- **numerical** — 5 `<WorkedExample>` `.DimCheck` slots (`data-epistemic-role="numerical"`).
- **approximation / uncertainty** — the `hc ≈ 1240 eV·nm` shortcut and the
  Boltzmann order-of-magnitude estimate stay as prose tools; not modeled as components.

### Glossary collisions (ADR 0086)

First consumer chapter to lean on [ADR 0086](../decisions/0086-multi-chapter-glossary-definitions.md)
multi-chapter definitions. `foundations` (M1-L4) already defines **Albedo**, **Bohr
model**, and **Kirchhoff's laws**. All three are re-defined locally here (no more
"unwrap to plain text"). **Kirchhoff's laws is marked `canonical`** — this is the
Kirchhoff chapter (Part 1 is entirely Kirchhoff), so its wording becomes the
`/library/glossary` representative. Albedo and Bohr model are re-defined
non-canonical (foundations stays first-accumulated representative).

## Pedagogical decisions log

- **Non-OMI framing** (vs. the smoke pilot's `framing:"OMI"`): the 7-Part spine is
  the real structure; 2 OMIFlow for the strict-3 arcs only.
- **New `equilibrium-temperature` entity** authored rather than left inline — it's a
  named formula-sheet equation with a clean epistemic biography, and the πR² disk vs.
  4πR² sphere subtlety + the `(1−A)` factor are exactly the `<CommonMisuse>` worth
  encoding. The 279 K ratio shortcut is a `rearranged_form`.
- **Kirchhoff canonical here** (ADR 0086) — confirmed with Anna at the gate.
- **Video → Callout link**, not an embed (`<Video>` unbuilt; iframe fails axe).
- **Self-assessment `- [ ]` → `- ☐ `** to clear the axe `label` violation that GFM
  task-lists introduce, while preserving the checklist affordance.
- **Two near-duplicate misconceptions kept** (spectral-type-≠-composition and
  redshift-≠-red appear in both "Two Myths" and "Common Confusions") — faithful to
  the source; given distinct titles so the `addresses` slugs don't collide.

## Surprises

**1. The route-exports gap was invisible to Sophie's own CI.** Sophie's workspace
build resolves `@sophie/astro/routes/*` differently than a *packaged* consumer, so
the missing `exports` keys passed every Sophie gate and only broke the astr201
packed-copy build. The `packed-smoke` CI job is the one that exercises this path; the
PR #203 regression test now derives the injected-route set from source so a future
injected-but-unexported route fails CI rather than only a downstream consumer.

**2. One sprint left `main` red on two checks at once.** The same course-info sprint
that shipped the v0.2 CourseSpec also left `validation.md` stale (unit test I3) *and*
`course-info-schema.md` without page-status frontmatter (lint:status / ADR 0062).
Both were cleared directly on `main` (registry/docs updates) before the route-exports
PR could go green. Lesson: `gh pr checks` early — local biome-on-changed-files is not
the full CI `lint` job.

**3. GFM task-lists are an axe trap.** `- [ ]` renders a disabled, label-less
checkbox — a critical `label` violation ×10 for a 10-item checklist. No prior
consumer reading used task-list syntax, so this surfaced fresh here. The ballot-box
glyph (`☐`) is the clean, faithful substitute.

## Platform issues to file

Carried forward from the smoke pilot; status re-checked this session.

1. **Gap: `<Video>` component.** Still unbuilt; this chapter's one video is a Callout
   link. No consumer migration has forced it yet ("update videos later").
2. **Tracked residual #198:** `scrollable-region-focusable` at 375px on wide
   equation/summary tables. Desktop axe (the acceptance gate) is clean in light + dark.
3. **Doc-citation drift (new):** this overwrite means AGENTS.md's "worked-example
   pilot at pilots/m2-l3-spectra-composition.md" and the m2-l2 report's prior-pilot
   table now point to a consumer report rather than the smoke pilot. Worth a one-line
   touch-up if the smoke-pilot provenance matters to those references.

## Success criteria

- ✅ Full reading + `practice.mdx` migrated truthfully (front matter, Parts 1–7,
  Summary, Self-Assessment, Key Equations / Constants, Glossary, 9 practice problems).
- ✅ Section/unit/figure/equation registries scaffolded: unit JSON manifest (order 3),
  10 new `figures.ts` entries + assets, new `equilibrium-temperature` entity.
- ✅ `biome check` clean; `astro check` 0 errors / 0 warnings / 0 hints; `pnpm build`
  0 errors / 0 warnings (benign practice-unrouted only).
- ✅ Rendered-page gate: console = favicon 404 only (no hydration / React #418); 17
  figures, 0 broken; 339 KaTeX; OMIFlow 2/2/2 slots; 5 WorkedExample numerical +
  5 DimCheck; no leaked MDX; axe **0 violations desktop 1280px, light AND dark**.
- ✅ ADR 0086 canonical Kirchhoff definition renders; 16 glossary terms; 7
  misconception interventions; equilibrium-temperature KeyEquation card.
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/` (read-only design source).
