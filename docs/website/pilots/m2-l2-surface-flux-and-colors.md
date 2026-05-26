---
title: 'Pilot report: ASTR 201 Module 2 Lecture 2 — Surface Flux & Colors'
short_title: 'Pilot: M2-L2 Surface Flux & Colors'
description: 'Third ADR 0064 chapter-migration pilot, and the first to exercise <MultiRep>. A visual + scaling chapter migrated from Quarto to Sophie MDX into the astr201 consumer repo, binding color<->temperature and L<->T<->R each across verbal + equation + figure.'
authors:
  - name: Anna Rosen
date: 2026-05-25
---

## Pilot context

The **third** chapter-migration pilot under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md), and the first to
exercise **`<MultiRep>`** (ADR 0043) — the multi-representation primitive that
neither prior pilot touched. It converts **ASTR 201 Module 2 Lecture 2 — "Surface
Flux & Colors of Stars"** from Quarto `.qmd` into a Sophie MDX reading in the
**astr201 consumer repo** at
`src/content/sections/hr-diagram/units/lecture-02-surface-flux-and-colors/`.

**Structural-density rotation (ADR 0064 §4).** Each pilot has hit a different
dominant profile:

| Pilot | Dominant profile |
| --- | --- |
| m2-l3 Spectra & Composition | OMI spine + GlossaryTerm density |
| m3-l2 Hydrostatic Equilibrium | equation / derivation / worked-example density |
| **m2-l2 Surface Flux & Colors** | **multi-representation (`<MultiRep>`) + visual/scaling** |

This chapter's thesis — *"color is temperature,"* with $L$, $T$, $R$ forming a
closed triangle — is naturally multi-representational, so it binds **two**
concepts (`color-temperature` and `luminosity-temperature-radius`) each across
verbal + equation + figure. It is also figure-heavy (12 figures) and
scaling-driven (4 worked examples) rather than derivation-driven.

