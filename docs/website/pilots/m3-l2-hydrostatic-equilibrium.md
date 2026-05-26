---
title: 'Pilot report: ASTR 201 Module 3 Lecture 2 — Hydrostatic Equilibrium'
short_title: 'Pilot: M3-L2 Hydrostatic Equilibrium'
description: 'Second ADR 0064 chapter-migration pilot. Equation/derivation/worked-example-dominant chapter migrated from Quarto to Sophie MDX, into the astr201 consumer repo. Structural-density rotation against the m2-l3 pilot; first real exercise of <WorkedExample> (ADR 0081).'
authors:
  - name: Anna Rosen
date: 2026-05-25
---

## Pilot context

This is the **second** chapter-migration pilot under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md), and the gate
identified in the [A+ closure review](../../reviews/2026-05-25-a-plus-closure.md)
for moving Sophie's scientific-correctness score from 17 → 19 (chapter-scale
validation). It converts **ASTR 201 Module 3 Lecture 2 — "The Balancing Act:
Hydrostatic Equilibrium"** from its Quarto `.qmd` source into a Sophie MDX
reading.

Two things make this pilot structurally different from the first
([m2-l3 Spectra & Composition](./m2-l3-spectra-composition.md)):

1. **Structural-density rotation (ADR 0064 §4).** m2-l3 was OMI-spine +
   GlossaryTerm-dense (22 terms) with light math (3 `<KeyEquation>`s). This
   chapter is **equation / derivation / worked-example dominant**: the source
   carries ~296 display equations, the spine is a five-rung derivation ladder
   (gravity → hydrostatic equilibrium → central pressure → core temperature →
   virial theorem), and it has two full worked examples with explicit
   dimensional checks. It migrated to **8 `<KeyEquation>` registry entities**
   (each with biography children) and **2 `<WorkedExample>`s**. OMI is present
   but *secondary* (4 standalone `<OMIFlow>`s, no chapter-level `framing:"OMI"`),
   which is the whole point of the rotation.
2. **Output target is the consumer repo, not smoke.** Unlike m2-l3 (which landed
   in `examples/smoke`), this chapter was authored directly into the **astr201
   consumer repo** at
   `src/content/sections/stellar-structure-evolution/units/lecture-02-hydrostatic-equilibrium/`,
   exercising the real ADR 0082 shipped-`ChapterLayout` + injected reading-route
   integration and the `file:`-packed `@sophie/components` / `@sophie/astro`
   copies.

