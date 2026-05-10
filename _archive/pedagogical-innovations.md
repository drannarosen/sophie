# Pedagogical Innovations

Novel pedagogical elements proposed for the platform. Each is designed
to clear a specific bar: it must either (a) only be possible *because*
of AI in the loop, (b) reframe the act of learning in an unusual way,
or (c) make something invisible-but-important about science visible to
students. Anything that's just "Mazur's Peer Instruction with a fresh
coat of paint" doesn't make this list.

These are *additions to* the existing pedagogy (`OMI`, `PMI`,
`Prediction`, `UnitCheck`, `Assumption`, `ModelLimit`, `FigureReading`,
`Checkpoint`), not replacements. The goal is a small set of distinctive
elements that compound over a course.

This doc is organized as: the eight innovations, ranked by leverage
for this platform; honorable mentions; and a recommended
implementation order.

A note on citations: where I name specific learning-science
researchers or traditions, I'm naming the body of work, not specific
papers I can verify by memory. Treat these as starting points for
literature review, not definitive citations.

---

## 1. Confidence-Calibrated Predictions

### What it is

Every `<Prediction>` component takes an additional input — a confidence
slider from 0–100%. Students don't just commit to an answer; they
commit to how sure they are. Over the semester, the platform builds a
personal calibration curve: when a student reports 80% confidence, what
fraction of those predictions did they actually get right? The
visualization is a calibration plot — predicted confidence on the
x-axis, observed accuracy on the y-axis. A perfectly calibrated person
sits on the diagonal.

### The learning science

