---
title: Multimedia portfolio
short_title: Multimedia
description: The strategic landscape map for pedagogical multimedia in Sophie astronomy textbooks — three time-axes (linear, interactive, dialog), five Sophie-specific dimensions, and a four-bucket triage (active / speculative / interesting-but-not-yours / off-strategy). Manim is the cinematic appendix, not the spine.
tags: [vision, design, multimedia, pedagogy, portfolio, manim, sonification, interactive-figures]
---

# Multimedia portfolio

The strategic landscape map for pedagogical multimedia in Sophie
astronomy textbooks. This doc names the genres available to Sophie
authors, assigns each to a bucket (active / speculative / interesting-
but-not-yours / off-strategy), and explains the reasoning. It's the
canonical "should Sophie add X?" reference.

Produced from the 2026-05-17 multimedia brainstorm. Pairs with
[`interactive-figure-target.md`](interactive-figure-target.md)
(the spec for Sophie's primary interactive surface),
[`speculative.md` entries S8-S11](../features/speculative.md)
(the deferred-but-tracked multimedia components), and
[`how-to/notebooklm-recipe.md`](../../how-to/notebooklm-recipe.md)
(the cheap-path audio recipe).

## §1 — Why this doc exists

A textbook platform that wants to differentiate on pedagogy needs a
deliberate multimedia strategy — but the space of "things you could
add" is enormous, and many of those things are real-but-wrong-for-
Sophie. Without a canonical map, every new multimedia idea re-
litigates from scratch ("what about a podcast? what about a
sonification? what about a VR planetarium?"). This doc is the map.
It exists so future Anna, future Claude, and adopting Sophie
instructors have a single place to look up *why* the platform takes
Manim seriously and *why* it doesn't take generative AI video
seriously.

The doc is also a teaching artifact. Anna is an astrophysicist, not
a multimedia-pedagogy researcher. Each genre below gets a concrete
description and a link to a canonical example, so a reader unfamiliar
with the genre can go see or hear what it actually is before judging
the bucket assignment.

## §2 — Three time-axes (the core pedagogical framing)

The dimension that actually separates multimedia genres for learning
isn't *visual vs. audio* — it's the **student's relationship to time**.
Three categories:

**Linear-time media.** Author controls pacing; student is a
passenger. Examples: a Manim derivation animation, a recorded
mini-lecture, a podcast episode, a sonification clip of a light
curve. Strengths: high information density per minute, cinematic
sequencing, deliberate emphasis. Weaknesses: no replay-at-the-
sticky-part affordance (well, scrubbing exists, but it isn't
designed-in); cognitive load is set by the author, not the student.

**Interactive-time media.** Student controls pacing; pacing
is an affordance, not a default. Examples: a Sophie interactive
figure with sliders ([`<BlackbodyExplorer>`](interactive-figure-target.md)),
a simulation, an Aladin Lite sky tour, a code playground. Strengths:
students can dwell on the part that doesn't yet make sense, sweep
parameters to build intuition, replay individual steps. Weaknesses:
no narrative through-line; the author can't guarantee the student
visits the load-bearing moments in order.

**Dialog-time media.** Pacing is negotiated turn-by-turn. Examples:
an AI-Socratic tutor that asks follow-up questions, a NotebookLM
"Audio Room" interactive Q&A session, a study-buddy chat. Strengths:
adaptive to the individual student's confusion, can probe
misconceptions in real time. Weaknesses: scaffolding requires
authored decision trees or grounded AI to avoid drift; auditability
is harder.

The three impose different cognitive loads and serve different
pedagogical moments. **A balanced chapter uses all three**,
weighted toward interactive at Sophie's small-class scale (where
instructor presence in person covers some of what dialog-time
media would otherwise do). The bucket assignments below follow
from this principle.

## §3 — Dimensions that matter for Sophie specifically

Beyond the three time-axes, five Sophie-specific dimensions shape
the triage:

1. **AI-authorability.** Can the genre be primary-authored by AI per
   [ADR 0030](../../decisions/0030-audience-and-ai-author-model.md)?
   Manim scripts: yes. Veritasium-style talking-head video: no
   (humans-only). Interactive figures: yes (component code is
   AI-tractable). This dimension does most of the work in the
   "interesting but not yours" bucket.
2. **Maintenance burden over time.** Does the artifact rot when the
   chapter content shifts? Recorded human-voice videos rot worst;
   declarative AI-authorable artifacts rot least.
3. **Astronomy-fit.** Does the genre land on data Anna actually has
   access to — spectra, light curves, images, catalogs? Sonification
   has unusual astronomy-fit. AR overlays have weaker astronomy-fit
   in a desktop-textbook context.
4. **Reuse across surfaces.** Can the artifact serve in a chapter,
   on a slide deck, in an LMS export, and on a handout? Manim clips
   travel well (via manim-slides). Live interactive figures don't
   travel to handouts but do travel to slides.
5. **Declarability as a role-coded Sophie component.** Per
   [ADR 0058](../../decisions/0058-epistemic-component-contract.md),
   Sophie's reasoning-OS thesis says non-prose surfaces should be
   declared as role-coded components. Interactive figures qualify;
   sonification components qualify; raw mp4 files don't.

The five dimensions interact. Manim, for instance, is high on AI-
authorability + reuse, low on declarability-as-component (it's a
linear video, not a Sophie component), and moderate on astronomy-fit.
Its overall verdict isn't a simple sum — it's a deliberate exception
(see §5).

## §4 — The four buckets

Each genre below gets a one-sentence description, an honest verdict,
a link to a canonical example, and a bucket assignment.

### Bucket A — Active (locked or in-flight)

These are the genres Sophie commits to today.

- **Manim clips.** Programmatic animation of mathematical objects
  via Python; canonical example is
  [3Blue1Brown](https://www.youtube.com/@3blue1brown) on YouTube, and
  the maintained open-source library is at
  [manim.community](https://www.manim.community/). *Sweet spot:*
  derivations and narrated worked examples with faded scaffolds —
  expanded into an eight-subtype catalog
  (algebraic derivations, geometric proofs, calculus walkthroughs,
  limit-case animations, dimensional analysis, numerical-method
  walkthroughs, faded-scaffold worked examples, comparison overlays).
  See [`manim-program.md`](manim-program.md) for the full Manim
  vision — the subtype catalog with ASTR 201 examples, the
  role-coded animation thesis, the astronomy-specific affordances
  (`ImageMobject` + astropy/FITS, numpy-driven Mobjects), the
  `manim-slides` reuse story, and the Phase 1 Module-1 pilot
  commitment. *Not the spine:* image tours, parameter sweeps (use
  interactive figures), photographic-imagery storytelling. See §5
  for the cinematic-appendix thesis.
- **Interactive figures.** Sophie's primary multimedia surface; the
  spec lives in
  [`interactive-figure-target.md`](interactive-figure-target.md),
  the linked-parameter primitive in
  [ADR 0059](../../decisions/0059-linked-representation-state-primitive.md),
  and the first typed astronomy figure is `<BlackbodyExplorer>`.
  Concrete example genre on other platforms: PhET's
  [interactive simulations](https://phet.colorado.edu/) (though
  Sophie's are role-coded, declarative, and embedded in chapter
  prose rather than standalone applets).
- **Your-voice chapter audio.** Anna's own recorded narration per
  chapter, embedded via plain HTML5 `<audio>` tag. No new component
  primitive; YAGNI until ≥2 adopting Sophie instructors need a
  shared affordance. At sub-100-student class scale, parasocial
  rapport with a familiar voice beats synthetic audio.

### Bucket B — Speculative (worth tracking)

These earn full entries in
[`speculative.md`](../features/speculative.md). Each has clear
promotion criteria.

- **S8 Sonification components.** Mapping astronomy time-series to
  Web-Audio output. Canonical examples:
  [NASA's "Universe of Sound"](https://chandra.harvard.edu/sound/)
  Chandra sonifications, the
  [Audio Universe](https://www.audiouniverse.org/) exoplanet-tour
  project, and Wanda Díaz Merced's pioneering work using sound to
  analyze astrophysical signals. The astronomy-fit is unusually
  strong — periodicity and beat patterns are easier to hear than
  see. Deferred to preserve Cottrell + CAREER bandwidth for sp/fa26.
- **S9 Historical-source guided readings.** Wrapping the *original
  published figure* (e.g., Hubble 1929's velocity-distance diagram,
  available via [NASA ADS](https://ui.adsabs.harvard.edu/)) with
  modern annotation overlay. Underwrites the Reasoning-OS thesis —
  students see role-contract reasoning at the moment science
  actually made it. Authoring cost is real; deferred until one
  chapter proves the affordance.
- **S10 Astronomy-native image-tour embeds.** Wrappers around mature
  catalog/atlas tools — [Aladin Lite](https://aladin.cds.unistra.fr/),
  [ESASky](https://sky.esa.int/), and the
  [WorldWide Telescope](https://worldwidetelescope.org/) — that
  record *tour stops* (named coordinates + captions). Solves the
  image-tour use case Manim handles poorly. Deferred until a
  chapter has a critical need a plain iframe can't serve.
- **S11 `sophie podcast` pipeline.** A NotebookLM-shape conversational
  podcast generator grounded on Sophie's role-coded chapter source.
  Self-hosted alternative to [NotebookLM](https://notebooklm.google.com/).
  Deferred because NotebookLM covers the immediate need (see
  [`how-to/notebooklm-recipe.md`](../../how-to/notebooklm-recipe.md));
  promotion criteria are documented in `speculative.md`.

### Bucket C — Interesting but not yours

These are real multimedia genres with real pedagogical value — they
work for someone, just not for Sophie's astronomy slice at Anna's
constraints.

- **Talking-head explainer videos** (the
  [Veritasium](https://www.youtube.com/@veritasium) /
  [Crash Course](https://thecrashcourse.com/) shape). High charisma
  payoff, but human-only authoring (no AI primary-author), and the
  artifact rots when chapter content updates. Cost-prohibitive at
  pre-tenure pace.
- **WebGL / Three.js 3D scenes** for stellar interior cutaways,
  accretion disk geometries, galaxy renderings. Beautiful when done
  well (see [chromoscope.net](https://www.chromoscope.net/) for a
  Sophie-adjacent example), but each scene takes substantial artist
  time. Without existing open-source assets, not tractable.
- **AR (augmented reality) sky atlases.** Phone-camera overlays
  showing constellations as you point at the sky.
  [Stellarium Mobile](https://stellarium.org/) already does this
  well — don't reinvent. Out-of-scope for desktop-textbook context
  anyway.
- **Detective / mystery game narratives** ("you are a 1923
  astronomer; what do you conclude from this Cepheid data?"). High
  authoring cost per narrative; the historical-source pattern (S9)
  captures the same energy at much lower cost.
- **Real-time multiplayer quizzing** (Kahoot, Quizlet Live, PollEv
  multi-player modes). Poll Everywhere already covers this for
  in-class peer instruction in ASTR 201 — not a Sophie surface.

### Bucket D — Off-strategy (explicit no with reasoning)

These do *not* earn a slot. If they come up again, this is the
canonical reference for why.

- **Generative AI video** (e.g., [Sora](https://openai.com/sora),
  [Runway Gen-3](https://runwayml.com/), Google Veo). Physics
  violations remain rampant in 2026 — generated water flows
  uphill, orbital dynamics violate Kepler's third law,
  electromagnetic spectra are color-mapped incorrectly. Not
  trustworthy for STEM content. May become viable post-2027 with
  physics-aware models; revisit then.
- **VR planetarium experiences.** Operationally infeasible at
  30-student undergrad scale (headset logistics, motion sickness,
  cleaning, accessibility). Existing planetarium software is the
  right shape; Sophie isn't a hardware platform.
- **Embedded Jupyter (Binder / JupyterLite) in ASTR 201.** Too
  heavy for a conceptual non-coding course. Different conversation
  for ASTR 596 (computational astrophysics). The CodeMirror cell
  ([ADR 0018](../../decisions/0018-codemirror-6-for-codecell.md))
  covers the lighter "type a calculation, see the result" need
  without a full kernel.
- **AI-generated personalized analogies** ("you said you like
  music; here's a music-themed astronomy analogy"). Gimmicky at
  30-student scale; the per-student personalization win is
  invisible relative to the per-chapter authoring cost. Useful
  only at MOOC scale (10⁴+ students).

## §5 — The Manim-is-the-cinematic-appendix thesis

Look at Bucket A. Notice the pattern: interactive figures,
your-voice audio, and the four Bucket B speculative entries (S8-S11)
all share a structural commitment — they're *declarative source
components* that Sophie can audit, diff, and AI-author against.
Manim clips don't share this commitment. They're mp4 files; they
sit *outside* Sophie's reasoning-OS contract; they can't be diffed
by `sophie diff`, can't be queried by the pedagogy index, can't be
extracted to JSON.

This isn't a bug. It's a deliberate exception. Manim's animated-
LaTeX-transformation vocabulary — `TransformMatchingTex`, `Write`,
`FadeIn`, the whole choreography of *one mathematical object morphing
into another over time* — is **peerless** for derivation storytelling
and is not reproducible by any declarative component. The closest
alternatives ([Motion Canvas](https://motioncanvas.io/),
[Remotion](https://www.remotion.dev/), matplotlib `FuncAnimation`)
either lack the math-transformation vocabulary or impose a different
authoring model. For derivations, Manim is correct.

Therefore: **Manim is the cinematic appendix to Sophie's reasoning-
OS thesis, not the spine.** Sophie's multimedia distinguishing claim
is "everything that earns its place is a declarative role-coded
component." Manim is the one place Sophie reaches outside that
claim, because the alternative would be authoring derivations in a
declarative shape no one has invented yet. Manim earns its exception
status by being uniquely good at the one thing — and only that one
thing.

Operationally, this means Manim clips are used *narrowly* in ASTR
201: derivations and narrated worked examples with faded scaffolds.
Parameter sweeps, image tours, and other "video-shaped" pedagogical
moments belong to declarative components (interactive figures, sky
tours, sonification clips).

**Narrow ≠ shallow.** "One genre, used narrowly" doesn't mean "one
or two clips." The
[Manim program doc](manim-program.md) catalogs eight distinct
content subtypes within the derivation-and-worked-example category
(algebraic derivations, geometric proofs, calculus walkthroughs,
limit-case animations, dimensional analysis, numerical-method
walkthroughs, faded-scaffold worked examples, comparison overlays),
plus the role-coded animation thesis that makes Sophie's Manim
clips distinctive. The exception-status framing is about
*declarative-component contract scope*, not about how much
substance Manim carries. Inside its lane, the Manim program is
broad and pedagogically deep.

## §6 — Manim-alternatives surveyed (and rejected, for now)

For completeness, the alternatives considered and the reasoning
for why each was rejected today.

- **[Motion Canvas](https://motioncanvas.io/)** — TypeScript-based,
  signal-driven, in-browser real-time preview. Major Sophie-fit
  argument: TS-native, would live inside the existing `@sophie/*`
  toolchain rather than introducing Python. *Rejected (today):*
  Manim's math-transformation vocabulary is still substantially
  ahead. Python via [uv](https://docs.astral.sh/uv/) is already in
  Sophie's stack ([ADR 0012](../../decisions/0012-uv-python-tooling.md))
  so the toolchain argument is weaker than it appears. Revisit in
  18 months as Motion Canvas matures.
- **[Remotion](https://www.remotion.dev/)** — React video-as-code.
  *Killer Sophie-fit thesis:* the same `<BlackbodyExplorer>` that
  renders interactively in a chapter could also render to mp4
  frames in a Remotion scene — single source of truth for figure +
  video. *Rejected (today):* Manim's math polish doesn't come for
  free; you'd hand-roll a `TransformMatchingTex` equivalent. Worth
  re-evaluating if a Phase 6+ "interactive figure → video"
  pipeline becomes a real authoring need.
- **matplotlib `FuncAnimation`** — pure-Python animation in the
  scipy ecosystem. *Rejected:* fine for one-off parameter sweeps,
  no storytelling layer, no LaTeX-transformation vocabulary.
  Already available in the stack for ad-hoc use; not a
  pedagogically-strategic primitive.
- **Blender + Python scripting.** *Rejected:* unmatched for true 3D
  but Anna's not going to invest the learning curve. Out-of-scope
  unless someone open-sources astronomy-relevant assets (galaxy
  models, stellar surfaces, accretion-disk geometries) that
  Sophie could embed.
- **Adobe After Effects / DaVinci Resolve / Premiere.** *Rejected:*
  not AI-authorable, not source-controllable, not diffable. Wrong
  shape for Sophie's workflow regardless of expressive ceiling.

## §7 — How to use this doc

When a new multimedia idea surfaces, triage it through this map:

1. **Where does it land on the three time-axes** (§2)? Linear?
   Interactive? Dialog? A balanced chapter wants all three; if the
   idea adds to a thinly-covered axis, it's worth more consideration.
2. **How does it score on the five dimensions** (§3)? Particularly:
   is it AI-authorable, and is it declarable as a role-coded Sophie
   component?
3. **Which bucket does it fall into** (§4)?
   - **Bucket A:** if it's commit-now-worthy and not already covered.
     Propose an ADR.
   - **Bucket B:** if it earns tracking but isn't ready to ship.
     Write a [`speculative.md`](../features/speculative.md) entry
     using S7's template (what / why-might / why-might-not / cost /
     status with promotion criteria).
   - **Bucket C or D:** this doc is the canonical "no, and here's
     why." Update §4 if the reasoning shifts.

The four-bucket structure is itself revisable. If a Bucket C item
becomes more relevant (e.g., because asset libraries mature for
WebGL 3D, or because content-update churn drops to where talking-
head videos become tractable), promote it. If a Bucket A item
underperforms in practice, demote it.

## §8 — Related reading

- **[ADR 0058 — Epistemic component contract](../../decisions/0058-epistemic-component-contract.md)**
  — the eight-role taxonomy that underwrites the "declarative role-
  coded component" claim in §5.
- **[ADR 0059 — Linked-representation state primitive](../../decisions/0059-linked-representation-state-primitive.md)**
  — the interactive-figure foundation referenced in Bucket A.
- **[`interactive-figure-target.md`](interactive-figure-target.md)**
  — the spec for Sophie's primary multimedia surface; this portfolio
  doc sits one level above it strategically.
- **[`speculative.md` entries S8-S11](../features/speculative.md)**
  — the four Bucket B genres with full what/why/cost/promotion-
  criteria detail.
- **[`how-to/notebooklm-recipe.md`](../../how-to/notebooklm-recipe.md)**
  — the cheap-path audio recipe (NotebookLM today; `sophie podcast`
  pipeline tomorrow per S11).
- **[Reasoning-OS thesis](../reasoning-os/index.md)** — the broader
  framing in which "multimedia as role-coded component" is one
  piece.
