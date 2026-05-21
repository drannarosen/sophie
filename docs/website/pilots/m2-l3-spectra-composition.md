---
title: 'Pilot report: ASTR 201 Module 2 Lecture 3 — Spectra & Composition'
short_title: 'Pilot: M2-L3 Spectra & Composition'
description: 'Conversion of an existing Quarto astronomy chapter into Sophie MDX. Motivating chapter for ADR 0063 `<OMIFlow>`; evidence base for ADR 0064 (chapter-migration playbook).'
authors:
  - name: Anna Rosen
date: 2026-05-20
---

:::{note} On this report's template alignment
This report was written before [ADR 0064](../decisions/0064-chapter-migration-playbook.md)
locked the pilot-report template. The section ordering and labels
were edited post-acceptance (2026-05-21) to match ADR 0064's §2
template so the worked example is normative for future pilots.
*Content* was not changed; only section order and a few section
headings (notably *OMI arc map* → *Pedagogy structure map*) were
relabeled. Original section structure is recoverable from git
history at commit [`a13861f`](https://github.com/drannarosen/sophie/commit/a13861f).
:::

## Pilot context

This pilot converted ASTR 201 Module 2 Lecture 3 ("Spectra & Composition") from its existing Quarto `.qmd` source into a Sophie MDX chapter that renders through the smoke example. The chapter was named in [ADR 0063](../decisions/0063-omiflow-composite-primitive.md) and the accepted-features brief as the motivating example for the `<OMIFlow>` composite primitive: the source reading is structured around three explicit Observable → Model → Inference arcs ("Spectrum Detective — Clue Collected" at the end of Parts 1, 2, 3, and 4), so the OMI structure isn't being retrofit — it's the spine of the lecture.

The pilot is **evidence**, not product. The output chapter lives in `examples/smoke/src/content/chapters/02-stars/spectra-and-composition.mdx`; the *findings* documented here became the input to [ADR 0064](../decisions/0064-chapter-migration-playbook.md) (chapter-migration playbook), which accepted 2026-05-21.

Output target: single PR against `drannarosen/sophie` on branch `feat/pilot-astr201-m2-l3` (merged as [PR #143](https://github.com/drannarosen/sophie/pull/143)). Source repo `astr201-sp26/` was treated as **read-only design input** per the architecture revision recorded in the plan file at [`~/.claude/plans/sophie-just-shipped-a8-wild-parnas.md`](../../../.claude/plans/sophie-just-shipped-a8-wild-parnas.md). No edits to astr201-sp26.

## Shortcode → component dictionary

The final mapping the pilot used. Gap rows are platform issues to file against `drannarosen/sophie`; they are listed at the end of this report (§ *Platform issues to file*) per [ADR 0064](../decisions/0064-chapter-migration-playbook.md) §2's template.

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | Pilot uses 14 unique registered figures; per-callsite numbering via `FigureUsageEntry.number`. |
| `{{< img ID >}}` | `<Figure name="ID" hideCaption>` | ✅ direct | Not exercised in this chapter; mapping confirmed valid. |
| `{{< include _includes/equations/X.qmd >}}` | `<KeyEquation refId="X">` | ✅ direct | 3 equation entities created under `examples/smoke/src/content/equations/`: `bohr-energy`, `photon-energy`, `doppler-shift`. |
| `{{< term name >}}` | `<GlossaryTerm name="name">` | ✅ direct | Pilot has 22 callsites with 21 matching `<Aside kind="definition">` bodies. **Surfaced Bug 1** (see Surprises). |
| `{{< video URL >}}` | **GAP** — no Sophie `<Video>` component | ⚠️ gap | The chapter references one NASA video; rendered as a plain external link in a Callout with a code-comment annotation. |
| `:::{.callout-important}` | `<Callout variant="key-insight">` | ✅ direct | |
| `:::{.callout-tip}` | `<Callout variant="tip">` | ✅ direct | |
| `:::{.callout-warning}` "Two Myths…" | `<Callout variant="misconception">` | ✅ semantic remap | Warning → misconception is the right pedagogy role. |
| `:::{.callout-note}` (collapsible Quick Check) | `<Predict>` for open prompts; `<ComprehensionGate>` for definite-answer Q&A | ✅ semantic upgrade | Used `<Predict>` throughout this chapter — every Quick Check is open-ended prediction. |
| `:::{.callout-worked-example}` | **GAP** — no `<WorkedExample>` | ⚠️ gap | Approximated with `<Callout variant="deep-dive" title="Worked Example N — …">`. Five worked examples in the chapter; the approximation reads correctly but loses the structural-role signal that a dedicated component would carry. |
| `:::{.spectrum-clue}` end-of-section motif | `<OMIFlow.Inference>` slot | ✅ this IS the point | The "Spectrum Detective — Clue N" motif becomes the inference slot's title. Confirms OMIFlow's slot-name-binds-role design. |
| `.incremental` slides-only | n/a | scope-cut | Reading only this pilot. |
| `:::{.quiz-question}` slides-only | n/a | scope-cut | Reading only this pilot. |
| Track A / Track B branching | **GAP** — no `<DifficultyPath>` / `<Track>` | ⚠️ gap | Pilot encodes Track via new `track: "A" | "B"` chapter frontmatter (Sprint I-A meta strip); no chapter-internal Track B branches exercised. A future chapter with Track-A and Track-B content would need a real component. |
| "Learning Objectives" header + bullets | `<LearningObjectives>` + `<Objective>` children | ✅ direct | 8 objectives wired correctly. |
| 18-term inline glossary | per-term `<GlossaryTerm>` + `<ChapterGlossary>` aggregator | ✅ direct | Aggregator at chapter end is auto-populated by extractor. |
| Harvard Computers 55-line enrichment | `<Callout variant="the-more-you-know" title="Enrichment — When astronomy became astrophysics: the Harvard Computers">` | ✅ direct | Visible (not hidden under a collapsible) so the historical / equity content carries weight. |
| Per-equation `<Observable>` / `<Assumption>` / `<BreaksWhen>` / `<CommonMisuse>` | live in `src/content/equations/<id>.mdx`, not chapter body | ✅ ADR 0046 pattern | Three equation files created with biography children. |

## Pedagogy structure map

Per [ADR 0064](../decisions/0064-chapter-migration-playbook.md) §2 the
pedagogy structure map covers OMI arcs (if framed `OMI`), eight-role
component-mapping decisions per [ADR 0058](../decisions/0058-epistemic-component-contract.md),
and multi-representation usage per [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md)
(not exercised in this chapter).

### OMI arcs

Sprint A8's three-arc proposal in the plan file was expanded to **five OMI arcs** during conversion (count-cap removed 2026-05-20 mid-conversion; the climate connection became its own arc since it's a genuine independent O→M→I cycle). Each arc passes ADR 0063's OF-1 strict-3 invariant; the chapter satisfies OF-2 (framing: "OMI" → ≥1 OMIFlow).

| Arc | Observable | Model | Inference | `<OMIFlow id=…>` |
|---|---|---|---|---|
| Kirchhoff's third law | Dark lines at specific wavelengths in a stellar spectrum | Cooler gas in front of hotter continuum absorbs at emission wavelengths | The star is a two-layer object (photosphere + atmosphere) | `omi-kirchhoff-third-law` |
| Composition | Dark lines at specific, identifiable wavelengths | Bohr energy levels + photon-energy relation | Which elements are in the atmosphere ("Clue 1") | `omi-composition-from-lines` |
| Temperature | Relative line strengths across species | Boltzmann + Saha statistical mechanics | Stellar effective temperature; OBAFGKM spectral type ("Clue 2") | `omi-temperature-from-line-strengths` |
| Radial velocity | All spectral lines shifted by the same fractional amount | Non-relativistic Doppler shift Δλ/λ = vᵣ/c | Line-of-sight velocity ("Clue 3"); binary-mass + exoplanet detection bridge | `omi-radial-velocity-from-doppler` |
| Planetary energy balance | Venus / Earth / Mars surface temperatures span ~3.5× despite similar bulk | Stefan-Boltzmann + molecular IR absorption (Kirchhoff's law on a planet) | Atmospheric composition is the dominant lever on surface temperature ("Clue 4") | `omi-planetary-energy-balance` |

The 5th arc (planetary energy balance) was the cap-removal call: the climate section *is* a genuine OMI cycle, not just an application. Honoring it as a 5th OMIFlow surfaced the same epistemic structure as the stellar arcs and ties the chapter's spectroscopy spine to its climate-physics resolution.

### Eight-role component-mapping decisions

Per [ADR 0058](../decisions/0058-epistemic-component-contract.md)'s role taxonomy, the pilot exercised:

- **`observable`** — every OMIFlow.Observable slot, plus three biography `<Observable>` children in the equation registry files.
- **`model`** — every OMIFlow.Model slot, plus the equation-registry KeyEquation entries (the tex + biography).
- **`inference`** — every OMIFlow.Inference slot, absorbing the "Spectrum Detective — Clue N" motifs.
- **`assumption`** — non-relativistic Doppler assumption (vᵣ ≪ c) as `<Assumption>` in `equations/doppler-shift.mdx`; single-electron + point-nucleus assumptions in `equations/bohr-energy.mdx`.
- **`approximation`** — Bohr model's classical orbits as `<BreaksWhen>` in `equations/bohr-energy.mdx`.
- **`misconception`** — "Two Myths to Kill Now" + "Common student confusions" → 4 `<Intervention type="refutation-text">` blocks inside `<Callout variant="misconception">` parents.
- **`numerical`** — `hc ≈ 1240 eV·nm` shortcut, treated as a pedagogical tool in prose; not modeled as a separate component. A future `<Approximation>` or calculator-tool component would carry it cleanly.
- **`uncertainty`** — not surfaced in this lecture. Would become A10's job when `<UncertaintyLens>` ships.

## Pedagogical decisions log

Decisions where the converted chapter departed from a literal `.qmd → .mdx` rename or where authoring judgment was required:

- **Manual "Part N — " heading prefixes removed.** Source has `## Part 1 — Kirchhoff's laws…`; Sophie's Sprint G CSS counters auto-prepend "PART 1 ·" in small-caps. Stripping the manual prefix avoids double-labeling.
- **Harvard Computers enrichment kept visible**, not hidden under a collapsible. The plan considered `<CollapsibleCard>` (rejected — would hide load-bearing pedagogy) and `<Aside kind="digression">` (rejected — semantically wrong, Cecilia Payne's discovery *is* the foundation of how composition gets inferred). `<Callout variant="the-more-you-know">` correctly signals "enrichment that deepens understanding" without hiding it.
- **Climate connection promoted to OMIFlow #5.** Original plan kept climate as prose with no OMI scaffolding; mid-conversion the count cap was removed (the value is OMI structure where it's load-bearing, not three for three's sake). Climate has a clean O→M→I cycle and now carries it.
- **Verbose `id=` and `concept=` slugs** throughout: `omi-composition-from-lines` / `composition-from-spectral-lines` etc. Matches Sophie's existing slug style; reduces collision risk in the future Notation Registry.
- **Interactive density preserved.** Where the source uses interactivity, Sophie does too: `<Predict>` for open-ended prompts ("Think First", "Try It"); `<Reflection>` for peer-discussion prompts ("Argue with a Peer"). `<ComprehensionGate>` would suit definite-answer "Quick Check" cases — this chapter only has open prompts, so it's not exercised here.
- **18 inline definition asides preserved.** `<Aside kind="definition" title="X">` at first natural use; `<ChapterGlossary>` aggregator at chapter end. The density (~1 definition per ~250 prose words) is what surfaced Bug 1 — see Surprises.
- **Two-track frontmatter without two-track content.** The chapter declares `track: "A"` so the Sprint I-A meta strip renders "TRACK A", but the chapter doesn't fork content per track. A real Track-B variant would need either `<DifficultyPath>` (doesn't exist yet) or sibling chapter files; deferred.

## Time spent per phase

Rough log. "Visual polish" and "hardening" were not in the original plan's scope but became the bulk of the work; they're called out separately so future estimates aren't anchored on this pilot's actual numbers.

| Phase | Original plan estimate | Actual |
|---|---|---|
| Phase 1 inventory + dictionary | ~90 min | done in prior session |
| Phase 2.1 setup (figures pipeline, chapter stub) | ~30 min | done in prior session |
| Phase 2.2 equation entities (×3) | ~60 min | done in prior session |
| Phase 2.3 chapter conversion (5,800-word reading) | 3–4 hrs | done in prior session, shipped d7a62e1 |
| Phase 2.4 verification (biome / build / e2e / audit) | ~30 min | rolling, ~30 min cumulative this session |
| Visual polish sprints E + F + G + H + J | not in original plan | ~6 hrs this session |
| Sprint I reading furniture | not in original plan | ~2 hrs this session |
| Verify pass round 1 + 3-bug hardening | not in original plan | ~2 hrs this session |
| Verify pass round 2 + counter-set fix | not in original plan | ~30 min this session |
| Hardening items (e2e tests + remark plugin + audit + thumbnails) | not in original plan | ~2.5 hrs this session |
| Phase 3.4 pilot report (this document) | ~60 min | ~90 min this session |

The visual-polish + hardening time (~13 hrs across this session) dominates the conversion time itself. **Most of this work is platform-shaping** — the new components, new audit invariants, new schema fields, and the new tests apply to future chapters. The pilot itself was the forcing function that exposed what the platform was missing.

## Surprises

**1. Bug 1 — `<GlossaryTerm>` first-use silently splits chapter prose paragraphs.** The single biggest unanticipated finding. The pre-existing `markFirstUseGlossaryTerms` transform marks the first-use callsite, and `GlossaryTerm.tsx` renders the definition body via `dangerouslySetInnerHTML` into an inline `<span>`. The body is markdown-rendered HTML, which starts `<p>…</p>`. HTML5's "implied end tag" rule hoists the inner `<p>` out of the parent paragraph, splitting the chapter sentence across multiple top-level paragraphs.

The bug was **not visible** in spoiler-alerts because that chapter has only 2 GlossaryTerm callsites. It surfaced here because the pilot has 22 first-use callsites with matching inline `<Aside kind="definition">` bodies — 18 of the 22 chapter paragraphs split. The fix: `stripWrappingParagraph` in `GlossaryTerm.tsx` unwraps the outer `<p>` before injection. A follow-on e2e test surfaced a second class of the same bug — nested `<GlossaryTerm>` inside an Aside body renders as `<div>` during mdast→hast serialization, and `<div>` inside an inline `<span>` triggers the same hoist. Fix extended to unwrap nested block-level tags recursively.

This bug had been *latent in the platform* for months, only surfacing when chapter content was dense enough to expose it. **The pilot was the only mechanism that would have found it.**

**2. Mobile content overflow** at 375px viewport was 218px — pre-existing, also masked by simpler chapters. Three compounding defaults (`box-sizing: content-box`, `grid-template-columns: 1fr` not `minmax(0, 1fr)`, no `overflow-x: auto` on KaTeX / tables) added up to chapter content being wider than the viewport. Fixed in the hardening pass.

**3. CSS `counter-reset` doesn't reset sibling-visible counters.** Sprint G's first-attempt h2 rule used `counter-reset: sophie-subsection 0`, which per spec creates a new scoped counter on the h2 — sibling h3s never see the reset. Subsection numbering accumulated across Parts (3.6, 3.7, 3.8 in Part 3 instead of 3.1, 3.2, 3.3). Fix: `counter-set` modifies the existing in-scope counter rather than creating a new scoped instance. A subtle CSS-counters gotcha worth knowing about.

**4. Raw-HTML `<h2>` wrappers break Astro's heading extractor.** Sprint H's first attempt used `<h2 data-chapter-opener>` raw HTML to attach the attribute; the heading then disappeared from the in-page ToC because Astro's `headings[]` only walks markdown-syntax headings. Fixed via a small remark plugin (`transforms/chapter-opener.ts`) that walks markdown headings and stamps the attribute via `data.hProperties`.

**5. The chapter exercised a previously-implicit "first chapter dense enough to break things" criterion.** Of the ~12 hours of work this session, ~5 were debugging issues *no other smoke chapter would have surfaced*. The implication for ADR 0064: the second chapter migration should be *strategically different* — a structurally simple chapter (to verify the platform works at the easy end) and/or one with content that exercises a *different* density profile (lots of math, heavy MultiRep usage, multiple `<KeyEquation>` cross-refs in one paragraph). A second motivating-chapter-style migration would mostly re-prove what's already proven.

**6. The platform changes that fell out of this pilot are bigger than the chapter.** Two new top-level frontmatter fields (`chapter`, `reading`, `track`, `authors`, `updated`, `ai_contribution`). Four new components (`ChapterMeta`, `ScrollProgress`, `ChapterFooter`, `ChapterPagination`). One new pedagogy-index entity flavor (`KeyEquationUsageEntry` via `EquationCitationEntry.chapterNumber`). One new pedagogy-audit invariant family (CT-1, CT-2). One new mdast remark transform (`markChapterOpener`). One new component-runtime store (`equation-citations-store.ts`). Plus extensive CSS work in `textbook-layout.css` (counters, drop cap, ornament, mobile-overflow defenses, Tufte connectors). Most of this is reusable across future chapters; none of it was anticipated by the original plan.

## Recommendations + ADR backlog

These recommendations were the draft notes that became [ADR 0064](../decisions/0064-chapter-migration-playbook.md). Preserved verbatim; the ADR locked them as doctrine 2026-05-21.

**Ordered checklist a future chapter migration should follow:**

1. Inventory the source: shortcode usage, callout types, GlossaryTerm density (terms × definition asides per chapter), figure count, equation count, OMI-arc structure. Estimated 30–60 min per chapter.
2. Identify gaps against the shortcode dictionary (this report's first table). New gaps → file a platform issue *before* starting conversion; missing components are blocking, not optional.
3. Run the existing chapter through the smoke fixture's Playwright suite (or equivalent) at desktop + mobile + dark mode *before* depending on the chapter's specifics — to baseline what's expected to work.
4. Create the chapter as a stub with frontmatter only; verify `framing: "OMI"` (if applicable) does the OF-2 conformance check correctly. ~10 min.
5. Convert section by section, atomic commit per Part. Run `pnpm exec biome check` and `pnpm turbo run test --filter=@sophie/smoke` after each Part.
6. **Re-verify end-to-end after each Part lands**, including a quick pass through the rendered chapter to check for visual regressions or paragraph-split issues. This is what's expensive about migration — the pilot suggests dedicating 30% of the per-chapter budget to verification + bug-fixing.
7. Add the chapter to the relevant `astr201` module if shipping; otherwise hold in `examples/smoke` for staging.

**Estimated time per future chapter:** 4–6 hours per Part for a content-dense chapter (Sprint A8's "spectroscopy-style chapters"). Significantly less (2–3 hours per Part) for chapters without dense GlossaryTerm + inline-Aside patterns or extensive math. The pilot's actual total was much higher because of platform discovery — future chapters should not pay that cost.

**Required Sophie components for a typical chapter:** `<Figure>`, `<Callout>`, `<Aside>`, `<GlossaryTerm>`, `<KeyEquation>`, `<LearningObjectives>` + `<Objective>`, `<Predict>`, `<OMIFlow>` (if applicable), `<Intervention>` (for misconception chapters), `<ChapterGlossary>` aggregator. Nice-to-have but not blocking: `<ComprehensionGate>`, `<Reflection>`, `<FigureRef>`, `<EquationRef>`.

**Gap components that should be built before the next chapter migration:** `<Video>`, `<WorkedExample>`, `<DifficultyPath>` (or some Track-A / Track-B mechanism). All three are filed in the "Platform issues" section below; whether each blocks migration of a specific next chapter depends on that chapter's source.

**Required new ADRs from this pilot:**

- The current ADR draft list calls for **ADR 0064** (migration playbook). The contents of *this report* are most of its evidence base; ADR 0064 should turn this report into binding doctrine.
- Worth considering a follow-up ADR on **inline-context block-leak safety** as a general component-author guideline. Bug 1 was specific to GlossaryTerm but the pattern (dangerouslySetInnerHTML + markdown-rendered body + inline parent) could recur in any new component that does the same. Either codify the pattern (always use `stripWrappingParagraph` / a sanitizer) or change the rendering surface (pre-render at extractor-time as inline-safe HTML).

## Platform issues to file

These were noted in the original plan's Phase 3.3 list as "confirm scope with Anna before filing." None filed this session. Each warrants one issue against `drannarosen/sophie`. Per [ADR 0064](../decisions/0064-chapter-migration-playbook.md) §3 these **should** be filed before the next pilot starts.

1. **Doc-correction:** ADR 0063 + accepted-features §A8 name "Module 3" as the OMIFlow motivating chapter. Actual content is Module 2 Lecture 3. Update the ADR examples block.
2. **Gap: `<Video>` component.** Quarto's `{{< video URL >}}` shortcode. Even a thin `<iframe>`-with-aspect-ratio wrapper would unblock most future chapters.
3. **Gap: `<WorkedExample>` component.** Five worked examples in this chapter alone, approximated with `<Callout variant="deep-dive" title="Worked Example N — …">`. A dedicated component would carry epistemic role (a worked example is an observable → model → inference at miniature scale) and could be audited like OMIFlow.
4. **Gap: Track A / Track B branching.** The frontmatter `track` field (Sprint I-A) tags a chapter at the *whole-chapter* level. Per-section forking needs `<DifficultyPath>` or `<Track>` primitives — both unbuilt.
5. **Sophie audit warning CT-3 candidate:** the misconception graph currently flags unreferenced declarations; an analogous warning for *over-referenced* shortcodes or *unused* registered figures would help the migration workflow.
6. **Future, not blocking:** course-management chrome pack (`<Due>`, `<Points>`, `<Reading>`, `<Canvas>`, `<OfficeHours>`, `<Week>`) — defer until a second migration target is an index or homework page.

## Success criteria

- ✅ Lecture 3 reading converted with full pedagogy structure intact (every learning objective, every Quick Check, every misconception callout, every enrichment box).
- ✅ Chapter renders cleanly in Sophie's smoke fixture (build + biome + smoke tests clean; e2e Playwright tests pass).
- ✅ `framing: "OMI"` declared; OF-2 satisfied (5 `<OMIFlow>` callsites, all OF-1 strict-3-slot conformant).
- ✅ 3 equation entities created with biography children per ADR 0046 + ADR 0058.
- ⚠️ Platform-gap issues NOT filed (deferred — list above is ready to copy into `gh issue create`).
- ✅ Pilot report at `docs/website/pilots/m2-l3-spectra-composition.md` covering all sections requested by the plan.
- ⚠️ Anna has reviewed the chapter render but not yet the converted MDX source side-by-side with the original `.qmd`.
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/` (it stays a design source, not a target).
