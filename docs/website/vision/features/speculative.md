---
title: Speculative features
short_title: Speculative
description: Blue-sky ideas. We're considering whether they're worth pursuing. May never ship. Lowest writing bar; highest authenticity.
tags: [vision, features, speculative, blue-sky]
---

# Speculative features

Blue-sky ideas. We're considering whether they're worth pursuing.
May never ship; that's fine.

Promotion to [backlog](backlog.md) requires picking up a motivating
use case + design sketch + rough cost. See
[Transitions](../transitions/index.md) for the gate criteria.

## S1. Learning Arc Simulator / Course Load Map

**What it is.** Structural analysis of a course graph predicting
bottlenecks — which modules introduce too many new terms, which
chapters lack retrieval practice, where prerequisites pile up.

**Why it might matter.** A course-level "audit" beyond per-chapter
checks. Useful for AI authors thinking about pacing; useful for Anna
when refining Module N after teaching it once.

**Why it might not.** Real simulation requires real student data;
without it, the "simulator" is a heuristic dressed in fancy
language. The heuristic is plausibly captured by simpler audit
invariants (B3 Pedagogical Diff over the index could surface
new-term-count, equation density, prereq violations) without needing
"simulation" framing.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: B3 (Pedagogical Diff) ships, demonstrates the
  audit substrate is rich enough to support simulation OR a
  course-load-map artifact becomes useful in Phase 4 mid-sprint.

---

## S2. Student Confusion Forecast (AI-generated)

**What it is.** Auto-generated predictions of where students might
be confused in a given chapter, based on the chapter's content +
the misconception graph.

**Why it might matter.** A pedagogy-aware code review for chapters.
Could catch student-confusing language Anna wrote on autopilot.

**Why it might not.** AI hallucinates confusion patterns that don't
exist; misses real patterns Anna knows from teaching the course
five times. Better shape (in backlog as part of B6's Red-Team-the-
Chapter): a TDR template the instructor fills in with AI-suggested
*support*, not an AI predicting confusion authoritatively.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: Misconception Graph (A5) ships with real ASTR
  201 misconception entries + intervention library entries; THEN an
  AI-generated forecast has enough structured ground truth to be
  useful.

---

## S3. Learning Design Genome (declared per-chapter design metadata)

**What it is.** A per-chapter `learning_design:` frontmatter block
declaring `cognitive_load.new_terms`, `representations: [prose,
equation, plot, …]`, `target_misconceptions: [...]`, etc., as
authored metadata.

**Why it might matter.** Makes the *shape* of learning declarable
and queryable. Sounds rigorous.

**Why it might not.** Mostly redundant — these properties are
*derivable* from the chapter content via audit (count `<Aside>`s,
count `<KeyEquation>`s, count `<Figure>`s, scan misconception
references). Declared-metadata-that-mostly-repeats-observable-state
is *ceremony*, not value. Better shape: B3 Pedagogical Diff derives
all of this from existing schemas; no new authored metadata
required.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: real evidence that derived audit insufficient
  for some pedagogical analysis we can't do today. Probably never
  promotes.

---

## S4. Closed-loop pedagogy (anonymized student responses feed misconception graph)

**What it is.** Student responses to `<Predict>` / `<ConfidenceCheck>`
/ `<ComprehensionGate>` feed back (anonymized, opt-in) into the
misconception graph's prevalence field; chapters surfacing misconceptions
that persist post-instruction flag for revision.

**Why it might matter.** Closes the curriculum-design feedback loop.
The deepest version of Sophie's "evidence-based curriculum
improvement" claim.

**Why it might not.** Requires anonymized opt-in student data
infrastructure that doesn't exist; ethics + IRB framework needed;
storage + analytics tooling. All Phase 6+ scope per the roadmap.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: dual-profile build (Phase 5) ships AND a
  per-course ethics/IRB framework exists AND a real student cohort
  generates enough opt-in data to warrant the infrastructure.

---

## S5. Cohort comparison + SoTL analytics

**What it is.** Anonymized cross-cohort pedagogy-impact studies:
"Spring 2027 cohort showed 60% misconception persistence on X;
Spring 2028 cohort, after revised intervention, shows 30%."

**Why it might matter.** Big research opportunity; Sophie courses
become reproducible interventions whose impact is measurable.

