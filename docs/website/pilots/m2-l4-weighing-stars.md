---
title: 'Pilot report: ASTR 201 Module 2 Lecture 4 — Weighing Stars'
short_title: 'Pilot: M2-L4 Weighing Stars'
description: 'Production migration of ASTR 201 Lecture 4 (Weighing Stars) from Quarto into the astr201 consumer repo. Completes the Module 2 inference chain (distance to luminosity to temperature to composition to mass). Adds 3 new equation entities (kepler-binary, center-of-mass, mass-luminosity) and resolves two source constructs new to the playbook: the eqrefcard shortcode and an in-reading Mermaid diagram.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

Production migration of **ASTR 201 Module 2 Lecture 4 — "The Last Piece: Weighing
Stars"** from Quarto `.qmd` into a Sophie MDX reading in the **astr201 consumer
repo** at `src/content/sections/hr-diagram/units/lecture-04-weighing-stars/`. It
lands in the `hr-diagram` section at **order 4**, completing Module 2's inference
chain — distance (L1) → luminosity, temperature, radius (L2) → composition,
radial velocity (L3) → **mass (L4)**. Source `astr201-sp26/` was read-only.
Scope: full reading (front matter + Parts 1–4 + the closing O→M→I section +
Summary) plus a sibling `practice.mdx` with all 11 graded problems (decision
0001 §6).

