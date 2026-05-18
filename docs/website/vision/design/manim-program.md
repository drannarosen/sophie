---
title: Manim program
short_title: Manim
description: Sophie's animated-derivation program. What Manim is, what it enables for astronomy pedagogy, the eight-subtype content catalog with concrete ASTR 201 examples, the role-coded animation thesis, and the Module-1 pilot commitment that grounds the workflow design.
tags: [vision, design, manim, animation, pedagogy, derivations, slides, reasoning-os]
---

# Manim program

The deep dive on Manim in Sophie. Where
[`multimedia-portfolio.md`](multimedia-portfolio.md) maps the full
multimedia landscape, this doc zooms in on the one genre Sophie
reaches *outside* its declarative-component contract: animated
mathematical derivations. It captures what Manim is, what it enables
for astronomy pedagogy, the eight-subtype content catalog with
concrete ASTR 201 examples, the role-coded animation thesis that
makes Manim-in-Sophie distinctive, and the Module-1 pilot
commitment that anchors workflow design.

The portfolio doc establishes *why* Manim earns an exception slot.
This doc establishes *what* Sophie does with that slot.

## §1 — What Manim actually is

**Manim** is a programmatic mathematical-animation library. You
write Python describing scenes, animations, and transitions; Manim
renders each frame to mp4. The library was originally built by
Grant Sanderson for the
[3Blue1Brown](https://www.youtube.com/@3blue1brown) YouTube channel —
the canonical reference for what the genre looks like at its best —
and the maintained community fork lives at
[manim.community](https://www.manim.community/) as Manim CE.

The genre's signature affordance is **`TransformMatchingTex`**: one
LaTeX equation morphs into another with matched terms moving
smoothly between positions. Where a static figure shows the
"before" and "after" of an algebraic step, a `TransformMatchingTex`
animation shows the *mechanics* — which symbols stayed put, which
moved, which combined, which cancelled. For derivation pedagogy
this is the entire game.

Two related affordances complete the core vocabulary:

- **`Write`** — a new piece of text or equation draws itself into
  existence one stroke at a time. Pacing matches how a human would
  write it on a whiteboard.
- **`FadeIn` / `FadeOut`** — show or hide whole objects with
  controlled opacity transitions. The grammar of "and now we
  introduce this term" or "we'll drop this approximation now."

Everything else in Manim's vocabulary — `Line`, `Angle`, `Circle`,
`Axes`, `ValueTracker`, `Updater`, `ImageMobject`, `Polygon` —
builds the geometric and data scaffolding around these three
animation primitives.

**Why programmatic, not keyframe-based?** Programmatic animation
matters specifically because **AI can write Python reliably**. An
LLM can take a short prompt like *"animate the derivation of
Wien's law from $\partial B_\lambda / \partial \lambda = 0$ in
about 90 seconds"* and produce ~80 lines of working Manim. The
same prompt cannot be reliably turned into After Effects timelines
or Premiere keyframes — those tools' state lives in opaque project
files, not in source code. Manim's text-source contract is what
makes it tractable inside Sophie's AI-author-primary workflow
([ADR 0030](../../decisions/0030-audience-and-ai-author-model.md)).

## §2 — What Manim enables: the eight-subtype catalog

ASTR 201's pedagogical surface has eight distinct subtypes of
animated content where Manim is the right tool. Each subtype gets
a concrete example below — the canonical ASTR 201 use case that
defines the subtype's shape.

### 1. Algebraic derivations

The bread-and-butter. A string of equalities, each one a
substitution or rearrangement, with `TransformMatchingTex`
choreographing the term-by-term flow.

**Canonical example:** *Stefan-Boltzmann from Planck integration.*
Start with $B_\lambda(T) = \frac{2hc^2}{\lambda^5}
\left(e^{hc/\lambda k_B T} - 1\right)^{-1}$. Integrate over all
$\lambda$ (showing the integral bounds materialize, the
substitution $u = hc / \lambda k_B T$ animate in), arrive at
$\sigma T^4$ with $\sigma$ revealed as an explicit combination of
fundamental constants. ~3 minutes, almost entirely
`TransformMatchingTex` with `Write` for new terms.

### 2. Geometric / trigonometric proofs

Diagrams that build up step by step — points appearing, lines
drawing themselves in, angles marked, similar triangles highlighted —
typically with a parallel `MathTex` derivation animating beside the
diagram.

**Canonical example:** *Parallax → parsec definition.* Earth's
orbit animates around the Sun; a baseline 1 AU is marked; a star
appears at a distance; rays from each end of the baseline form a
small angle at the star; the trig $\tan p = (1\,\mathrm{AU})/d$
animates in alongside; the small-angle approximation $p \approx
(1\,\mathrm{AU})/d$ replaces it; finally $d = 1/p''$ (parsecs)
emerges. ~2 minutes, mostly `Line`, `Angle`, `MathTex`.

### 3. Calculus walkthroughs

Where an algebraic derivation has equalities, a calculus
walkthrough has *operations* — differentiation, integration,
substitution — that need to *look* like the operation they
represent. The integral sign sweeps over the function it integrates;
the derivative tangent line rotates as the function curves; the
substitution $u = f(x)$ visibly swaps every $x$ for $u$.

**Canonical example:** *Hydrostatic equilibrium derivation.*
Pressure-gradient force animates as a balance against gravity on a
shell of stellar material; $dP/dr$ appears with its differential
shell highlighted on a stellar cross-section; the rearrangement
$dP/dr = -\rho g$ emerges. ~4 minutes, mixing `MathTex` with a
small inset stellar diagram.

### 4. Limit-case / asymptotic animations

Where a parameter sweeps through a range and the equation's
*shape* changes in response. `ValueTracker` drives a parameter
continuously; updater functions redraw the curve and the
formula's visible form as the parameter changes; degenerate or
limit-case formulas emerge as the parameter approaches a regime
boundary.

**Canonical example:** *Rayleigh-Jeans and Wien limits emerging
from Planck.* The full Planck function $B_\lambda(T)$ is plotted
against $\lambda$; a $T$-slider drives the curve through low-$T$
to high-$T$; in the long-wavelength limit, the curve visibly
matches the $T \cdot \lambda^{-4}$ Rayleigh-Jeans form (overlaid
in dashed); in the short-wavelength limit, the curve matches the
$\lambda^{-5} e^{-hc/\lambda k_B T}$ Wien approximation (also
overlaid). Approximation overlays color-code per ADR 0058 (faded
amber for `approximation` role). ~3 minutes, `ValueTracker`-heavy.

### 5. Dimensional analysis arguments

Compact and surprisingly hard to do well in static prose. The
"why" of dimensional analysis is that the *units* drive you
toward a uniquely-shaped answer — and animation lets the units
themselves combine on screen as you build the argument.

**Canonical example:** *Free-fall timescale $t_\text{ff}$ from
$G$ and $\rho$.* Start with the dimensions of $G$
($\mathrm{cm}^3 \mathrm{g}^{-1} \mathrm{s}^{-2}$) and $\rho$
($\mathrm{g}\,\mathrm{cm}^{-3}$). Animate the unit-cancellation:
$G\rho$ has dimensions $\mathrm{s}^{-2}$, so $1/\sqrt{G\rho}$
has dimensions of time. Numerical pre-factor revealed at the
end via dimensional reasoning + matching to the exact derivation.
~2 minutes, `MathTex` + careful unit-bracket animations.

### 6. Numerical-method walkthroughs

A computational algorithm visibly *executing* on a target problem.
Iteration steps are shown as discrete frames; intermediate state
is visualized; convergence (or non-convergence) is animated.

**Canonical example:** *Newton-Raphson on effective temperature
from a luminosity-radius constraint.* Given $L = 4\pi R^2 \sigma
T^4$, suppose $L$ and $R$ are observed; solve for $T$. The
function $f(T) = L - 4\pi R^2 \sigma T^4 = 0$ plotted; the
Newton-Raphson update $T_{n+1} = T_n - f(T_n)/f'(T_n)$ visualized
as a tangent line crossing zero; successive iterations zoom in on
the root. ~4 minutes, `Scatter` + tangent-line updaters.

### 7. Faded-scaffold worked examples

Three (or more) instances of the same problem type, with hints
progressively fading as the student watches. The first instance
shows every step; the second hides intermediate algebra; the
third shows only the question and the answer. The cognitive-
science name is "expanding-window worked example" — strong
evidence base in pedagogical literature.

**Canonical example:** *Compute $L$ given $T_\text{eff}$ and $R$.*
Instance 1: Sun-like star ($T = 5772\,\mathrm{K}$, $R =
R_\odot$), full Stefan-Boltzmann substitution shown, answer
revealed step by step. Instance 2: cool dwarf, intermediate
algebra hidden, just the result animates in. Instance 3: a
red giant, only the answer revealed — student has internalized
the procedure. ~5 minutes; scene management with explicit
`self.next_slide()` boundaries between instances.

### 8. Comparison / overlay animations

Two phenomena synchronized under a single parameter sweep. The
viewer sees them respond differently to the same input — the
pedagogical point lives in the *contrast*.

**Canonical example:** *Two model atmospheres synchronized under
a metallicity sweep.* Two SED curves plotted side-by-side; a
single $[\mathrm{Fe}/\mathrm{H}]$ slider drives both; the metal-
rich atmosphere shows deepening absorption features while the
metal-poor stays cleaner; the contrast makes the metallicity
diagnostic visible. ~3 minutes; two `ValueTracker`s wired to two
synchronized `Mobject` groups.

---

These eight subtypes don't all share a workflow. Algebraic
derivations (subtype 1) and dimensional-analysis (subtype 5) are
the cheapest to AI-orchestrate — ~80-line scripts. Calculus
walkthroughs (subtype 3) and numerical-method walkthroughs
(subtype 6) need real geometric scaffolding and update logic —
~200-400 line scripts. Faded-scaffold worked examples (subtype 7)
need scene-management logic that doesn't compress as cleanly.
Phase 1 (§7 below) deliberately samples across the cost spectrum
to learn what's realistic.

## §3 — The role-coded animation thesis

Manim CE's `MathTex` supports
`set_color_by_tex_to_color_map({...})` — a map from substring to
color, applied at render time. Substrings can be color-coded by
*meaning* rather than syntactic role.

**Sophie's distinguishing move:** color those substrings by their
epistemic role per
[ADR 0058](../../decisions/0058-epistemic-component-contract.md).
Observable terms in role-rose, model terms in role-teal,
approximation terms in role-amber, inference terms in role-violet.
The colors match the static-figure palette already locked in
[`interactive-figure-target.md`](interactive-figure-target.md).

Concrete example: in the Stefan-Boltzmann derivation (subtype 1),
$T$ (an inferred property of the source) animates in role-violet,
$\sigma$ (an empirical constant — observable, in the sense that
it's set by experiment) animates in role-rose, the integral
operation $\int B_\lambda \,d\lambda$ animates in role-teal (model
construction), and the small-correction terms dropped under the
"large $T$" assumption animate in faded amber as they're discarded.
A student watching this clip *sees the reasoning structure* in
color, not just the algebra.

No competing platform's Manim clips do this. The cost is small —
a color map declared once per scene, applied across all `MathTex`
calls — and the differentiation moat is real: animated derivations
that *visibly track* the observable → model → inference chain
through each step are a Reasoning-OS-level capability, not a
visual flourish.

The Phase 1 pilot (§7) will pressure-test whether the coloring
genuinely aids comprehension or muddies readability — but the
hypothesis is that for an audience already encountering the same
palette in static interactive figures, the consistency *helps*.

## §4 — Astronomy-specific Manim affordances

Three Manim capabilities are particularly well-fit to astronomy
pedagogy. Each is generally available in Manim CE; using them is
craft, not novel engineering.

### `ImageMobject` + astropy FITS bridge

`ImageMobject` consumes any image array. Combined with
[astropy](https://www.astropy.org/) (the standard Python library
for astronomical data), real HST or JWST FITS plates can be
loaded, normalized, and dropped into a Manim scene alongside an
animated diagram. The animation choreographs around the real
image; the real image lives at the center of the pedagogical
argument.

**Use case in ASTR 201:** A Hubble-1929-style velocity-distance
plot animated alongside a Cepheid light curve from NASA ADS, both
rendered in the same clip with synchronized annotations. Students
see the *actual data* Hubble used, not a stylized re-drawing of it,
as the inference $cz \approx H_0 d$ emerges on screen.

### `numpy`-driven `Mobject` construction

Spectra, light curves, model atmospheres can be loaded from real
data files (FITS, HDF5, ASCII) at script-render time, parsed into
`numpy` arrays, and turned into `Mobject` curves directly. The
animated curve *is* the data, not a stylized representation.

**Use case in ASTR 201:** An asteroseismic mode spectrum animated
through a stellar-evolution sequence — the actual mode frequencies
from a MESA model sweep into the right positions as the star
ages. This is the same data scientists publish in the literature;
the clip shows it as a movie instead of a static figure.

### LaTeX-density as the natural medium

Astrophysics is one of the most LaTeX-dense pedagogical surfaces
in the sciences. Greek symbols ($\lambda$, $\sigma$, $\rho$,
$\mu$), subscripts on subscripts ($T_\text{eff}$,
$M_\text{tot,bol}$), composite units ($\mathrm{erg}\,
\mathrm{s}^{-1}\,\mathrm{cm}^{-2}\,\mathrm{Hz}^{-1}$), and
$\partial/\partial \lambda$-style operators are everywhere.
Manim's `TransformMatchingTex` is at home here in a way it
isn't for intro-calculus-style "what is a derivative" content
where most terms are single letters and the morphs are
inevitably trivial. Sophie astronomy is exactly the content
domain where Manim's signature affordance pays its highest
dividend.

## §5 — Reuse via `manim-slides`

[manim-slides](https://manim-slides.eu/) takes a Manim scene
authored with `self.next_slide()` calls at logical breakpoints and
converts the rendered animation into a `reveal.js`-style
projection deck. The instructor steps through the animation
arrow-key-by-arrow-key; the animation *pauses* at slide
boundaries; the instructor speaks over each step as the class
watches. This is fundamentally different from "play an mp4 in
class" — it's a live-projection mode where pacing is in the
instructor's hands, not the rendered timeline's.

**Operational implication:** scenes intended for the live
flipped-class flow should be authored *with `next_slide()` calls
in mind*. The animation pauses where you want to ask "what do
you predict happens next?" before the next step plays. The same
.py source produces both the chapter-embedded mp4 *and* the
live-projection slide deck — different consumers of the same
artifact.

**Subtype-fit matters.** Discrete-step subtypes (1 algebraic,
2 geometric, 3 calculus, 5 dimensional, 7 worked-examples) pause
*naturally* at logical breakpoints between steps — they're a clean
match for `next_slide()`. Continuous-sweep subtypes (4 limit-case,
6 numerical-method) pause less naturally — you can stop a
`ValueTracker` mid-sweep, but the pause feels arbitrary unless the
sweep itself has marked-out boundaries (which adds authoring
complexity). The slide-reuse story is strongest for subtypes 1-3,
5, and 7; weaker but feasible for 4 and 6.

**Fit to ASTR 201's live-class flow.** Each 75-minute slot has
~20 minutes of mini-lecture. A 4-minute Manim derivation clip
running as `manim-slides` is two-thirds of one mini-lecture's
worth of structured content — exactly the right shape. The clip
that students saw async in their chapter reading is now the
projection-surface for the synchronous mini-lecture, with Anna
voicing each step live. Same artifact, three pedagogical exposures
(async chapter, live mini-lecture, hopefully internalized) — which
is precisely the repetition architecture ASTR 201's design rests on.

## §6 — Phase 1 commitment: Module-1 pilot

The Manim program is broad — eight subtypes, real astronomy data,
role-coded epistemic coloring, `manim-slides` reuse. Phase 1 does
not attempt all of it.

**Phase 1 scope.** 3-5 Manim clips, spanning ~3 distinct subtypes,
all authored for chapters in the **Foundations module** of ASTR
201 sp26.

The reason for the narrow Phase 1 isn't a budget defense — it's
**the workflow is the binding constraint, and the workflow gets
designed best against real artifacts.** Right now, important
operational questions are unanswered:

- How long does AI-orchestrated authoring actually take per clip,
  per subtype? The cost-spectrum claim in §2 is a guess until a
  real clip is authored end-to-end.
- Where do the rendered mp4s live? Sophie's repo `assets/` directory
  is plausible but bloats the git tree. Cloudflare R2 is plausible
  but adds an external dependency. GitHub Pages with LFS is a
  third option. An unlisted YouTube as fallback is a fourth.
  Each has trade-offs that only become real once mp4s exist.
- What's the chapter-embed convention? Plain HTML5 `<video>` is
  the minimum-viable shape. A `<Manim>` wrapper component with
  metadata (subtype, role-map, slide-version-link) is the SoTA
  shape. The right answer depends on what metadata turns out to
  be useful — which only becomes clear with a few real clips.
- Does `manim-slides` integrate smoothly into the live class
  flow, or does it introduce friction we didn't anticipate? Only
  one way to find out.
- Does the role-coded coloring thesis (§3) actually work on a
  watched-by-a-real-student artifact, or does it muddy the
  animation readability?

The pilot is right *because every one of those questions has a
better answer if we author one clip first*. Promotion to full-
semester coverage — one clip per chapter, at least one subtype
exercised per module — happens after Module 1 ships and teaches
us what's realistic.

**What the pilot deliberately samples across.** The pilot should
cover at least three subtypes spanning the authoring-cost spectrum:
one cheap subtype (algebraic derivation, dimensional analysis, or
geometric proof — subtypes 1, 2, or 5), one mid-cost subtype
(calculus walkthrough or limit-case — subtypes 3 or 4), and one
expensive subtype (numerical-method or faded-scaffold worked
example — subtypes 6 or 7). That way the time estimates calibrate
across the full range.

Specific clip selection — which 3-5 Foundations chapters get
which subtypes — is the next brainstorm after this doc lands.

## §7 — Forward-looking enables

Two future capabilities worth flagging now even though they're not
Phase 1 work.

**Sophie-to-Manim authoring bridge** —
see [S12 in `speculative.md`](../features/speculative.md#s12-sophie-to-manim-authoring-bridge).
The pitch: Sophie's structured chapter source already encodes much
of what a Manim derivation script needs.
[`<EquationBiography>`](../../decisions/0046-equation-biography.md)
blocks declare the assumption / break-when / common-misuse
structure of an equation — that's exactly the scaffold a derivation
clip needs to walk. The
[pedagogy index](../../decisions/0038-pedagogy-index-pattern.md)
serializes chapter narration structure — that's the cue-point
sequence for the slide-boundary `next_slide()` calls. The role
contract ([ADR 0058](../../decisions/0058-epistemic-component-contract.md))
defines the color map for §3. An AI-orchestrated bridge tool
could read the chapter source and emit a derivation-skeleton
script that Anna then redlines instead of authoring from scratch.
Highest-leverage future move *if* AI-orchestrated authoring proves
to scale. Speculative until the manual Phase 1 baseline exists to
calibrate against.

**Remotion-style component reuse** — see
[`multimedia-portfolio.md` §6](multimedia-portfolio.md). The same
`<BlackbodyExplorer>` interactive-figure component that renders
live in a chapter could *also* render frames via
[Remotion](https://www.remotion.dev/) into a Manim-equivalent mp4
clip. Single source of truth for figure + clip. Far future; not
tractable today because Remotion lacks `TransformMatchingTex`'s
math vocabulary and Sophie has no immediate need to consolidate.
Tracked because if the Sophie-to-Manim bridge above lands *and*
Remotion adds a math layer, the two could merge into a unified
"one source, two rendering targets" architecture.

## §8 — How to use this doc

Refer to this doc when:

- Authoring a new Manim clip and unsure which subtype it falls
  under (see §2).
- Designing the role-color mapping for a `MathTex` (see §3).
- Deciding whether to author a clip primarily for chapter embed
  or for `manim-slides` reuse (see §5).
- Onboarding a new contributor or adopting instructor to Sophie's
  Manim conventions.
- Re-evaluating Phase 1 scope after the pilot ships.

Refer to **[`multimedia-portfolio.md`](multimedia-portfolio.md)**
when the question is "should Sophie add multimedia genre X?" —
that doc is the canonical four-bucket triage. This doc is
specifically about *what Sophie does inside the Manim bucket once
the bucket is locked.*

## §9 — Related reading

- **[`multimedia-portfolio.md`](multimedia-portfolio.md)** — the
  multimedia landscape map this doc zooms into.
- **[`interactive-figure-target.md`](interactive-figure-target.md)**
  — Sophie's primary interactive multimedia surface; the role-color
  palette referenced in §3 originates here.
- **[ADR 0058](../../decisions/0058-epistemic-component-contract.md)**
  — the epistemic role contract underwriting the role-coded
  animation thesis.
- **[ADR 0046](../../decisions/0046-equation-biography.md)** —
  equation biography; structural fuel for the speculative
  Sophie-to-Manim bridge in §7.
- **[ADR 0038](../../decisions/0038-pedagogy-index-pattern.md)** —
  pedagogy index; the narration-cue-point substrate for the
  speculative bridge.
- **[Reasoning-OS thesis](../reasoning-os/index.md)** — the
  broader framing in which role-coded animation is one expression.
- **[manim.community](https://www.manim.community/)** — the
  Manim CE library home.
- **[manim-slides.eu](https://manim-slides.eu/)** — the
  slide-reuse projection layer.
- **[3Blue1Brown](https://www.youtube.com/@3blue1brown)** —
  canonical reference for what Manim looks like at its best.