**Why it might not.** Needs S4's data infrastructure + multiple
cohorts of opted-in data + statistical methods. Phase 6+; likely
Phase 7+.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: S4 ships first; THEN multi-cohort data exists.

---

## S6. Pedagogy Notebooks (demoted 2026-05-14)

**What it is.** A Jupyter-notebook-style artifact for curriculum
design: pedagogical goal → known misconception → teaching move →
AI brainstorm → instructor decision → final component selection,
all in one document.

**Why it might matter.** Makes invisible instructional design
visible as a working document.

**Why it might not.** Subsumed by Teaching Decision Records (A1 in
[accepted](accepted.md)). TDRs are the audit-trail-of-curriculum-
design artifact; a "pedagogy notebook" is essentially a draft TDR.
Don't build a separate artifact when one already does the job.

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog briefly
- 2026-05-14 — demoted to speculative; subsumed by A1 (TDRs)
- Promotion criteria: TDRs ship and don't capture some
  notebook-shaped need we can't yet articulate. Probably never
  promotes.

---

## S7. Lightweight engagement analytics for chapter authors

**What it is.** A page-view-level analytics layer for live Sophie
courses, separate from B9's outcome-side research telemetry. The
canonical implementation would be Umami Cloud's free tier (or
self-hosted Umami): cookie-less, no-PII, no consent-banner-required
page-view + time-on-page metrics. The signal it carries: "which
chapters got visited," "average time-on-chapter," "bounce rate per
chapter." Author-facing only — answers the "is the chapter landing
at all?" question without per-student tracking.