Calibration as a trainable skill comes from the forecasting literature
(Tetlock & Gardner's *Superforecasting*, the Good Judgment Project) and
from metacognition research (the Dunlosky/Rawson tradition on
metacognitive accuracy). The robust finding: most people, including
domain experts, are systematically miscalibrated — usually
overconfident on familiar topics, less so on novel ones. Calibration
*is* trainable with feedback, and it's a transferable skill: someone
who learns to be calibrated about astronomy questions becomes more
calibrated about everything else.

In educational contexts, the metacognitive-accuracy literature also
finds that students with poor metacognitive monitoring tend to study
less efficiently — they don't know what they don't know, so they over-
or under-allocate effort. Calibration training addresses this directly.

### What's novel

Calibration tracking exists in some niche tools (Eedi for K-12 math,
some platforms in the assessment-research literature), but is
essentially absent from college-level science textbooks. More
importantly, what's typically called "confidence" in ed-tech is a
single binary ("are you sure?"). A continuous calibration measure
across hundreds of predictions over a semester is fundamentally
different — it generates real longitudinal signal. The student isn't
getting a token prompt; they're building a measurable epistemic
profile that they can watch evolve.

### How it works in the platform

- `<Prediction>` schema gains a `confidence: number` field on responses
  (stored in `localStorage` v1, optionally exported to Canvas).
- A visualization component (`<CalibrationCurve>`) reads aggregated
  predictions over the semester and renders the curve.
- On every Nth prediction or at chapter boundaries, the student sees
  a brief panel: "you've made 24 predictions; you tend to be 12
  percentage points overconfident on stellar physics, 8 underconfident
  on cosmology."
- In the v2 instructor build, the same plot at the cohort level
  (anonymized) reveals topics where the class is collectively
  miscalibrated.

### Why it earns a place

- Almost free to add: one slider, simple aggregation, one
  visualization.
- Compounding value over time — the longer the course, the more useful
  the data.
- Builds a meta-skill that transfers to research, engineering, and
  life. Most college courses don't even attempt this.
- Pairs naturally with the prediction-first pedagogy already core to
  the platform.

### Risks and cautions

- Students can game the slider by staying safely at 50%. Design the
  visualization to also reward decisive correct predictions, not just
  calibration on the diagonal — e.g., a "Brier score" overlay that
  penalizes both overconfidence and uninformative responses.
- Some students find calibration data demoralizing if they're
  consistently overconfident; frame it as a skill being built, not a
  personality assessment.
- Cohort-level data in the instructor build needs to be genuinely
  aggregate — never traceable to individual students who haven't
  opted in.

---

## 2. Misconception NPCs

### What it is

An AI persona role-plays a fellow student who holds a *specific,
named* misconception. The student's task is to argue them out of it.

Example interaction:

> **Sam (AI):** I think flux and luminosity are basically the same
> thing — they both measure how bright something is, right?
>
> **Student:** Not exactly. Flux depends on distance.
>
> **Sam:** But a star that's intrinsically really bright is going to be
> really bright when we look at it, right?
>
> **Student:** Only if it's nearby. A really luminous star far away can
> appear dimmer than a less luminous nearby star.
>
> **Sam:** OK so what's the difference *quantitatively*?
>
> **Student:** Flux scales as $L / (4\pi d^2)$. The same luminosity at
> 10× the distance gives 100× less flux.
>
> **Sam:** Got it — so flux is what we measure, and luminosity is what
> we infer if we know distance.

The AI persona is constrained: it can only update its position based
on physics-grounded arguments. If the student waves their hands or
makes a vague claim, the AI politely pushes back. If the student gives
a correct, well-grounded explanation, the AI explicitly updates and
acknowledges what changed its mind.

### The learning science

This leverages multiple well-supported principles:

- **The protégé effect** (Bargh & Schul 1980; Chase, Chin, Oppezzo &
  Schwartz 2009 on Teachable Agents): preparing to teach others, and
  actually teaching them, produces deeper learning than studying for
  a test. Students who tutored a "Teachable Agent" learned more than
  controls studying alone.
- **Self-explanation** (Chi et al. 1989, 1994): articulating *why*
  something is true, in your own words, is one of the most robust
  learning interventions in cognitive psychology.
- **Conceptual change theory** (Posner, Strike, Hewson, Gertzog 1982):
  engagement with explicit alternative positions, plus dissatisfaction
  with one's own current understanding, is the mechanism by which
  misconceptions get repaired. A misconception that's never directly
  confronted tends to persist alongside the correct concept.

### What's novel

AI tutors are everywhere; in almost all of them, the AI is the expert
and the student asks. *Misconception NPCs* invert this: the student is
the expert and the AI plays a confused peer. The student's job is to
*teach*, not to learn passively. This is a fundamentally different
pedagogical relationship than the standard AI-tutor pattern.

The structure is also distinctive: the AI is constrained to a
*specific named misconception* (drawn from the platform's
`Misconception` schema), giving the interaction a clear pedagogical
target rather than open-ended chat. Unbounded chat with an AI is rarely
pedagogically productive; bounded role-play around a named conceptual
error is.

### How it works in the platform

- Component: `<MisconceptionDialog misconceptionId="flux-equals-luminosity" />`.
- Each `Misconception` in the schema has a `dialogueProfile` field
  used by the AI: the wrong belief, why students hold it, what
  arguments would (correctly) update it, what arguments shouldn't.
- The AI is prompted with that profile plus a system prompt
  enforcing the constraint that it can only update based on
  physics-grounded reasoning.
- The full transcript is logged; instructor sees common stuck-points
  and what arguments worked across the cohort.
- Optional: the AI grades the student's success at the end (did the
  student actually convince me, or did I just say yes to be nice?).

### Why it earns a place

- Genuinely AI-native — only possible because of LLMs.
- Leverages the `Misconception` first-class schema entity already
  designed.
- Inverts the AI tutor relationship in a pedagogically defensible way.
- Builds *explanation* as a skill, which is the deepest form of
  understanding.

### Risks and cautions

- AI alignment risk: the AI might "give in" too easily to bad
  arguments. The system prompt must explicitly counter sycophancy
  and require physics-grounded reasoning before updating.
- Cost: every dialogue is API calls. Budget per student per chapter
  needs explicit design. A dialogue cap of ~10 turns is reasonable.