Source `astr201-sp26/` was read-only. Scope: the full reading (Parts 1–8 +
Summary), a sibling `practice.mdx` (12 problems), 3 equation registry entities,
12 figures, and **2 MultiRep bindings**. **No PR opened** — built + verified
locally, awaiting HITL sign-off.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `learning-objectives:` + `## Learning Objectives` | `<LearningObjectives>` + `<Objective>` | ✅ | 7 objectives. |
| `{{< include eq >}}` + `{{< eqrefcard >}}` | `<KeyEquation refId>` + registry | ✅ | 3 entities: flux-luminosity-distance, stefan-boltzmann, wien-displacement. Surface flux $F_*=L/4\pi R^2$ kept inline (source shows it inline, not as an include). |
| `{{< fig >}}` | `<Figure name>` | ✅ | 12 figures; assets reused from Module-1/2 dirs, alt/caption ported. No Python figures. |
| **color↔temperature, L↔T↔R** | **`<MultiRep concept>`** + `<RepVerbal>` + `<RepEquation refKey symbol>` + `<RepFigure refName symbolLabel>` | ✅ **first pilot exercise** | Renders as an `aria-labelledby` "binding card"; RepEquation/RepFigure render as labeled **cross-references** (not embeds). 0 MR/NR audit warnings. |
| 4 worked examples | `<WorkedExample>` | ✅ | `.Problem`/`.Step`/`.DimCheck`/`.Result`; 4 DimChecks. |
| `.callout-note` "Observable → Model → Inference" | `<Callout>` (not `<OMIFlow>`) | ✅ semantic | Source uses plain callout-notes (not the `.omi` shortcode) and the Part 1 box has *two* observables → would violate OF-1 strict-3. Rendered as Callouts; OMI is well-covered by m2-l3. |
| `.callout-warning` "Common Student Confusions" | `<Callout variant="misconception">` + `<Intervention>` | ✅ | MG4: 100% substantial-intervention coverage. |
| `.callout-note collapse` (symbol legend, derivations, answers) | `<Dropdown label>` | ✅ | decision 0001 §4 collapsible pattern. |
| "Quick Check" / "Proportional Reasoning" + answers | `<Callout variant="tip">` + `<Dropdown>` | ✅ | math renders in Callout/Dropdown children. |
| `.callout-note collapse` "Enrichment: …" | `<Callout variant="the-more-you-know">` | ✅ | 4 enrichment boxes. |
| "Predict First" | `<Predict>` | ✅ | 1 (math-light prompt). |
| "Argue with a Peer" | `<Callout variant="tip">` | ✅ | Rendered as a discussion callout (not `<Reflection>`, whose API wasn't needed here). |
| inline technical terms | `<GlossaryTerm>` + `<Aside kind="definition">` | ✅ | 5 terms added per Anna's standing call. |
| 12 Practice Problems | separate `practice.mdx` | ✅ | decision 0001 §6 + the m3-l2 precedent. |

## Pedagogy structure map

### Multi-representation bindings (ADR 0043) — the focus

Two `<MultiRep>` bindings, each one concept across three representational modes:

| `concept=` | Verbal | Equation (`refKey`) | Figure (`refName`) |
|---|---|---|---|
| `color-temperature` | "color *is* temperature; hotter = bluer; $\lambda_{\text{peak}} \propto T^{-1}$" | `wien-displacement` (symbol `T`) | `energy-wavelength-connection` (symbolLabel `T`) |
| `luminosity-temperature-radius` | "$T$ dominates as $T^4$, size amplifies as $R^2$" | `stefan-boltzmann` (symbol `L`) | `blackbody-stellar-spectra` (symbolLabel `T`) |

Both render as `<section aria-labelledby>` binding cards (R10-compliant named
landmarks; axe-clean). The component accepted `concept` + `refKey` + `symbol` +
`refName` with **no notation-registry pre-setup** and produced **0 MR/NR audit
warnings** — MultiRep is consumer-ready.

### Eight-role component-mapping (ADR 0058)

- **model / inference** — carried by the MultiRep verbal + equation bindings and the equation `<DerivationStep>` (Stefan-Boltzmann = surface-flux × area).
- **observable** — `<Observable>` in all 3 equation registry files; the "Observable → Model → Inference" framing Callouts.
- **assumption** — `<Assumption>` (isotropic emission, transparent space, blackbody, spherical/uniform-$T$, per-wavelength Planck peak).
- **approximation** — `<BreaksWhen>` (extinction, oblate rotators, $B_\nu$ vs $B_\lambda$ peak).
- **misconception** — "Common student confusions" `<Callout variant="misconception">` + 3 `<Intervention>`s; `<CommonMisuse>` on 2 equations.
- **numerical** — 4 `<WorkedExample>`s (Sun's $T$; Rigel/Betelgeuse contrast; Sirius A radius; Betelgeuse radius), each with a `.DimCheck`.
- **uncertainty** — not surfaced (A10 still deferred).

## Pedagogical decisions log

- **Two MultiReps (Anna's call).** Bind both central concepts rather than one, to
  exercise the component + MR audit invariants more fully.
- **OMI boxes → Callouts, not OMIFlow.** The source's O→M→I boxes are plain
  callout-notes with multiple observables; forcing `<OMIFlow>` would violate the
  OF-1 strict-3 rule. Faithful to the source's own (non-`.omi`) treatment.
- **RepFigure + standalone Figure both.** `<RepFigure refName>` cross-references
  a figure but does not embed it, and the source shows both figures standalone
  via `{{< fig >}}`. So each MultiRep figure also gets a standalone `<Figure>` —
  faithful to the source and required to clear F4 (see Surprises 1).
- **3 equation entities.** Only the source's three `{{< include >}}` equations
  became registry entities; surface flux stays inline display math as in the source.
- **Glossary terms added** (5 pairs) per Anna's standing instruction, matching the
  glossary-rich style of the migrated foundations chapter.
- **Practice → separate `practice.mdx`** (decision 0001 §6; same as m3-l2).

## Time spent per phase

Conversion-dominated again — the platform was ready, including MultiRep.

| Phase | Notes |
|---|---|
| Inventory + gap/MultiRep pre-flight | Read source; verified MultiRep + Video readiness; confirmed 12 figure assets. |
| Scaffold (section/unit JSON, 12 figures, 3 equations) | Reused the m3-l2 registry patterns. |
| Reading conversion (full, 2 MultiReps) | Stub-with-MultiRep built first to de-risk MR early. |
| `practice.mdx` | Small. |
| Verification | biome / typecheck / build / axe (light + dark) / browser render-integrity / mobile. |

## Surprises

1. **`<RepFigure refName>` is not counted by the F4 figure-usage audit.** A figure
   referenced *only* inside a `<MultiRep>` via `<RepFigure>` is flagged by **F4**
   as having "zero `<Figure>` and zero `<FigureRef>` usages" — the figure-usage
   extractor doesn't walk `<RepFigure>`. Fixed here by also rendering the figure
   standalone (which the source does anyway), but the audit gap stands: either F4
   should count `<RepFigure>` usages, or `<RepFigure>` should register a figure
   usage. New finding — only a MultiRep pilot surfaces it.
2. **`scrollable-region-focusable` axe violation at mobile width.** The shipped
   `ChapterLayout` gives `.katex-display` `overflow-x:auto` (good — no visible
   overflow), but the resulting scroll containers are **not keyboard-focusable**,
   so axe flags `scrollable-region-focusable` at 375 px (theme-independent;
   desktop math fits, so it doesn't fire there). This matches the **known
   deferral** named in the [A+ closure review](../../reviews/2026-05-25-a-plus-closure.md).
   Confirmed instance on a dense-math chapter at mobile width; keyboard users
   cannot scroll wide equations. Platform a11y gap.
3. **Raw `<digit` in a Markdown table cell breaks the MDX parse.** The OBAFGKM
   table cell `| M | <3,700 K | … |` made MDX read `<3` as a JSX tag start
   ("Unexpected character `3` before name"). Fixed with the `&lt;` entity. Sibling
   to the m3-l2 multi-line-inline-math hazard (#190): raw `<` followed by a
   non-letter is an MDX trap in prose/tables. Worth folding into the same
   authoring-guidance/lint note.
4. **MultiRep is consumer-ready and clean.** It accepted `concept`/`refKey`/
   `symbol`/`refName` with no notation-registry setup, rendered as an
   `aria-labelledby` binding card (RepVerbal full-text; RepEquation/RepFigure as
   labeled cross-references), and produced **0 MR/NR audit warnings**. The 🚧
   "in-progress" marker in the component reference understates its readiness for
   the v1 children-mode use this pilot needed.
5. **No hydration-class regression.** The packed-copy consumer rendered with zero
   console errors beyond a favicon 404 — the `useHydrated`-gate family holds for a
   MultiRep-bearing chapter too.

## Recommendations + ADR backlog

- **Platform (audit):** make **F4** count `<RepFigure refName>` (and `<RepEquation
  refKey>` for the equation-citation equivalent) as a usage, so MultiRep-only
  references don't read as orphaned (Surprise 1). *(Sophie PR.)*
- **Platform (a11y):** add `tabindex="0"` (+ an accessible name) to the
  `.katex-display` scroll containers in `ChapterLayout`, closing
  `scrollable-region-focusable` for mobile keyboard users (Surprise 2). Pairs with
  the `<pre>` overflow fix in [#187]. *(Sophie PR.)*
- **Authoring guidance / lint:** extend the [#190] multi-line-inline-math note to
  also cover raw `<digit` / `<` -before-non-letter in prose and tables (Surprise 3).
- **Component reference:** drop or soften the `<MultiRep>` 🚧 marker for the v1
  children-mode path now that a consumer pilot validates it end-to-end (Surprise 4).
- **Next pilot (ADR 0064 §4):** rotate again — Track-A/Track-B forking (needs a
  `<DifficultyPath>`/`<Track>` primitive, still the gap m2-l3 flagged) or a
  spectroscopy/line-formation chapter would each be a fresh profile.

## Platform issues to file

Filed against `drannarosen/sophie` this session, all closed in the
WS-A/B/C/E triage cycle (2026-05-26):

1. **[#191](https://github.com/drannarosen/sophie/issues/191) — F4 should count
   `<RepFigure>` / `<RepEquation>` usages** (Surprise 1). **Closed by
   [PR #197](https://github.com/drannarosen/sophie/pull/197).** Resolved by
   extending `InlineRefKindSchema` with `"rep-figure"` + `"rep-equation"`
   (the existing "anything that references a thing by name" surface);
   `extractMultiReps` now emits an `InlineRefUsageEntry` per Rep* child,
   and F4 (orphan figure) + R2 (orphan equation) each picked up a one-line
   OR-clause. MultiRep-only references no longer false-positive as
   orphans, without F4/R2 needing to know MultiRep's internal shape (SoTA
   "invert source of truth" per AGENTS.md).
2. **[#192](https://github.com/drannarosen/sophie/issues/192) — `.katex-display`
   `scrollable-region-focusable` at mobile width** (Surprise 2). **Closed by
   [PR #195](https://github.com/drannarosen/sophie/pull/195).** New build-time
   `rehypeKatexDisplayA11y` plugin stamps `tabindex="0"` + `role="group"` +
   `aria-label="Equation, scrollable"` on every `.katex-display` emitted by
   `rehype-katex`. Build-time over runtime JS to avoid the React #418
   hydration class the useHydrated-gate family was built to defend against.
3. **[#193](https://github.com/drannarosen/sophie/issues/193) — raw `<digit` MDX
   authoring hazard** (Surprise 3). **Closed by [PR #196](https://github.com/drannarosen/sophie/pull/196).**
   Folded into the `mdxAuthorTrapsVitePlugin` lint pair (alongside
   the multi-line inline-math trap from m3-l2 #190). Pre-parse Vite
   `transform` hook with `enforce: "pre"` scans raw `.mdx` text for both
   traps and throws curated `file:line:col` errors before MDX/acorn can
   fail with opaque "Unexpected character" / "Expecting Unicode escape"
   messages.
4. **[#194](https://github.com/drannarosen/sophie/issues/194) — soften the
   `<MultiRep>` 🚧 status in the chapter-components reference** (Surprise 4).
   **Closed by [PR #197](https://github.com/drannarosen/sophie/pull/197).**
   Dropped 🚧 in four places (the `<MultiRep>` row, the
   `<RepVerbal>/<RepEquation>/<RepFigure>` row, the `<ChapterMultiReps>`
   row, and the "When to use each component" entry); kept 🚧 only on
   genuinely-deferred pieces (`<RepCode>` pending `<CodeCell>` per ADR
   0018; MR3 + MR5 ship with `<RepCode>`).

## Success criteria

- ✅ Full reading migrated truthfully (Parts 1–8 + Summary + reference tables).
- ✅ Structural-density rotation: **first `<MultiRep>` pilot** — 2 bindings across
  verbal + equation + figure; visual/scaling profile distinct from m2-l3 and m3-l2.
- ✅ 3 equation registry entities with biographies; all cited.
- ✅ 12 figures registered + rendering (0 broken).
- ✅ 4 `<WorkedExample>`s with DimChecks; 5 GlossaryTerms added per Anna.
- ✅ `pnpm build` **0 errors, 0 warnings** (12 benign infos); `astro check` 0/0/0; Biome clean.
- ✅ axe-core **0 violations / 31 passes desktop-light**; render integrity (218 KaTeX,
  12 figures loaded, 2 MultiRep binding cards as landmarks, no leaked MDX, no hydration errors).
- ✅ Mobile dark/`.katex-display` `scrollable-region-focusable` axe finding closed by [Sophie PR #195](https://github.com/drannarosen/sophie/pull/195).
- ✅ `practice.mdx` discovered-but-unrouted finding closed by [Sophie PR #196](https://github.com/drannarosen/sophie/pull/196) (warn-and-defer).
- ✅ Pilot chapter committed + pushed to astr201 main (commit [`890433c`](https://github.com/drannarosen/astr201/commit/890433c)); HITL sign-off received 2026-05-26.