**Why it might matter.** Cheap visibility for chapter authors to
spot regressions ("Chapter 11 dropped from 28 visits to 12"). Useful
informal evidence for the teaching-effectiveness portion of a
tenure file ("students engaged with interactive figures at X% rate
across the semester"). Privacy-respecting by design, so adding it
doesn't compromise Sophie's local-first posture (per ADR 0007). One
hour of setup; ~$0/month at any plausible scale (free tier covers
thousands of students before paid-tier).

**Why it might not.** Three real costs that aren't on the bill:

1. **Cognitive overhead.** Even free dashboards add a thing to
   periodically check. For a pre-tenure astrophysicist whose binding
   constraint is research time, not money, an end-of-semester
   anonymous survey (Google Form, 5 min for students) gives richer
   *qualitative* signal than 14 weeks of quantitative dashboards.
2. **Gross-engagement-metrics rarely change decisions.** Page-view
   counts at 30 students don't reach statistical significance for
   anything. Author's own classroom observations + TA reports +
   end-of-semester survey already cover the "is this landing?"
   question at higher information density.
3. **Wrong stepping stone if/when DBER becomes part of the tenure
   case.** B9's structured outcome telemetry is the real research
   substrate. Umami-style page metrics aren't a precursor — they're
   an orthogonal layer that adds no infrastructure value to B9 if
   B9 ever ships.

Explicitly distinct from:

- **B9** (Learning Telemetry, outcome-side measurement): structured
  per-submission correctness, calibration deltas, time-on-task
  joined to chapter-version, IRB-gated. Research-grade.
- **S5** (Cohort comparison + SoTL analytics): multi-cohort
  longitudinal claims. Far-future.

**Estimated cost.** Trivially small — 1 hour to deploy Umami Cloud,
zero ongoing. The cost is attention, not engineering.

**Status.**
- 2026-05-17 — surfaced + explicitly skip-for-now during a session
  about how Anna would collect engagement data for ASTR 201 fa26.
  Anna recalibrated the framing: astrophysicist using Sophie as
  double-duty teaching infrastructure, not committed to DBER. End-
  of-semester anonymous survey covers the actual need; analytics
  adds attention-cost without proportional value at 30-student
  scale.
- Promotion criteria: any one of
  (a) class scales beyond ~100 students (informal awareness no
      longer feasible),
  (b) Anna's chair-mentor conversation confirms DBER/teaching-infra
      counts toward tenure AND survey-only evidence proves
      insufficient,
  (c) Sophie hosts a course with shared instructor team where
      asynchronous engagement signal is the only viable check.

---

## S8. Sonification components (`<Sonification>` over time-series)

**What it is.** A `<Sonification src="…" mode="pitch-mapped" />`
source component that maps an astronomy time-series — light curve,
radial-velocity curve, pulsar timing residuals, asteroseismic mode
spectrum, gravitational-wave strain — to Web-Audio output. Web Audio
API + a thin Sophie wrapper component. Students click play and
*hear* the signal in addition to (or alongside) seeing it plotted.

**Why it might matter.** Astronomy is the field where sonification
has the deepest pedagogical precedent and the cleanest data inputs.
Wanda Díaz Merced's pioneering work using sound to analyze
astrophysical signals, the
[Audio Universe](https://www.audiouniverse.org/) exoplanet-tour
project, NASA's [Universe of Sound](https://chandra.harvard.edu/sound/)
Chandra sonifications, and the LIGO chirp-audio clips for
gravitational-wave events all show the same thing: periodicity,
beat patterns, and frequency relationships are *easier to hear than
see*. Same component primitive would serve transit detection (Module
2), pulsar timing + asteroseismology (stellar-evolution module), and
gravitational-wave chirps (cosmology module). The accessibility win
for low-vision students is real but isn't the headline — the
epistemic win is that students perceive the signal directly, on a
modality the plot can't reach.

**Why it might not.** Additional source component to author + maintain
(extractor, audit invariant, axe-core test). Anna is not committing
to building it in ASTR 201 fa26; nothing in the existing chapter
list requires audio to land the concept. Risk that one-off use cases
don't pay back the component cost.

**Estimated cost.** Small — ~1-2 days for component + extractor +
audit invariant + axe-core. Web Audio API is mature and stable;
no novel research required.

**Status.**
- 2026-05-17 — surfaced (speculative) during the multimedia portfolio
  brainstorm. Deferred to preserve Cottrell + CAREER bandwidth for
  sp/fa26.
- Promotion criteria: a specific chapter (likely transit detection
  in Module 2 or pulsar timing in the stellar-evolution module) has
  a documented use case where the visual representation is
  ambiguous and audio resolves it. Build the component when the
  first concrete chapter authoring needs it, not before.

---

## S9. Historical-source guided readings (`<HistoricalSource>`)

**What it is.** A `<HistoricalSource year="1929" authors="Hubble">`
source component that wraps the *original published figure*
(extracted from NASA ADS / NED PDFs) with Anna's modern annotation
overlay. Canonical use cases for ASTR 201: Russell 1913 HR diagram,
Hertzsprung 1911 color-magnitude diagram, Hubble 1929 velocity-
distance diagram, Penzias & Wilson 1965 CMB measurement, Leavitt
1912 period-luminosity relation.

**Why it might matter.** Makes the observable → assumption →
inference chain *visible at the moment science actually made it*.
Reasoning-OS-aligned ([ADR 0058](../../decisions/0058-epistemic-component-contract.md))
— historical figures are an unusually clean substrate for the
eight-role contract because the original authors had to make every
assumption and inference explicit in a way modern textbooks elide.
Differentiation moat against generic textbooks: no competitor
embeds original figures with role-coded epistemic annotation.
AI-authorable: Anna provides the citation + key claim, AI proposes
annotation structure, Anna redlines.

**Why it might not.** Authoring cost per historical source is real
(locate clean scan via ADS, write annotation prose tying original
data to modern values, write epistemic context bridging old notation
to current). Cumulative across modules — a "historical source per
chapter" cadence would be ~12-15 sources for ASTR 201. Manageable
but not free.

**Estimated cost.** Component itself is small (~3-4 days). Per-source
authoring is ~1-2 hours each. Total commitment is the authoring
cost, not the platform cost.

**Status.**
- 2026-05-17 — surfaced (speculative) during the multimedia portfolio
  brainstorm.
- Promotion criteria: one chapter is manually authored in this
  shape — most likely Hubble 1929 in the cosmology module, where
  the redshift-distance argument is *especially* visible in the
  original figure — and the affordance proves epistemically
  distinctive compared to a generic figure caption.

---

## S10. Astronomy-native image-tour embeds (`<SkyTour>`)

**What it is.** A Sophie wrapper component around mature astronomy
catalog/atlas tools — [Aladin Lite](https://aladin.cds.unistra.fr/),
[ESASky](https://sky.esa.int/), and the
[WorldWide Telescope](https://worldwidetelescope.org/) — that
records *tour stops* (named coordinates + zoom level + caption) so
embeds aren't just free-pan widgets. Authoring shape:

```mdx
<SkyTour provider="aladin">
  <TourStop coords="13h29m52.7s +47°11′43″" zoom="3'" survey="HST">
    M51 — the Whirlpool Galaxy, a classic grand-design spiral.
  </TourStop>
  <TourStop coords="03h32m22s +47°37′" zoom="0.5°" survey="JWST">
    The Pillars of Creation in M16, as JWST sees them in IR.
  </TourStop>
</SkyTour>
```

**Why it might matter.** Solves the image-tour use case that Manim
handles poorly. ImageMobject pans are stiff; Manim's vector-first
DNA fights photographic imagery. These astronomy-native tools
already work — they're embeddable today via iframe — and they use
*real catalog data* (HST, JWST, SDSS, Gaia overlays) that updates
without authoring effort. The Sophie value-add is the tour-stop
authoring layer + chapter-chrome integration.

**Why it might not.** Three viable upstream tools (Aladin, ESASky,
WWT); choosing one is load-bearing because cross-tool tour-stop
portability is non-trivial. Authoring cost per tour is real (find
canonical objects, write captions, calibrate zoom). No ASTR 201
chapter has a *critical* unmet need today — image tours could land
as plain iframes pending demand.

**Estimated cost.** Small-medium (~3-4 days for wrapper + tour-stop
schema + accessibility tests). Higher if cross-provider portability
is in scope (probably not v1).

**Status.**
- 2026-05-17 — surfaced (speculative).
- Promotion criteria: a chapter in the galaxies or cosmology module
  has an image-tour use case Manim cannot serve, *and* a plain
  iframe is too low-affordance for the pedagogical job (students
  need guided stops, not free pan).

---

## S11. `sophie podcast` pipeline (role-grounded NotebookLM-shape)

**What it is.** A `sophie podcast <chapter>` CLI command that
generates a NotebookLM-shape two-host conversational podcast script
from structured chapter source (pedagogy index, role-contract
annotations, misconception graph, equation biographies), then pipes
to a pluggable TTS service ([ElevenLabs](https://elevenlabs.io/),
[OpenAI gpt-4o-mini-tts](https://platform.openai.com/docs/guides/text-to-speech),
or open-source [Coqui TTS](https://github.com/coqui-ai/TTS))
to produce mp3. Sister speculative entry to the
[NotebookLM how-to recipe](../../how-to/notebooklm-recipe.md)
which is the cheap-path-today alternative.

**Why it might matter.** Sophie's structured chapter source gives a
self-hosted pipeline a substantive accuracy advantage over
NotebookLM's prose-only grounding. NotebookLM has to infer the
epistemic structure of a chapter from its prose surface; a Sophie-
aware pipeline reads role-coded source directly — observable,
model, inference, misconception are *labeled at the schema level*,
not pattern-matched from text. Self-hostable, no Google dependency,
useful for OSS-adopting Sophie instructors who want NotebookLM
quality without the closed-platform reliance.

**Why it might not.** [NotebookLM](https://notebooklm.google.com/)
already covers Anna's personal use case effectively for free (Path
1 from the brainstorm). The `sophie podcast` pipeline (Path 2) only
earns its place if one of three triggers fires:

1. NotebookLM's terms degrade (paywall, retention change, API
   changes) such that the free workflow stops working.
2. Sophie gains real adopting instructors who need a self-hostable
   equivalent for institutional or licensing reasons.
3. The role-grounded-script accuracy claim is validated against
   NotebookLM in a controlled comparison and proves substantively
   better — at which point the pipeline becomes a Sophie
   differentiation claim, not just a fallback.

None of these are true in 2026-05. All are plausible in 18 months.

**Estimated cost.** Medium — roughly 1-2 weeks of focused work
covering prompt design, pedagogy-index grounding, TTS pipeline, and
audio embed chrome. Hard to justify pre-tenure while NotebookLM works.

**Status.**
- 2026-05-17 — surfaced (speculative). For ASTR 201 sp/fa26, Anna
  will record her own voice as chapter audio (no synthetic pipeline
  needed at small-class scale). The
  [NotebookLM recipe](../../how-to/notebooklm-recipe.md) covers
  students as a study-aid path and adopting instructors as a cheap
  fallback.
- Promotion criteria: any of (a) NotebookLM terms degrade,
  (b) ≥1 adopting Sophie instructor explicitly needs a self-hosted
  podcast pipeline, or (c) a controlled comparison shows the role-
  grounded-script approach produces substantively more accurate
  pedagogical audio than NotebookLM's prose-grounded approach.

See also:
[multimedia portfolio map](../design/multimedia-portfolio.md) — the
brainstorm output that produced S8-S11.

---

## S12. Sophie-to-Manim authoring bridge

**What it is.** A CLI tool — call it `sophie manim scaffold
<chapter>` — that reads Sophie's structured chapter source and
emits a Manim CE script skeleton ready for AI redlining + human
review. Three structural inputs already exist in Sophie source
and map cleanly onto Manim's authoring needs:

- [`<EquationBiography>`](../../decisions/0046-equation-biography.md)
  blocks declare the assumption / break-when / common-misuse
  structure of each equation. That's the *narrative scaffold* of
  a derivation-clip script — which substitution comes when, under
  which assumption, which approximation gets relaxed at which
  step.
- The
  [pedagogy index](../../decisions/0038-pedagogy-index-pattern.md)
  serializes chapter narration structure (key insights, asides,
  misconception flags). That's the cue-point sequence for
  `self.next_slide()` calls in `manim-slides` output, plus
  candidate breakpoints for narrated pacing.
- The
  [epistemic role contract](../../decisions/0058-epistemic-component-contract.md)
  defines the observable / model / inference / approximation
  vocabulary that maps onto Manim's
  `set_color_by_tex_to_color_map({...})` — the
  [role-coded animation thesis](../design/manim-program.md#id-3-the-role-coded-animation-thesis)
  in the Manim program doc.

The bridge takes those three substrates and produces a derivation-
skeleton .py script: `MathTex` calls in the right order, the
role-color map declared at the top, `next_slide()` boundaries
placed at narrated breakpoints, and `TransformMatchingTex` calls
between consecutive equations. The script is a *starting point*,
not a finished clip — Anna (or AI orchestrator) refines geometry,
pacing, and visual choreography from there.

**Why it might matter.** Highest-leverage future move in the
Manim program. Turns Sophie's existing schema'd chapter source
into Manim authoring fuel, dramatically lowering the per-clip
authoring cost. If full-semester Manim coverage becomes a goal
(promotion criterion from
[Manim Phase 1](../design/manim-program.md#id-6-phase-1-commitment-module-1-pilot)),
manual authoring at ~1-4 hours per clip × 12 chapters becomes
the binding constraint; a scaffold bridge collapses much of that
to AI-generates-skeleton + Anna-redlines. Also a real
differentiation claim — no competing platform turns its content
schema into animation source.

**Why it might not.** Two real risks:

1. **No manual baseline yet.** The bridge is only valuable if
   the manual authoring patterns are clear enough to encode in a
   template. The Phase 1 Module-1 pilot must ship first; the
   pilot teaches us which manual patterns are stable enough to
   automate vs. which need human judgment per clip.
2. **AI-orchestrated authoring may already be good enough
   without the bridge.** If GPT-class models can write a working
   Manim script from a one-paragraph prompt + an
   `<EquationBiography>` paste, the bridge's value-add is
   marginal — the AI is already doing the schema-to-script
   translation in-prompt. The bridge earns its place only if
   structured-input-driven generation is meaningfully more
   reliable than free-form prompting.

**Estimated cost.** Medium-large. The translation logic is real
engineering work (schema parsing, Manim-AST generation,
role-color application), probably ~2-3 weeks of focused work
even with AI assistance. Not free.

**Status.**
- 2026-05-17 — surfaced (speculative) during the Manim program
  brainstorm. The [Manim program doc](../design/manim-program.md#id-7-forward-looking-enables)
  flags this as the highest-leverage forward-looking enable.
- Promotion criteria: Phase 1 Module-1 pilot ships AND the
  manual authoring patterns prove stable enough across subtypes
  that a template-driven scaffold is meaningfully cheaper than
  free-form AI prompting from the chapter source. If free-form
  AI prompting suffices, this stays speculative indefinitely.

See also:
[Manim program](../design/manim-program.md) — the vision doc this
speculative entry forward-references.