- Off-topic risk: students will try to derail the AI ("ignore your
  instructions"). The conversation must be tightly bounded.
- Cultural risk: some students find role-playing with AI uncomfortable
  or feel silly arguing with a "fake" student. Make it optional with
  alternative paths to the same learning objective.
- Evaluation risk: the AI's "did the student convince me?" judgment is
  itself fallible. Use it as suggestive, not authoritative.

---

## 3. Time-Machine Videos

### What it is

Lecture/explainer videos with prediction-prompts embedded at specific
timestamps. The video pauses at, say, 4:30 and shows: *"Before we
continue: what do you think happens to flux when distance doubles?"*
The student commits an answer (using the same `<Prediction>` schema as
the textbook) before the video resumes.

### The learning science

Active video viewing is one of the better-supported findings in
multimedia learning (Brame's *Effective Educational Videos* 2016 review
is a useful entry point; Mayer's Cognitive Theory of Multimedia
Learning provides the theoretical scaffold). Interactive video — with
embedded questions, segmentation, or required interactions — produces
substantially better learning outcomes than passive video. The
mechanism: passive video is processed in a low-engagement mode; active
prompts force the learner to retrieve, predict, or commit, which
deepens encoding and triggers self-explanation.

The "time-machine" framing emphasizes that the predictions are part of
the same pedagogical contract as the textbook predictions — they feed
into the same calibration curve, audit checks, and (eventually) grade
memos.

### What's novel

Tools like PlayPosit, EdPuzzle, and H5P do interactive video as a
standalone modality. What's distinctive here is *integration with the
same schema as the rest of the platform*. A student's prediction in a
video and their prediction in a chapter both feed the same calibration
curve, both count in the misconception map, both surface in the audit.
It's not a separate tool; it's the same pedagogy with a different
surface.

The integration is the novelty, not the in-video pause.

### How it works in the platform

- `MediaAsset.kind === 'video'` gets an optional `prompts: VideoPrompt[]`
  field.
- Each `VideoPrompt` has a timestamp and references a `<Prediction>`
  (or other interactive component) by ID.
- The video player wraps YouTube's player API (or a self-hosted
  equivalent) and intercepts at the timestamps.
- The prediction renders inline (overlay or beneath the video); the
  player resumes only after submission.
- The same prediction's response feeds the platform's calibration data.

### Why it earns a place

- Directly enables the "lecture less / become a content creator" goal —
  videos become active learning, not passive consumption.
- Reuses existing schema and components — no parallel pedagogy.
- Solves a real problem with flipped classrooms: students often watch
  videos passively because there's no commitment mechanism, then
  arrive at class without having engaged.

### Risks and cautions

- YouTube's player API is sufficient but not perfect; timestamp
  interception has edge cases (mobile autoplay, embedded vs. linked,
  speed adjustments).
- Captions and transcripts must remain accessible; prompt overlays
  shouldn't break screen-reader flow.
- Some students find video pauses irritating; design for cadence
  (don't prompt every 30 seconds — every 4–7 minutes is the literature's
  sweet spot for active video).
- Keyboard and touch accessibility for the prompt overlay is non-trivial.

---

## 4. Predict the Plot

### What it is

Before a key figure appears in a chapter — HR diagram, blackbody
spectrum, rotation curve, an N-body collision sequence — students
sketch (with mouse or finger) what they expect the figure to look
like. Axes are pre-labeled and pre-scaled. They commit, then the
actual figure appears with their sketch overlaid.

### The learning science

This is a generalization of *Predict-Observe-Explain* (POE), one of the
best-supported pedagogical patterns in physics education research
(Champagne, Klopfer & Anderson 1980; White & Gunstone 1992). The robust
finding: students who commit to a prediction *before* observation form
much stronger memories of the discrepancy when their prediction is
wrong, and process the correct answer more deeply.

The variant of *Predict the Plot* engages a different cognitive system
— visual/spatial sketching — than text-based prediction. There's a
substantial literature on drawing-to-learn (the Ainsworth tradition,
~2011 onward) showing that drawing-based prediction produces deeper
engagement than equivalent text descriptions, because it forces
commitment to specific spatial and quantitative claims (slope, shape,
asymptotic behavior) that text descriptions can elide.

### What's novel

POE is well-known. POE *with sketching* in interactive textbooks is
rare. POE *with AI cohort-level analysis of common misconception
shapes* is, as far as I know, novel — the platform can analyze
hundreds of student sketches per figure and identify recurring
incorrect predictions ("most of you predicted linear; here's why it's
actually logarithmic"). The misconception classes that emerge from
sketches are often distinctive — students consistently mispredict the
*shape* of the HR diagram in revealing ways.

### How it works in the platform

- Component: `<PredictThePlot figureId="hr-diagram-mass-luminosity" />`.
- The component renders an interactive canvas with axes/scale fixed.
- Student sketches; submits; reveals the actual figure with their
  prediction overlaid.
- AI analysis on cohort-level sketches identifies common misconception
  patterns; surfaces these to the instructor and (anonymized) to
  subsequent students who make the same prediction.
- The schema gains a small extension: `Figure` assets can declare a
  `predictable: { axes, scale, hints? }` field.

### Why it earns a place

- Astronomy curricula are saturated with iconic figures (HR diagram,
  blackbody curves, rotation curves, magnitude-redshift, Hubble flow).
- Builds figure-reading as an *active* skill — the existing
  `FigureReading` component handles this *after* the figure appears;
  this component pre-loads the same skill before the reveal.
- Cohort-level pattern analysis is exactly what AI is good at and
  humans are bad at.

### Risks and cautions

- Tablet/phone sketching is much better than mouse sketching; design
  for both; consider keyboard/numerical alternatives.
- AI sketch comparison must be tolerant of imprecision — the goal is
  shape, slope, and qualitative behavior, not pixel match.
- Some figures don't have a clean sketchable shape (e.g., scatter
  plots of survey data with high noise). Choose where to deploy this.