This is the fourth consumer chapter under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md) and the first to use
the mature post-blocker pipeline end-to-end (CourseSpec v0.2 in place, the
`@sophie/astro` route-exports fix landed in [PR #203](https://github.com/drannarosen/sophie/pull/203)).

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` / `{{< img ID >}}` | `<Figure name="ID">` | ✅ direct | 8 figures, all new (registry entries + assets). The `{{< img >}}` pair (Sirius Hubble + orbit) in a `layout-ncol=2` becomes two stacked `<Figure>` (Sophie has no column-layout primitive; stacking reads fine). |
| `{{< include …/X.qmd >}}` **+** `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | **New `eqrefcard` shortcode** (not seen in prior migrations): it *is* the ref-card render, so include + eqrefcard collapse into one `<KeyEquation>`. |
| 4 equation includes | **3 new entities** | ✅ + judgment | `kepler-binary`, `center-of-mass`, `mass-luminosity` authored. The 4th include, `kepler-solar`, is `kepler-binary` in solar units → folded in as a **rearranged_form** of `kepler-binary` (matches the stefan-boltzmann solar-unit precedent) rather than a separate entity. |
| ` ```{mermaid} ` O→M→I graph | `<OMIFlow>` + prose cascade | ✅ remap | Sophie has no in-reading Mermaid renderer. The closing "Observable→Model→Inference: The Binary Star Chain" section is already a clean O/M/I statement → one `<OMIFlow>`; the I1→I4 inference cascade preserved as prose. The Mermaid is dropped (verified: no `graph TD` leaks to the page). |
| `:::{.callout-important}` | `<Callout variant="key-insight">` | ✅ direct | Big Idea, "Mass as the Master Variable", "Module 2 chain complete", "Did your prediction land?". |
| `:::{.mass-detective}` motif | `<Callout variant="key-insight" title="Mass Detective — …">` | ✅ motif preserved | Case Opened, Clues 1–3, Case Closed (5×) — the detective motif carried as titled key-insight callouts, mirroring M2-L3's Spectrum Detective. |
| `:::{.callout-tip}` Predict/Think/Check + collapse | `<Callout variant="tip">` + `<Dropdown label="Answer">` | ✅ direct | All prompt-with-answer boxes; math renders in the Dropdown. No `<Predict>` this chapter (every prompt has a worked answer with math, which Predict's string props can't carry). |
| `:::{.callout-warning}` (Single/Double-lined, Inclination Problem) | `<Callout variant="warning">` | ✅ direct | These are clarifications, not misconceptions — **no `<Intervention>` used** (the source has no misconception boxes; none invented). |
| `:::{.callout-note collapse}` Enrichment | `<Callout variant="deep-dive">` | ✅ direct | Sirius dark companion; the SB1 mass function. |
| interactive demo links | `<Callout variant="tip">` + external link | ✅ direct | Binary-orbits demo link (no embed). |
| "Worked Example: …" | `<WorkedExample>` (`.Problem`/`.Step`/`.DimCheck`/`.Result`) | ✅ direct | 1 worked example (Weighing a Spectroscopic Binary); unit check → `.DimCheck`, sanity check → `.Result`. |
| inline technical terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | Source has no Glossary section; 12 definition asides added for genuinely-defined terms. **Radial velocity referenced, not redefined** (M2-L3 owns it — ADR 0086 collision avoided by not wrapping). |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"` in frontmatter) — the spine is Parts 1–4. One
`<OMIFlow>` (`omi-binary-masses`) for the closing binary-mass chain, passing
[ADR 0063](../decisions/0063-omiflow-composite-primitive.md) OF-1 strict-3:
Observable = periodic line shifts (+ eclipse dips); Model = two-body Newtonian
orbit + center of mass; Inference = individual masses → mass-luminosity relation.

### Eight-role component-mapping (ADR 0058)

- **observable / model / inference** — the OMIFlow chain + equation-registry
  `<Observable>` biographies on all three new entities.
- **assumption** — `<Assumption>` children: two-body-Newtonian and dominant-mass
  promotion (`kepler-binary`), isolated-two-body (`center-of-mass`), main-sequence
  (`mass-luminosity`).
- **numerical** — the one `<WorkedExample>` `.DimCheck` (`data-epistemic-role="numerical"`).
- **misconception** — none (the source carries no misconception boxes).

### Equation registry

Three new entities. `kepler-binary` carries two rearranged forms (total-mass
solve and the solar-unit working form); `center-of-mass` carries the
mass-ratio-from-orbits and mass-ratio-from-velocities forms; `mass-luminosity`
carries the mass-from-luminosity inverse and the $t_{\text{MS}} \propto M^{-2.5}$
lifetime scaling. Cross-refs: `kepler-binary` derives-from the existing
`kepler-third-law`; `mass-luminosity` derives-from `kepler-binary` (binaries
calibrate the relation) and see-also `stefan-boltzmann`.

## Pedagogical decisions log

- **kepler-solar folded into kepler-binary** as a rearranged_form (3 entities, not
  4) — confirmed with Anna at the gate; matches the stefan-boltzmann solar-unit
  precedent and avoids a near-duplicate entity.
- **Mermaid → OMIFlow + prose** — confirmed at the gate; the diagram's structure
  is captured by the OMIFlow, its I1→I4 cascade by a following prose sentence.
- **Non-OMI framing + Mass Detective motif** — confirmed at the gate.
- **No `<Predict>` / no `<Intervention>`** — every prompt has a math-bearing
  answer (→ tip + Dropdown), and the source has no misconception boxes; nothing
  invented (migrate-truthfully).
- **Radial velocity referenced, not redefined** — M2-L3 owns the canonical
  definition; not wrapped as a GlossaryTerm here to avoid a needless collision.

## Surprises

**1. The `eqrefcard` shortcode.** New to the playbook: the source pairs every
equation `{{< include >}}` with a `{{< eqrefcard X >}}`. It is simply the
reference-card render, so include + eqrefcard collapse cleanly into a single
`<KeyEquation refId>` — no new component needed.

**2. A Mermaid diagram in the source.** The first migrated chapter to contain one.
Rather than treat it as a missing-component halt, the diagram turned out to *be*
an Observable→Model→Inference flow, so it maps to `<OMIFlow>` with zero loss —
a reminder that source constructs often have a native epistemic component once
you read what they encode.

**3. No checklist, no misconceptions.** Unlike M2-L3, the source has neither a
GFM task-list self-assessment (so the `- [ ]` axe trap didn't recur) nor any
misconception boxes — a leaner chapter that exercised the worked-example and
equation-registry paths more than the intervention path.

## Platform issues to file

1. **Gap: `<Video>`** — still unbuilt; not needed by this chapter.
2. **Tracked residual #198** — `scrollable-region-focusable` at 375px on wide
   tables. Desktop axe (the acceptance gate) is clean in light + dark.
3. **Possible future nicety:** a Mermaid-or-`<OMIFlow>` authoring note in ADR 0064
   — this chapter establishes the "Mermaid O→M→I → OMIFlow" remap as the pattern.

## Success criteria

- ✅ Full reading + `practice.mdx` migrated truthfully (front matter, Parts 1–4,
  O→M→I section, Summary, 11 practice problems).
- ✅ Registries scaffolded: unit JSON (order 4), 8 new `figures.ts` entries +
  assets, 3 new equation entities.
- ✅ `biome check` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign
  practice-unrouted only).
- ✅ Rendered-page gate: console = favicon 404 only (no hydration / React #418);
  10 figures, 0 broken; 370 KaTeX; OMIFlow 1/1/1; 1 WorkedExample numerical +
  1 DimCheck; no leaked MDX; no Mermaid leak; both new equation cards render;
  sidebar reads L1→L2→L3→L4; axe **0 violations desktop 1280px, light AND dark**.
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/` (read-only design source).
