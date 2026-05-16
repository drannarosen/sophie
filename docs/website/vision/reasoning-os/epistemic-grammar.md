---
title: Epistemic grammar
short_title: Epistemic grammar
description: The eight-role taxonomy declared in ADR 0058, with each role's definition, current Sophie instances, example sentence, and visual-grammar intent for future theme tokens.
tags: [vision, reasoning-os, epistemic, grammar, taxonomy, pedagogy]
---

# Epistemic grammar

The eight epistemic roles Sophie recognizes, in author-facing prose.
This page is the *grammar* — the canonical list, what each role
means, where it shows up today, and what visual identity it will
eventually carry. The
[contract spec](../../decisions/0058-epistemic-component-contract.md)
(ADR 0058) is the schema-level declaration; the
[explanation page](../../explanation/scientific-reasoning-os.md) is
the *when to use which role* decision tree.

Each role below carries five slots:

- **Definition.** One sentence on what the role names.
- **Current Sophie instances.** Where this role lives today — which
  ADRs, components, or framing fields encode it.
- **Example sentence.** Author-facing phrasing that uses the role
  word naturally.
- **Visual-grammar intent.** What color slot, motion language, or
  edge style the role *will* carry once
  [ADR 0005's three-layer theming](../../decisions/0005-theming-three-layers.md)
  grows epistemic token slots (post-A8 work; not shipped at v1).
- **Adjacent roles to disambiguate.** The neighbors most likely to
  be confused with this one, with the disambiguation rule.

## Why a grammar, not just a list

A grammar implies that the roles compose. An OMI section is a
sentence in the grammar: an `observable` clause, a `model` clause,
an `inference` clause, each potentially modified by `assumption`,
`approximation`, or `uncertainty` adjuncts. A `misconception`
component is a *contrast clause* — it shows the reader what the
correct grammar excludes. The roles are not equal-weight slots in a
menu; they have compositional relationships that future audit
invariants and AI authoring will exploit.

The eight roles are closed at v1. Adding a ninth requires an ADR
that amends 0058. The closure is deliberate: a contract that drifts
is not a contract.

---

## `observable`

**Definition.** A measured or observed phenomenon — what data
*shows*, independent of the model you use to explain it.

**Current Sophie instances.**

- [ADR 0046](../../decisions/0046-equation-biography.md)
  `<Observable>` child of `<KeyEquation>` — declares what real-world
  quantity an equation describes.
- [OMI framing](../../explanation/architecture.md) — first stage of
  the three-stage epistemic arc; the `framing: 'OMI'` chapter
  discriminator commits to making the observable explicit.

**Example sentence.** *"The observable here is the transit light
curve's depth and duration; the dip in flux at minute 47 is the
data."*

**Visual-grammar intent.** Neutral, data-toned color slot
(`color.role.observable`, planned as a desaturated blue-grey).
Static, no motion — observables don't morph as a parameter changes;
they're what the parameter is *being compared to*. Crisp edges,
no fade. Iconography hints toward telescopes, instruments,
detectors.

**Adjacent roles to disambiguate.**

- *vs. `model`* — an observable is what data shows; a model is what
  posits an explanation. A blackbody spectrum *function* is a
  model; the spectrum *measured from* a star is an observable.
- *vs. `inference`* — an observable is direct; an inference is a
  conclusion drawn from an observable plus a model. "The light
  curve depth is 1.2%" is an observable; "the planet's radius is
  1.05 R⊕" is an inference.

---

## `model`

**Definition.** A formal, equational, or computational construction
that posits an explanation for a class of observables.

**Current Sophie instances.**

- The `$$...$$` math body of any
  `<KeyEquation>` ([ADR 0046](../../decisions/0046-equation-biography.md)).
- OMI framing — second stage of the arc.
- The full
  [Notation Registry](../../decisions/0043-notation-registry-multirep-alignment-audit.md)
  schema treats canonical symbols as model entities.

**Example sentence.** *"The Mandel-Agol transit model assumes
limb-darkened spherical bodies on Keplerian orbits; given those
inputs it predicts the light curve shape."*

**Visual-grammar intent.** Structured, mid-saturation color slot
(`color.role.model`, planned as a confident blue). Smooth motion
when parameters change — models are where parameter sweeps happen.
Solid edges, mathematical typesetting cues.

**Adjacent roles to disambiguate.**

- *vs. `observable`* — see above.
- *vs. `inference`* — a model is the explanation-machine; an
  inference is the output you get from running the model against
  data. The model is a function; the inference is its evaluation
  on a particular dataset.
- *vs. `approximation`* — a model is the construction; an
  approximation is a *simplification of* the model with a validity
  domain. Newtonian gravity is a model; the assumption that
  v ≪ c is an approximation of relativistic gravity.

---

## `inference`

**Definition.** A probabilistic conclusion drawn from a model
combined with observed data — typically a posterior distribution
or credible interval over a quantity of interest.

**Current Sophie instances.**

- OMI framing — third stage of the arc.
- (No dedicated component yet; A10 `<UncertaintyLens>` and A8
  `<OMIFlow>` will be the first.)

**Example sentence.** *"The inference is a posterior on planet
radius peaking at 1.05 R⊕ with a 68% credible interval of ±0.03
R⊕, given the transit model and the observed light curve."*

**Visual-grammar intent.** Probabilistic-toned color slot
(`color.role.inference`, planned as a softer blue-purple with
gradient/translucency support). Motion encodes posterior
updates — Bayesian-update animations are first-class here.
Soft edges, distribution-shaped iconography (histograms,
shaded credible bands).

**Adjacent roles to disambiguate.**

- *vs. `observable`* / *vs. `model`* — see above.
- *vs. `uncertainty`* — an inference is the *answer* (a
  distribution); uncertainty is the *property of* the answer
  (the spread, the degeneracy, the error bar). Every inference
  has uncertainty; uncertainty also attaches to direct
  observables and to model predictions.

---

## `assumption`

**Definition.** An explicit precondition on a model's validity.
Stated separately from the model so toggling it on or off is
legible.

**Current Sophie instances.**

- [ADR 0046](../../decisions/0046-equation-biography.md)
  `<Assumption>` child of `<KeyEquation>` — canonical instance.
- Future A9 `<AssumptionStack>` will compose multiple
  `<Assumption>` entries into a togglable list.

**Example sentence.** *"This derivation assumes hydrostatic
equilibrium, spherical symmetry, and an ideal-gas equation of
state; the next section relaxes the ideal-gas assumption for
degenerate cores."*

**Visual-grammar intent.** Muted color slot
(`color.role.assumption`, planned as a slate-grey or muted amber)
with dashed-edge treatment when rendered as a tag. The dashed edge
is the *visual identity* of the role — assumptions are precarious
relative to the model they support.

**Adjacent roles to disambiguate.**

- *vs. `approximation`* — an assumption is binary (the
  precondition either holds or doesn't); an approximation is
  graded (the simplification is fine up to some validity domain
  and gets worse outside it). "Ideal gas" is an assumption;
  "small-angle approximation" is an approximation.
- *vs. `model`* — an assumption restricts a model's applicability;
  it is not itself a model.

---

## `approximation`

**Definition.** A simplification of a model — usually a truncated
series, an asymptotic limit, or a discarded coupling — that holds
within a *named validity domain* and degrades outside it.

**Current Sophie instances.**

- [ADR 0046](../../decisions/0046-equation-biography.md)
  `<BreaksWhen>` child of `<KeyEquation>` — the validity-domain
  marker that signals "this is an approximation that fails when…"
- (No dedicated `<Approximation>` component yet — see
  [backlog B2 — Approximation Honesty](../features/backlog.md)
  for the speculative component design.)

**Example sentence.** *"In the v ≪ c limit, the relativistic
expression collapses to Newtonian gravity; the approximation is
good to better than 1% for v/c < 0.05 and breaks down at relativistic
speeds."*

**Visual-grammar intent.** Faded or compressed-notation color slot
(`color.role.approximation`, planned as a soft grey-blue with a
"truncation" visual cue — ellipsis, fadeout, or shortened arrow).
Motion encodes "approximation breakdown" as the validity domain is
exited.

**Adjacent roles to disambiguate.**

- *vs. `assumption`* — see above.
- *vs. `model`* — see above.

---

## `uncertainty`

**Definition.** The posterior spread, error bar, model degeneracy,
or observational noise associated with any of the other roles. A
modifier role: it attaches to observables (measurement noise),
to models (parameter uncertainty), or to inferences (credible
interval width).

**Current Sophie instances.**

- (None yet — newest of the eight. A10 `<UncertaintyLens>` is the
  scheduled first instance.)
- Conceptually present in
  [ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md)'s
  `prerequisite_misconceptions` graph as "epistemic uncertainty
  about which misconception is the relevant one for this
  student," but not declared as role-`uncertainty` at v1.

**Example sentence.** *"The uncertainty band shaded around the
posterior reflects both the photometric noise (observable
uncertainty) and the degeneracy between planet radius and
limb-darkening coefficients (model uncertainty)."*

**Visual-grammar intent.** Translucent-overlay color slot
(`color.role.uncertainty`, planned as semi-opaque variants of the
underlying role's color — uncertainty on an inference inherits the
inference color, uncertainty on an observable inherits the
observable color). Motion encodes posterior updates and band
expansion / contraction. Iconography: gradient fills, shaded bands,
ensemble-spread visuals.

**Adjacent roles to disambiguate.**

- *vs. `inference`* — see `inference` entry above.
- *vs. `approximation`* — an approximation is a known-bounded
  *systematic* error introduced by simplifying the model;
  uncertainty is a *statistical* spread over the answer. The two
  can coexist: an approximation introduces a systematic bias
  whose magnitude is itself uncertain.

---

## `numerical`

**Definition.** A computational artifact of *how* the model is
evaluated — discretization, integrator choice, grid resolution,
convergence behavior, truncation error. The role most
underrepresented in traditional STEM pedagogy.

**Current Sophie instances.**

- (None yet — vision principle, not yet a component. The future
  `<NumericsPlayground>` family is the scheduled first instance.)

**Example sentence.** *"At dt = 0.1, the leapfrog integrator
conserves energy; at dt = 0.5, the numerical artifact is a
secular drift in total energy of order 10⁻⁴ per orbit."*

**Visual-grammar intent.** Computation-toned color slot
(`color.role.numerical`, planned as an accent color distinct from
all other roles — possibly a teal or muted green) with motion that
encodes *instability* explicitly: flicker for unstable solutions,
visible truncation for under-resolved grids, divergence for
runaway integrators. The visual identity exists to make
"the simulation is wrong" *legible*.

**Adjacent roles to disambiguate.**

- *vs. `model`* — a model is the equations being solved; the
  numerical role is the *solver* and its artifacts. Newton's
  laws are a model; a 4th-order Runge-Kutta integrator is a
  numerical method whose truncation error is a numerical role.
- *vs. `approximation`* — an approximation is a *mathematical*
  simplification (a series truncation, a limiting case); a
  numerical artifact is a *computational* one (a discretization,
  a finite-precision rounding). Both have validity domains; the
  domains have different shapes.

---

## `misconception`

**Definition.** A canonical *student-side wrong model* — a
predictable, named, often research-documented incorrect mental
model students bring to a topic.

**Current Sophie instances.**

- [ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md)
  — the misconception graph: misconceptions are first-class nodes
  with `prerequisite_misconceptions`, `related_misconceptions`,
  `concept_refs`, `discipline_scope`.
- `<Callout variant="misconception">` — the rendered surface.
- [ADR 0046](../../decisions/0046-equation-biography.md)
  `<CommonMisuse misconception="<slug>">` — equation-side
  cross-reference into the misconception graph.

**Example sentence.** *"The relevant misconception here is the
'heavier objects fall faster' folk model; the intervention asks
students to predict the outcome of the feather-and-hammer drop
before showing the Apollo 15 video."*

**Visual-grammar intent.** Constrained-accent color slot
(`color.role.misconception`, planned as a warning-orange that
*differs from* error red — misconceptions are not errors, they're
predictable wrong models worth surfacing). Edge treatment hints at
"this is contrast content, not target content": diagonal stripes,
hatched border, or a *struck-through* version of the correct claim
positioned next to the correction.

**Adjacent roles to disambiguate.**

- *vs. `model`* — a model is something the textbook is teaching
  *as correct*; a misconception is something the student is
  bringing in *as wrong*. They have the same epistemic shape
  ("a posited explanation") but opposite curricular polarity.
- *vs. `assumption`* — a misconception is a wrong inference about
  the world; an assumption is a stated precondition on a correct
  model. *"Heavier objects fall faster"* is a misconception;
  *"air resistance is negligible"* is an assumption.

---

## Composition

The roles compose. Six worked examples of multi-role pages:

1. **OMI section** — three roles in canonical order:
   `observable` → `model` → `inference`. The order matters; reading
   inference before observable inverts the epistemics.
2. **Equation biography** — `model` (the equation) +
   `observable` (what the equation describes) + repeated
   `assumption` (preconditions) + `approximation` (where it
   fails) + `misconception` (how it's commonly misused).
3. **Bayesian update** — `observable` (data) + `model`
   (likelihood) + `inference` (posterior) + `uncertainty`
   (posterior spread).
4. **Approximation breakdown demo** — `model` (full theory) +
   `approximation` (simplified form) + `numerical` (how the
   simplification's residual is computed), plus a slider that
   crosses the validity-domain boundary.
5. **Misconception intervention** — `misconception` (student
   wrong model) + `observable` (a demonstration that
   contradicts it) + `inference` (the corrected mental model).
6. **Numerical experiment** — `model` (the equations) +
   `numerical` (the solver) + `observable` (the simulated
   output) + `uncertainty` (Monte-Carlo spread over solver
   settings).

Each composition has a recognizable visual rhythm once the per-role
theme tokens ship. The reader learns the rhythm once; every Sophie
page reads faster because of it.

## Drift discipline

The eight roles are closed; the **implicit-role lookup table** that
maps existing components to roles is open and will grow.
[Explanation: scientific-reasoning-os.md](../../explanation/scientific-reasoning-os.md)
is the table's home. Every new pedagogy component that encodes a
role implicitly (via `variant=`, child shape, or unambiguous
default) earns a row in that table. The contract guarantees the
*roles*; the lookup table guarantees the *mapping*. Drift in either
is the failure mode this page exists to prevent.