The source repo `astr201-sp26/` was treated as **read-only design input** (zero
edits). Scope covered: the full reading (Parts 1–5 + Synthesis + Reference
Tables + Summary + Gravity Scoreboard + Retrieval Practice + Looking Ahead), a
sibling `practice.mdx`, 8 equation registry entities, and 11 figures. **No PR
opened** — the chapter is built + verified locally; landing it awaits Anna's
HITL sign-off.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `learning-objectives:` frontmatter + `## Learning Objectives` | `<LearningObjectives>` + `<Objective verb=>` | ✅ direct | 7 objectives wired. |
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 8 generated figures; assets + alt/caption ported from `assets/figures.yml`. |
| Inline `` ```{python} `` figures | `<Figure name>` | ✅ via cache | 3 inline Python figures **recovered from the Quarto `_freeze/` render cache** (`figure-html/*-output-1.png`) — no code execution; registered as static figures. |
| `:::{.callout-important}` "Big Idea" / "Principle" | `<Callout variant="key-insight">` | ✅ semantic | Feeds `keyInsights`. |
| `:::{.callout-note title="Math Grammar…/Reading Map…">` | `<Callout variant="info">` | ✅ direct | |
| `:::{.callout-tip}` "Think First" (conceptual) | `<Predict>` | ✅ direct | 2 callsites (math-light prompts). |
| `:::{.callout-tip}` "Check Yourself" (math-bearing) + collapsible answer | `<Callout variant="tip">` + `<Dropdown label="Solution">` | ✅ semantic | KaTeX renders in Callout/Dropdown children; `<Predict>` string props can't render math, so this pairing is used for math prompts (also satisfies decision 0001 §4 collapsible answers). |
| `:::{.callout-warning}` "Misconception Check" + collapsed solution | `<Callout variant="misconception">` + `<Intervention type="refutation-text">` | ✅ semantic remap | 8 misconceptions; **MG4 audit confirms 8/8 have a substantial intervention (100%)**. |
| `:::{.callout-note title="Deep Dive…">` | `<Callout variant="deep-dive">` | ✅ direct | 3 deep dives, incl. the large nested "Photons as a fluid" block (nested sub-callouts flattened to bold-led paragraphs to avoid Callout-in-Callout). |
| `:::{.callout-note title="Spoiler for Later…">` | `<Callout variant="the-more-you-know">` | ✅ semantic | |
| `:::{... .omi}` Observable→Model→Inference | `<OMIFlow>` + 3 slots | ✅ direct | 4 arcs, standalone (no `framing:"OMI"` — preserves the rotation). |
| `### Worked Example: …` (substitute→evaluate→unit-check→interpret) | `<WorkedExample>` w/ `.Problem`/`.Step`/`.DimCheck`/`.Result` | ✅ **ships now** | **Closes m2-l3's #1 gap** (ADR 0081). 2 examples; `.DimCheck` carries `data-dim-check` (QB6). First real pilot exercise. |
| Named equations (HSE, ideal gas, P_rad, μ, P_c, T_c, virial, U_grav) | `<KeyEquation refId>` + `src/content/equations/<id>.mdx` biographies | ✅ direct | 8 entities; Observable / Assumption / BreaksWhen / CommonMisuse / DerivationStep children. |
| ~287 intermediate derivation-step equations | inline `$$…$$` display math | ✅ native | Most source equations are derivation steps, not named results — kept as display math, not registry entities. |
| Inline glossary terms (bold-defined in source) | `<GlossaryTerm>` + first-use `<Aside kind="definition">` | ✅ **added** | Source had **zero** `{{< term >}}` callsites; 10 term/definition pairs were added on Anna's instruction ("that reading should have had them"). |
| `## Practice Problems` (8 inline problems) | sibling `practice.mdx` | ⚠️ gap | Authored as a separate artifact (Anna's call); **no render route** — see Surprises 4. |
| "Gravity Scoreboard" ASCII | fenced ` ```text ` code block | ⚠️ CSS gap | Renders, but overflows mobile — see Surprises 3. |
| Reference tables (Key Results / Symbol Legend / Conservation Laws) | native MDX tables | ✅ native | |

## Pedagogy structure map

### OMI arcs

The chapter declares **no** `framing:"OMI"` (deliberate — the equation spine, not
OMI, is dominant). Four standalone `<OMIFlow>`s mark the genuine
Observable→Model→Inference cycles; each passes OF-1 strict-3.

| Arc | Observable | Model | Inference | `<OMIFlow id=…>` |
|---|---|---|---|---|
| Force balance | Sun holds its size for Gyr ≫ τ_dyn | Force balance on a shell | Each shell satisfies $dP/dr=-\rho g$ | `omi-hse-force-balance` |
| Central pressure | M, R measurable; interior not | HSE + mean-density scaling | $P_c \sim GM^2/R^4$ | `omi-central-pressure` |
| Negative heat capacity | Protostars shrink *and* heat | Virial theorem | Losing energy raises core T | `omi-negative-heat-capacity` |
| Core temperature | Sun's measured M, R | HSE + ideal gas + mean density | $T_c \sim 10^7\,\mathrm{K}$ | `omi-core-temperature` |

### Eight-role component-mapping (ADR 0058)

- **observable** — 4 `<OMIFlow.Observable>` slots + `<Observable>` in all 8 equation registry files.
- **model** — 4 `<OMIFlow.Model>` slots + `<DerivationStep>` children (force-balance, scaling derivations).
- **inference** — 4 `<OMIFlow.Inference>` slots.
- **assumption** — `<Assumption>` children across the registry (spherical symmetry, static limit, ideal gas, full ionization, gas-pressure dominance, equilibrium, non-relativistic gas) + the in-chapter "gas-pressure dominance" callout.
- **approximation** — `<BreaksWhen>` children (centrally-concentrated stars, degeneracy, relativistic regimes) + the mean-density scaling caveats.
- **misconception** — 8 `<Callout variant="misconception">` each with ≥1 `<Intervention type="refutation-text">`; `<CommonMisuse>` children on 2 equations.
- **numerical** — **2 `<WorkedExample>`s** (first real exercise of this role; `data-dim-check` = QB6 "units at every step").
- **uncertainty** — not surfaced (A10 `<UncertaintyLens>` still deferred).

### Multi-representation (ADR 0043)

`<MultiRep>` not exercised — consistent with the rotation choice (this pilot's
differentiator is math/derivation density, not linked representations).
MultiRep remains unexercised by any pilot; a future chapter should target it.

## Pedagogical decisions log

- **Migrate truthfully (Anna).** Full reading converted 1:1 — every Part,
  callout, OMI block, worked example, misconception, deep dive, reference table,
  the ASCII scoreboard, and the summary. Nothing cut.
- **Glossary terms added (Anna's mid-pilot revision).** The source had zero
  `{{< term >}}` callsites. Initial call was "as many terms as the source has";
  Anna then revised to *"actually add glossary terms, that reading should have
  had them."* 10 `<GlossaryTerm>` + first-use `<Aside kind="definition">` pairs
  were authored for genuine technical terms (hydrostatic equilibrium, pressure
  gradient, mean molecular weight, radiation/degeneracy pressure, virial
  theorem, negative heat capacity, dynamical timescale, radiative diffusion).
- **No `framing:"OMI"`.** The 4 OMI arcs render as standalone `<OMIFlow>`s;
  declaring OMI framing would undercut the structural-density rotation.
- **`<Units>` biography children dropped.** The component is a compact
  `(symbol, unit)` pair (a "units strip"), not a host for the source's
  multi-factor dimensional derivations; the kepler/newtonian/smoke precedents
  omit it. Unit reasoning is preserved in `constants[].unit`, the
  `<WorkedExample.DimCheck>` slots, and the Symbol Legend table.
- **Math-bearing prompts → Callout + Dropdown, not Predict.** `<Predict>`'s
  prompt/description are string props (no KaTeX); math-bearing "Check Yourself"
  prompts use `<Callout variant="tip">` + collapsible `<Dropdown label="Solution">`
  (also the decision 0001 §4 "collapsible quick-check answer" shape). `<Predict>`
  is reserved for the 2 conceptual, math-light "Think First" prompts.
- **Practice problems → separate `practice.mdx`** (Anna's choice; decision
  0001 §6 defers graded practice to ADR 0073). See Surprises 4.
- **Python figures pre-rendered from `_freeze`.** No code execution in MDX
  (`<CodeCell>` / ADR 0018 still deferred); the three inline plots were lifted
  from the Quarto render cache and registered as static figures.

## Time spent per phase

Rough log. The headline contrast with m2-l3: **near-zero platform-shaping time.**

| Phase | Notes |
|---|---|
| Required reading + source inventory + gap pre-flight | Read ADR 0064 + chapter-components ref + m2-l3 report + closure review; full source read; objective density inventory across Modules 2–3 to justify the rotation pick. |
| Scaffold (section/unit JSON, 11 figures, 8 equation entities) | Largest authoring block after the reading itself. |
| Reading conversion (full chapter) | Spine→Part 2 then Parts 3–5 appended; built incrementally. |
| `practice.mdx` | Small. |
| Verification (biome, typecheck, build, axe light+dark, browser content-integrity, mobile, dark) | ~the m2-l3-recommended 30% budget. |

Unlike m2-l3 (~13 hrs of platform-shaping vs ~3 hrs conversion), this pilot
spent **essentially all** of its effort on conversion + verification. The
platform was conversion-ready; ADR 0064's bet — that locking the playbook before
pilot 2 would make pilot 2 bounded and conversion-dominated — paid off.

## Surprises

1. **Multi-line inline `$…$` math breaks the MDX/acorn parse.** When inline math
   spans a line break, remark-math fails to recognize it as math, so MDX parses
   the `{…}` inside (e.g. `{(\mathrm{erg…})}`) as a JSX expression and acorn
   errors ("Expecting Unicode escape sequence") on the `\,`. Surfaced first in an
   equation registry `<Units>` block. **Authoring rule: inline math must be
   single-line; use `$$…$$` for anything that wraps.** New finding — m2-l3 did
   not hit it.
2. **`<Units>` requires `symbol` + `unit` attrs.** The biography child is a
   compact `(symbol, unit)` pair, not a prose dimensional derivation. Prose
   `<Units>` content fails the MDX transform with "missing a non-empty `symbol`
   attr." Resolved by dropping the children (precedent omits them).
3. **Mobile overflow (182 px at 375 px) from the ASCII `<pre>` block.** Same
   *class* as m2-l3 Surprise #2 (mobile overflow) but a **different element**:
   the shipped `ChapterLayout` applies `overflow-x:auto` to `.katex-display`
   (verified — 0 display-math offenders) and tables, but **not to `<pre>`**, so a
   wide code/ASCII block (here 583 px) scrolls the whole page. Platform CSS gap —
   will bite any consumer chapter with a code block. Not inline-patched
   (no workarounds per ADR 0064 §3).
4. **`practice.mdx` is discovered but has no render route.** The artifacts
   collection globs it (so it builds clean), but ADR 0067 defines no `practice`
   artifact *type* and `@sophie/astro` injects only `/units/[unit]/reading`
   (ADR 0082). Only 3 routes built (2 readings + index); the practice content has
   no URL. Expected given ADR 0073 is unshipped — content authored now, route to
   follow.
5. **`<WorkedExample>` ships and renders cleanly — m2-l3's #1 gap is closed.**
   Both examples render with the `data-dim-check` (QB6) hook intact. **But** the
   pedagogy-index extractor + slot-coverage invariant remain deferred (ADR 0081),
   so `<WorkedExample>` content is *not yet audited or indexed* — it renders but
   is invisible to the pedagogy graph. This pilot is the forcing function to
   graduate those deferred items.
6. **The build-time pedagogy audit is an effective authoring safety net.** It
   caught a missing definition (D4: `<GlossaryTerm name="Radiative diffusion">`
   with no matching `<Aside>`) and uncited equation entities (R2) incrementally,
   exactly when they were introduced. Final state: **0 errors, 0 warnings, 8
   benign infos.**
7. **Verification found no hydration-class regression.** The ASTR 201 packed-copy
   consumer (the environment that produced the lecture-02 React #418 storm pre-
   Phase-1.5) rendered with **zero console errors** beyond a favicon 404 — the
   `useHydrated`-gate family (ADRs 0038/0083/0084) holds for a dense new chapter.

## Recommendations + ADR backlog

- **Platform fix (CSS):** add `overflow-x:auto` (+ `max-width:100%`) to `<pre>`
  in the shipped `ChapterLayout` styles, mirroring the existing `.katex-display`
  / table handling. Closes Surprise 3 for all consumers. *(Sophie PR.)*
- **Platform (WorkedExample):** graduate the ADR 0081-deferred pedagogy-index
  extractor + slot-coverage invariant so `<WorkedExample>` content is audited and
  rolls up. This pilot supplies the first real callsites. *(Sophie PR.)*
- **Platform (practice artifact):** either add a `practice` artifact type +
  route, or document the ADR 0073 dependency so authors know practice content is
  authored-but-not-rendered until then. *(Sophie decision.)*
- **Authoring guidance / lint:** document the single-line-inline-math rule
  (Surprise 1) in the chapter-author reference; consider a remark/Biome check for
  multi-line `$…$` and for prose-bodied `<Units>`.
- **Next pilot (ADR 0064 §4):** rotate again — a `<MultiRep>`-heavy chapter
  (still unexercised by any pilot) is the obvious next density profile, e.g. an
  HR-diagram or color–temperature chapter where one concept spans prose +
  equation + figure.

## Platform issues to file

Filed against `drannarosen/sophie` this session, all closed in the
WS-A/B/C/E triage cycle (2026-05-26):

1. **[#187](https://github.com/drannarosen/sophie/issues/187) — `ChapterLayout`
   `<pre>` mobile overflow** — Surprise 3. **Closed by [PR #195](https://github.com/drannarosen/sophie/pull/195).**
   *Corrected root cause:* the `<pre>` block was a red herring (correctly
   clamped by the existing `.sophie-content pre { overflow-x:auto }` rule).
   The real culprit was the **TocDrawer aside** when closed — its
   `position:fixed` + `transform: translateX(100%)` post-transform bounding
   box contributed to `body.scrollWidth` even though fixed. Fix:
   `html { overflow-x: clip }` at the document layer (defends the whole
   class of off-canvas drawer/popover leaks, not just this drawer). See the
   [#187 root-cause comment](https://github.com/drannarosen/sophie/issues/187#issuecomment-4540202278)
   for the investigation writeup.
2. **[#188](https://github.com/drannarosen/sophie/issues/188) —
   `<WorkedExample>` pedagogy-index extractor + slot-coverage invariant** —
   ADR 0081 deferred items (Surprise 5). **Closed by [PR #197](https://github.com/drannarosen/sophie/pull/197).**
   `extractWorkedExamples` + WE-1 (units-at-every-step / QB6 coverage) +
   WE-2 (Problem + Result completeness) + WE-3 (unknown-child R7
   disposition) ship.
3. **[#189](https://github.com/drannarosen/sophie/issues/189) — `practice`
   artifact type + route** (or documented ADR 0073 dependency) (Surprise 4).
   **Closed by [PR #196](https://github.com/drannarosen/sophie/pull/196).**
   `practice` is in fact a valid `ArtifactType` per ADR 0067; the gap was
   the missing `/units/<unit>/practice` route. Resolved as option (b)
   warn-and-defer: integration emits a build-time WARNING per discovered
   `practice.mdx`, route shape deferred to ADR 0073 implementation.
4. **[#190](https://github.com/drannarosen/sophie/issues/190) — multi-line
   inline-math authoring hazard** — document + optional lint (Surprise 1).
   **Closed by [PR #196](https://github.com/drannarosen/sophie/pull/196).**
   New `mdxAuthorTrapsVitePlugin` (Vite `transform` hook, `enforce: "pre"`)
   scans raw `.mdx` text before MDX/acorn and throws curated errors. Rule
   narrowed from "any multi-line `$...$`" to "multi-line with TeX-spacing-
   macro `{...\<non-letter>...}` braces" after the first-pass scanner
   false-positived on the smoke fixture's `doppler-shift.mdx` equation
   registry (which has only `\<letter>{...}` braces). The `<Units>`
   symbol/unit contract (Surprise 2) was not separately fixed; remains
   documented in the chapter-author reference's authoring guidance.
5. **Carry-over from m2-l3 (still unfiled):** `<Video>`, Track-A/B
   `<DifficultyPath>`, and the course-management chrome pack — none blocked
   this chapter and none surfaced in this triage cycle; still open.

## Success criteria

- ✅ Full reading migrated truthfully (5 Parts + Synthesis + Reference Tables +
  Summary + Gravity Scoreboard + Retrieval Practice + Looking Ahead).
- ✅ Structural-density rotation satisfied: equation/derivation/worked-example
  dominant (8 `<KeyEquation>` entities, 2 `<WorkedExample>`, 4 standalone
  `<OMIFlow>`) — distinct from m2-l3's OMI-spine + GlossaryTerm density.
- ✅ 8 equation registry entities authored with biographies; all cited (R2 clean).
- ✅ 11 figures registered + rendering (0 broken; 3 recovered from `_freeze`).
- ✅ Glossary terms added per Anna (10 `<GlossaryTerm>` + `<Aside>` pairs).
- ✅ `pnpm build`: **0 errors, 0 warnings**, 8 benign infos; `astro check` 0/0/0;
  Biome clean.
- ✅ axe-core **0 violations / 31 passes in light *and* dark mode** (WCAG 2.1 AA);
  content-integrity (380 KaTeX nodes, all figures loaded, no leaked MDX, no
  literal `$$`, no paragraph-split); **no hydration/React #418 errors**.
- ✅ Mobile horizontal-overflow finding closed by [Sophie PR #195](https://github.com/drannarosen/sophie/pull/195) (root cause was the TocDrawer's post-transform bounding box, not `<pre>` — see the corrected root-cause section above).
- ✅ `practice.mdx` discovered-but-unrouted finding closed by [Sophie PR #196](https://github.com/drannarosen/sophie/pull/196) (warn-and-defer per option b).
- ✅ Pilot chapter committed + pushed to astr201 main (commit [`5775aeb`](https://github.com/drannarosen/astr201/commit/5775aeb)); HITL sign-off received 2026-05-26.