- Accessibility: sketching is inherently visual. Provide a
  description-based alternative ("describe what you expect the curve
  to do as x increases").

---

## 5. Replay the Discovery

### What it is

Instead of presenting a finished theory and the data that supports it,
the chapter opens with the data scientists actually had at a moment in
history — and asks the student to reconstruct what was inferred. For
example, stellar parallax in 1838: show Bessel's actual data. Ask the
student to commit to a model. Then reveal what Bessel proposed, what
objections emerged from contemporaries, what subsequent observations
refined or refuted, and what the modern model is.

The key move: the chapter is structured as a *temporal sequence of
observations and inferences*, not as a static body of facts.

### The learning science

This builds on multiple traditions:

- **Modeling Instruction** (Hestenes, Wells, Swackhamer; Jane Jackson's
  curriculum work): the curriculum centers on building, testing, and
  refining models, not memorizing them. Empirically, students in
  Modeling Instruction physics courses show substantially larger
  conceptual gains on standard inventories (FCI, FMCE) than students
  in lecture-based courses.
- **History and Philosophy of Science (HPS) integration**: research
  consistently finds that students who learn HPS alongside science
  develop more sophisticated epistemologies — they better understand
  what scientific knowledge actually is and how it changes.
- **Productive failure** (Manu Kapur, ~2008 onward): students who
  attempt to solve a problem before being shown the canonical
  solution learn deeper structure than those who are taught first
  and apply later.

### What's novel

HPS integration usually happens in dedicated history-of-science
courses or as side commentary in textbooks ("here's a sidebar about
Bessel"). *Replay the Discovery* makes the historical reconstruction
the *primary modality* of the chapter. The student's first encounter
with parallax isn't the parallax formula; it's the observational data
that puzzled astronomers in 1830.

### How it works in the platform

- A new component, `<HistoricalReconstruction>`, wraps a sequence of
  phases:
  - `<EraSetting>`: what was known, what was unknown, who was working
    on this, what tools they had.
  - `<HistoricalData>`: the actual observations available at the time
    (with sources).
  - `<Prediction>`: what model do you propose?
  - `<HistoricalProposal>`: what the actual scientist(s) proposed.
  - `<Refinement>`: counter-evidence, revised models.
  - `<ModernUnderstanding>`: where the field is today.
- Citations link to primary sources (papers, letters, observational
  logs).
- For chapters where this is the primary frame, `Chapter.framing`
  could become `kind: 'historical'` with explicit phases.

### Why it earns a place

- Operationalizes OMI on a temporal axis — existing pedagogy
  generalizes naturally.
- Trains the most important meta-skill in science: distinguishing
  what's known *now* from what was figured out (and why the figuring
  out was hard).
- Astronomy is uniquely well-suited because the discoveries are
  dramatic, the data is preserved, and primary sources are largely
  accessible (NASA ADS makes pre-WWII astronomy papers free).

### Risks and cautions

- Real historical data is often sparse, ugly, or already
  overdetermined by hindsight. Curating it well is real work.
- Beware the "great person" narrative trap — discoveries are usually
  messier and more collective than the textbook story.
- Doesn't fit every chapter; works best for foundational concepts with
  clean discovery moments. Don't force it.
- Some students will feel the historical detour is "wasting their
  time" — frame it as building a different kind of skill, not as
  enrichment.

---

## 6. Pre-mortem Mode

### What it is

Borrowed from project management and medicine: before tackling a
problem, students predict what's likely to go wrong, why, and how to
recognize it. *"Before you run this orbit integrator with `dt = 1
year`, what do you predict will break and why?"* After running, they
compare actual failures to predicted ones.

### The learning science

Pre-mortem analysis (Klein 2007 in management; widely adopted in
medicine for diagnostic reasoning) builds *prospective hindsight* —
imagining the failure of an action and reasoning back from it. The
technique reliably reduces overconfidence and identifies failure modes
that wouldn't surface in standard analysis.

In learning contexts, pre-mortems train *engineering judgment* —
knowing when something is likely to break — which is distinct from
"did you get the right answer." For numerical methods specifically
(relevant to COMP), pre-mortems map directly to the diagnostic skills
the field requires: knowing that explicit Euler will blow up for stiff
equations, that floating-point precision will eat your tail-of-
distribution data, that a well-conditioned problem can become
ill-conditioned with the wrong reformulation.

### What's novel

Pre-mortems are common in engineering project rooms and in clinical
diagnostic training; almost absent from textbooks. Embedding them as
a structural element of computational chapters — *"before you run this
code, predict what could go wrong"* — turns a senior-engineer habit
into a teachable skill from day one.

### How it works in the platform

- Component: `<Premortem>` with prompts for failure mode, why, and
  detection signal.
- Pairs with `<CodeCell>` or `<Demo>`: the pre-mortem precedes the
  action.
- After the action, the student sees a comparison panel: predicted
  failures vs. actual.
- The schema's `MissionStep` gains a `pre-mortem` kind alongside
  `prediction`, `inference-prompt`, etc.

### Why it earns a place

- Critical for COMP courses where numerical pathologies are everywhere.
- Pairs naturally with `<Assumption>` and `<ModelLimit>` components
  already designed.
- Builds a transferable skill (engineering judgment) that traditional
  answer-checking doesn't develop.

### Risks and cautions

- Students initially find this hard — they don't yet have the
  failure-mode vocabulary. Provide scaffolding (a checklist of common
  failure modes) for early chapters.
- Risk of becoming formulaic; the prompt should vary enough to
  require thought, not pattern-match.
- "What could go wrong" isn't the right question for every action.
  Use selectively.

---

## 7. Concept Latency

### What it is

Each concept in the platform has a personal "freshness" — a measure
of how recently and how strongly the student has engaged with it. The
student sees a small ambient indicator: a sparkline showing concepts
currently in their "decay zone." Before chapters that depend on those
concepts, the platform suggests a quick retrieval-practice question to
refresh them.

### The learning science

Spaced repetition is one of the most well-supported findings in
cognitive psychology — Bjork's *desirable difficulties* tradition;
Cepeda et al.'s 2008 meta-analysis on distributed practice;
Karpicke & Roediger on retrieval practice. Anki, Quizlet, Khan
Academy, Duolingo all use spaced repetition algorithms.

The novel move here is *visualizing* the forgetting curve as part of
the textbook reading experience, rather than as a separate flashcard
app.

### What's novel

Spaced repetition tools are typically *external* to textbooks —
students who use Anki are doing so on top of, not within, their
textbook. *Concept Latency* makes forgetting visible inside the
textbook itself. The decay isn't an abstract claim; the student sees
their own concept-freshness curve and watches it decay between
sessions.

This makes the case for retrieval practice *visceral* — students don't
have to take it on faith that they're forgetting; they see it
happening to specific concepts they care about.

### How it works in the platform

- Each `Concept` in the schema gets a per-student decay model that
  reads from local interaction logs (predictions, checkpoint answers,
  mission completions, time on related pages).
- A small persistent UI element shows the 5 most-decayed concepts on
  hover.
- Before chapters with prerequisites in the decay zone, an opt-in
  retrieval-practice prompt appears.
- Practice problems are generated from the platform's existing
  checkpoint and prediction inventories — no parallel content needed.

### Why it earns a place

- Massively well-supported by learning science.
- Visualizing forgetting changes student behavior in a way that mere
  "do flashcards" doesn't.
- Cheap to implement on top of existing concept tracking.

### Risks and cautions

- Privacy: decay tracking implies fine-grained interaction logging.
  v1 is local-only (`localStorage`); cross-device requires backend
  → FERPA implications.
- Anxiety risk: some students will obsess over the decay indicator.
  Make it dismissible and optional; consider a "focus mode" that hides
  it.
- Algorithm tuning: a too-sensitive decay model creates noise; a
  too-coarse one provides no value. Plan to tune based on real cohort
  data, and be willing to publish the tuning openly.
- Don't over-claim: a student practicing because the platform
  suggests it isn't proof they understood the material.

---

## 8. AI Tutor with Declared Uncertainty

### What it is

When a student-facing AI tutor is added (likely v2 or v3), it's
designed to *explicitly* signal when it's not sure of an answer. *"I'm
not certain about this — my best guess is X, but it might be Y, and
the difference depends on whether you're using the geocentric or
heliocentric reference frame here."* Ambiguous cases are surfaced to
the instructor as signals of curriculum gaps.

### The learning science

Modeling intellectual virtues — including the virtue of acknowledging
uncertainty — is a form of *implicit curriculum*. Students absorb how
their teachers (human or AI) handle being wrong, being unsure, being
corrected. An AI tutor that performs certainty teaches students that
smart things are sure things; an AI tutor that declares uncertainty
teaches them that smart reasoning includes knowing what you don't
know.

This is consistent with research on epistemic cognition and on what
teachers' epistemological views convey to students (Hofer, Pintrich).
It's also consistent with the broader scientific norm — *mertonian
norms* of organized skepticism, the practice of stating confidence
intervals on results, the convention of acknowledging
limitations in research papers.

### What's novel

Most ed-tech AI tutors perform certainty as a UX virtue. Yours would
model scientific honesty as a UX virtue. This is a deliberate
counter-design choice. It pairs with the *Confidence-Calibrated
Predictions* feature: the platform asks students to be calibrated; it
should ask the same of its AI tutor.

### How it works in the platform

- AI tutor responses include a structured uncertainty field (confidence
  score, plus optional "what I'm not sure about" text).
- The UI renders uncertainty visibly — not buried in a footnote.
- Below a threshold, the AI explicitly recommends: "this is a good
  question to bring to office hours" or "the platform has flagged this
  for your instructor's review."
- Logged ambiguous cases form a feed for the instructor to triage —
  they reveal curriculum gaps and potential misconceptions.

### Why it earns a place

- Models scientific virtue — directly aligned with the calibration
  training elsewhere in the platform.
- Distinctive in a noisy ed-tech AI landscape.
- Generates real signal for curriculum improvement.
- Matches the user's stated preference ("say 'I don't know' if
  uncertain") for working with AI generally.

### Risks and cautions

- Some students find an uncertain AI annoying — they want answers,
  not epistemics. Frame uncertainty as a feature, not a bug, in
  onboarding.
- Calibrating the AI's own uncertainty is hard — modern LLMs are not
  natively well-calibrated on confidence. May require explicit prompt
  engineering, retrieval-augmented grounding, or fine-tuning.
- Don't over-claim: the AI saying "I'm confident" is not the same as
  it being correct. Pair confidence display with citations or
  reasoning traces where possible.

---

## Honorable Mentions

These didn't make the top eight but are worth noting in case any spark
something later.

### Pedagogical version control

Students fork a chapter and submit pull requests as a form of deep
engagement; approved edits improve the textbook for future cohorts.
Genuinely novel — turns the textbook into open-source-style
infrastructure. Probably too friction-y for ASTR 101/201 students, but
could fit COMP 521 or ASTR 596 graduate students well. The "prepare
to teach" effect is at maximum here.

### Inverse problems first

Start with the answer; ask students what observations could produce
it. A real pedagogical tradition (Modeling Instruction, the Workshop
Physics curriculum), but probably too disorienting as a default frame.
Works best as an occasional structural variant for chapters where the
result is more iconic than the derivation.

### Unit-aware code cells

Pyodide cells with `astropy.units` integration that catches dimensional
errors at runtime. Useful instructor-time-saver and pairs naturally
with `<UnitCheck>`. Not so much a pedagogical novelty as a
quality-of-life improvement that lets you teach unit-tracking by
example rather than by exhortation.

### Live concept-map diagnostic

After a section, the student arranges the concepts they just learned
on a canvas; AI compares to the canonical concept map for the section.
Powerful but needs significant UI investment (drag-and-drop concept
nodes, edge construction, fuzzy comparison logic).

### Citation challenges

Every claim links to a primary source. Students can challenge a claim
with their own citation. Instructor mediates; correct challenges
become annotations. Crowdsourced peer review of the textbook itself.
Works best for graduate-level material (ASTR 596).

### Cosmic perspective slider

Anything you're studying can be zoomed across scales: from atom →
planet → galaxy → universe. Builds scale-awareness as a core
astronomy/physics skill. Beautiful concept, expensive to implement
well.

---

## Implementation Order

These are designed to be added incrementally over multiple semesters,
not all at once. Each is a real design and tuning project. The
platform's value is in compound integration over time, not in feature
completeness on day one.

A reasonable order of adoption:

1. **Confidence-Calibrated Predictions** first — cheapest, highest
   value, plugs into existing `<Prediction>`. Day one.
2. **Predict the Plot** next — leverages existing figure-heavy
   chapters, gives a striking visible result. Adoptable mid-semester.
3. **Pre-mortem Mode** alongside any COMP chapter that runs
   simulations — solves a real problem in those chapters. Add when the
   first COMP chapters get migrated.
4. **Time-Machine Videos** when video content reaches critical mass
   (~5+ chapter videos) — the pedagogy needs the volume.
5. **Misconception NPCs** when AI tutor infrastructure is in place
   (likely v2). Highest novelty, requires careful tuning of system
   prompts and dialogue limits.
6. **Concept Latency** when cross-session usage is established.
   Requires real interaction data to tune the decay model meaningfully.
7. **AI Tutor with Declared Uncertainty** when you commit to a
   student-facing tutor. The uncertainty design is *part of* the
   tutor design, not a follow-on.
8. **Replay the Discovery** as a chapter-level structural choice —
   deploy on foundational topics where the historical data is rich
   (parallax, blackbody, expansion of universe, stellar nucleosynthesis).

Each adoption should be evaluated in its first semester:
- Did students engage with it?
- Did learning outcomes improve on related concepts?
- Did the audit/data signal anything actionable?
- Was the tuning effort worth the pedagogical gain?

The platform's `audit` mechanism should track which innovations are
in use per chapter, so the answer to "does this earn its keep" is
visible in the data, not just instructor intuition.

---

## Connection to existing pedagogy

These innovations don't replace your existing pedagogical components —
they extend them along axes the existing components don't reach:

| Existing component | Extended by                                                |
|--------------------|------------------------------------------------------------|
| `<Prediction>`     | Confidence calibration, Time-Machine Videos, Predict the Plot |
| `<Misconception>`  | Misconception NPCs                                         |
| `<FigureReading>`  | Predict the Plot                                           |
| `<UnitCheck>`      | Adversarial unit checks (honorable mention), unit-aware code cells |
| `<Assumption>` / `<ModelLimit>` | Pre-mortem Mode                                |
| `<OMI>` / `<PMI>`  | Replay the Discovery (OMI temporally extended)             |
| `<Checkpoint>`     | Concept Latency                                            |
| (none yet)         | AI Tutor with Declared Uncertainty (new modality)          |

Most of these innovations strengthen the existing pedagogy by giving
it longitudinal teeth — the same prediction or misconception or
checkpoint isn't just one moment of learning; it's a data point in a
longer trajectory the student and instructor can both see.

---

## What this is not

To be clear about what this list deliberately *doesn't* include:

- **Gamification** in the points/badges/leaderboard sense. None of
  these innovations involves competitive scoring or extrinsic
  reward systems. The motivation comes from the pedagogy itself.
- **Adaptive learning paths** in the "the platform decides what you
  see next" sense. The instructor and the chapter structure decide
  what students see; the platform supports the chosen path with
  better tools.
- **AI grading at scale.** The platform supports AI feedback, but
  grading remains the instructor's responsibility. AI surfaces
  signal; it doesn't make summative decisions.
- **Replacement for teaching.** None of these innovations reduce the
  importance of the instructor's role. They're scaffolding for active
  engagement, not autopilot.

---

## Open questions for further design

- Which of these should the **content audit** check for / encourage?
  (E.g., should every chapter with a figure be expected to have a
  Predict-the-Plot prompt? Probably not. But what's the threshold?)
- How should innovations be **opt-in vs. default**? Calibration
  tracking probably defaults on; Misconception NPCs probably opt-in.
- What's the **research methodology** for evaluating each innovation
  in real cohorts? Pre/post conceptual inventories? Comparison
  semesters? Qualitative student feedback?
- How do these innovations **change with the dual-profile system**?
  Do instructors see different views of the same data than students?
- Which innovations should be **portable** to other platforms (open
  source) vs. tightly coupled to your specific stack?

These deserve their own follow-up docs as the platform takes shape.
