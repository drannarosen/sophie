---
title: Teaching Move Library
short_title: Teaching moves
description: Sophie's canonical taxonomy of pedagogical moves — 18 named moves with cognitive-science citations, practice glosses, descriptions, and the Sophie components that implement each one.
tags: [pedagogy, reference, teaching-moves, taxonomy, cognitive-science]
---

# Teaching Move Library

Sophie's canonical taxonomy of pedagogical moves. Each entry has a
literature-grounded canonical name, a practice gloss (the name
instructors actually use), citations where available, a description,
the Sophie components that implement it, and adjacency notes
("don't confuse with…").

The full rationale for the library — taxonomy origin, where
`pedagogy_intent` lives in code, why these 18 moves at v1 — is in
[ADR 0041 — Teaching Move Library](../decisions/0041-teaching-move-library.md).

This reference doc is the **source of truth** for the move
vocabulary. TDRs ([ADR 0040](../decisions/0040-teaching-decision-records.md))
cite moves by their canonical name. Future AI authoring prompts
ground in this list. A subsequent code PR will populate
`packages/components/src/pedagogy/move-index.ts` mirroring this
content.

## Move families

The 18 v1 moves cluster into 7 families. Move IDs (kebab-case) are
the canonical identifiers used in `move-index.ts` and TDR
References.

| Family | Move IDs |
|---|---|
| [Eliciting prior knowledge](#family-eliciting-prior-knowledge) | `elicit-prior-model`, `productive-cognitive-conflict`, `predict-observe-explain` |
| [Confronting misconceptions](#family-confronting-misconceptions) | `misconception-confrontation`, `bridging-analogy` |
| [Worked examples + fading](#family-worked-examples-and-fading) | `worked-example-with-fading`, `backwards-faded-scaffolding`, `productive-failure` |
| [Representations + comparison](#family-representations-and-comparison) | `comparison-cases`, `multiple-representations-binding`, `concrete-fading` |
| [Metacognition + retrieval](#family-metacognition-and-retrieval) | `self-explanation-prompt`, `retrieval-practice`, `transfer-prompt` |
| [Diagnostics](#family-diagnostics) | `concept-inventory-probe` |
| [Sophie-native](#family-sophie-native) | `observable-model-inference-scaffold`, `approximation-honesty`, `frontier-flagging` |

---

(family-eliciting-prior-knowledge)=
## Family: eliciting prior knowledge

Moves that surface what students *already believe* about a phenomenon
before formal instruction. Foundational because student mental models
— including wrong ones — are load-bearing for what they'll learn
next.

### `elicit-prior-model`

**Canonical name**: Elicit prior model.

**Also known as**: predict-then-reveal; "what do you think will
happen?"; "let's surface your mental model first."

**Description**: Before introducing the formal explanation of a
phenomenon, ask students to articulate their current understanding
or prediction. The articulation itself is the goal — it makes the
student's mental model visible to themselves (and to the
instructor). Productive engagement with new content depends on the
student *knowing what model they're updating*.

**Sophie components**: `<Predict>`.

**Don't confuse with**: `concept-inventory-probe` (which is
diagnostic — measuring the misconception's prevalence); this move
is instructional — surfacing the model for the individual student
who is about to learn.

**Citation**: Posner, G. J., Strike, K. A., Hewson, P. W., &
Gertzog, W. A. (1982). Accommodation of a scientific conception:
Toward a theory of conceptual change. *Science Education*, 66(2),
211–227.

---

### `productive-cognitive-conflict`

**Canonical name**: Productive cognitive conflict.

**Also known as**: dissonance; "wait — that doesn't match what I
thought"; misconception elicitation via contradictory evidence.

**Description**: After eliciting a prior model, present evidence
that contradicts it. The cognitive dissonance between
*what-the-student-predicted* and *what-actually-happens* is the
engine that drives genuine conceptual change. Mere correction
("actually, it's X") rarely displaces a prior model; productive
conflict — where the student experiences the model's failure
firsthand — does.

**Sophie components**: `<Predict>` + `<Aside kind="misconception">`
or `<Callout variant="misconception">`. Often paired with a
contrasting figure or contrasting `<KeyEquation>`.

**Don't confuse with**: `misconception-confrontation` (which is the
later move of explicitly naming-and-correcting the wrong model);
this move is the *earlier* move of inducing the conflict.

**Citation**: Vosniadou, S. (1994). Capturing and modeling the
process of conceptual change. *Learning and Instruction*, 4(1),
45–69. Also: Chinn, C. A., & Brewer, W. F. (1993). The role of
anomalous data in knowledge acquisition. *Review of Educational
Research*, 63(1), 1–49.

---

### `predict-observe-explain`

**Canonical name**: Predict-observe-explain (POE).

**Also known as**: POE; predict-then-verify-then-reconcile; commit-
check-explain.

**Description**: A complete instructional sequence: (1) student
predicts the outcome; (2) student observes the actual outcome (or
reads the evidence); (3) student explains the gap or alignment. The
"explain" phase is critical — it's where the student integrates the
new evidence into their model, rather than just memorizing the
correct answer. POE is one of the most-evidenced moves in
science-education literature.

**Sophie components**: `<Predict>` (commit phase) → `<Figure>` /
`<KeyEquation>` / prose (observe phase) → `<Reflection>` or
`<ComprehensionGate>` (explain phase). The three components work
as a sequence.

**Don't confuse with**: `elicit-prior-model` alone (which is just
the predict phase); POE is the full three-step move.

**Citation**: White, R. T., & Gunstone, R. F. (1992). *Probing
understanding*. London: Falmer Press.

---

(family-confronting-misconceptions)=
## Family: confronting misconceptions

Moves that explicitly address student wrong models — not by
ignoring them or correcting once, but by surfacing them, naming
them, and helping the student see why the correct model better
explains the evidence.

### `misconception-confrontation`

**Canonical name**: Misconception confrontation.

**Also known as**: naming-the-wrong-model; "you might think X, but
actually…"; explicit-correction-with-reasoning.

**Description**: Explicitly name the common wrong model students
hold, articulate it sympathetically (students should recognize their
own thinking), then present the correct model with the reasoning
that distinguishes the two. The naming is essential — students
can't update what they can't see they hold.

**Sophie components**: `<Aside kind="misconception">` (short form;
1–2 sentences flagging the wrong model) or
`<Callout variant="misconception">` (long form; multi-paragraph
contrast with worked-out reasoning). Per
[ADR 0038](../decisions/0038-pedagogy-index-pattern.md) §1 PR-C3
revision, both feed `pedagogyIndex.misconceptions` with a
length-discriminator.

**Don't confuse with**: `productive-cognitive-conflict` (which is
the earlier *induction* of the dissonance); this move is the *later*
explicit *naming* of what model was wrong.

**Citation**: Driver, R., Guesne, E., & Tiberghien, A. (Eds.).
(1985). *Children's ideas in science*. Milton Keynes, UK: Open
University Press.

---

### `bridging-analogy`

**Canonical name**: Bridging analogy.

**Also known as**: anchored analogy; "this is like X you already
know."

**Description**: Connect a target concept to a familiar concept the
student already understands, in a way that scaffolds rather than
oversimplifies. Good bridging analogies preserve the *structural*
features that matter for the target concept; bad ones import
misleading features (the balloon analogy for cosmic expansion is
infamous for implying a center). Use with explicit limits stated
("the analogy works up to point X; here it breaks down because…").

**Sophie components**: `<Aside kind="definition">` (where the
analogy lives as the term's definition body) + prose introducing the
analogy and its limits. Often paired with `<Aside kind="misconception">`
to flag what the analogy *would* mislead about if pushed too far.

**Don't confuse with**: `concrete-fading` (which is a sequence from
concrete-to-abstract for the *same* concept); analogy connects
*different* concepts (familiar → target).

**Citation**: Clement, J. (1993). Using bridging analogies and
anchoring intuitions to deal with students' preconceptions in
physics. *Journal of Research in Science Teaching*, 30(10),
1241–1257.

---

(family-worked-examples-and-fading)=
## Family: worked examples and fading

Moves that scaffold problem-solving by showing the reasoning, then
gradually transferring responsibility to the student. Foundational
in STEM where derivations and procedures must be modeled before
practiced.

### `worked-example-with-fading`

**Canonical name**: Worked example with fading.

**Also known as**: model-then-practice; "watch one, do one, teach
one" (medical-education adaptation).

**Description**: Present a fully worked example showing each
reasoning step with explicit justifications. In subsequent problems,
gradually fade ("fade out") the explicit reasoning — first removing
one step's justification, then more, until the student is doing all
steps unsupported. The fading sequence is the move; a one-shot worked
example without fading is incomplete.

**Sophie components**: `<WorkedExample>` (component forthcoming; per
[ADR 0023 vertical-slice-first](./0023-vertical-slice-build-order.md)
this component lands when a chapter authoring need surfaces it).
Sequence: full worked example → partially-faded version → student
practice problem.

**Don't confuse with**: `backwards-faded-scaffolding` (which is a
*different* fading pattern, removing parts from the end first
rather than from individual steps); this move fades step-by-step
reasoning, not problem segments.

**Citation**: Sweller, J. (1988). Cognitive load during problem
solving: Effects on learning. *Cognitive Science*, 12(2), 257–285.
Also: Renkl, A. (2014). Toward an instructionally oriented theory
of example-based learning. *Cognitive Science*, 38(1), 1–37.

---

### `backwards-faded-scaffolding`

**Canonical name**: Backwards-faded scaffolding.

**Also known as**: "solve-forward, then re-solve-with-parts-blanked";
end-first removal.

**Description**: After a fully worked example, the student re-solves
the *same* problem with the *last* step blanked out, then the last
two steps, etc. The blanked steps grow backwards from the end. This
forces the student to internalize the goal-directedness of the
procedure (working backwards from the answer to the next-most-
distant step) rather than executing a forward algorithm.

**Sophie components**: `<WorkedExample>` (component forthcoming)
with a `fading: "backwards"` variant. Distinct from forward fading
in implementation.

**Don't confuse with**: `worked-example-with-fading` (which fades
the *reasoning justifications* within each step, in order); this
move fades *whole steps from the end*.

**Citation**: Schwartz, D. L., & Martin, T. (2004). Inventing to
prepare for future learning. *Cognition and Instruction*, 22(2),
129–184.

---

### `productive-failure`

**Canonical name**: Productive failure.

**Also known as**: "let them struggle first"; pre-instructional
problem-solving.

**Description**: Pose a complex problem *before* teaching the
relevant procedure. Let students try (and fail) to solve it using
their existing knowledge. Then introduce the formal procedure. The
prior struggle activates the conceptual structures the procedure
addresses, making the eventual instruction more meaningful than
front-loaded explanation would be. Counter-intuitive — it works
*because* of the failure, not despite it.

**Sophie components**: `<Predict>` (the prediction phase IS the
attempt) + delayed reveal in a subsequent section. Sometimes
paired with `<ComprehensionGate>` set to release the formal
procedure only after a meaningful attempt.

**Don't confuse with**: `predict-observe-explain` (which is about
*outcome* prediction); productive failure is about *procedure*
attempt — students try to solve a problem, not predict an
outcome.

**Citation**: Kapur, M. (2008). Productive failure. *Cognition and
Instruction*, 26(3), 379–424.

---

(family-representations-and-comparison)=
## Family: representations and comparison

Moves that build deep understanding by binding multiple
representations of the same concept (prose, equation, plot, code,
diagram, physical intuition) and by juxtaposing related concepts
for contrast.

### `comparison-cases`

**Canonical name**: Comparison cases.

**Also known as**: contrasting cases; "compare and contrast";
side-by-side examples.

**Description**: Present two (or more) related cases side by side
so students must articulate what varies and what stays constant.
Comparing surfaces the *invariant features* (the conceptual core)
better than studying either case alone — invariants only become
visible against variation. Especially powerful for distinguishing
confusable concepts (e.g., flux vs. luminosity, velocity vs.
acceleration).

**Sophie components**: `<MultiRep>` (component forthcoming via
[vision/features/accepted.md](../vision/features/accepted.md) A4) +
paired `<Figure>` blocks + paired `<KeyEquation>` blocks. The
juxtaposition is the move.

**Don't confuse with**: `bridging-analogy` (which connects an
unfamiliar concept to a *familiar* one); comparison cases compares
two *related target concepts*.

**Citation**: Schwartz, D. L., & Bransford, J. D. (1998). A time
for telling. *Cognition and Instruction*, 16(4), 475–522.

---

### `multiple-representations-binding`

**Canonical name**: Multiple representations binding.

**Also known as**: MRB; representational coherence; "the same idea
in 5 different forms."

**Description**: Present the same concept across multiple
representational modes — prose, equation, graph, diagram, code,
physical-intuition narrative — with explicit cross-mappings so
students see them as views of *one* underlying concept. Deep
understanding shows up as *fluent translation* between
representations. Most STEM learning fails when students learn one
representation in isolation and can't translate.

**Sophie components**: `<MultiRep>` (component forthcoming via A4).
Composes existing primitives — `<Figure>`, `<KeyEquation>`,
`<CodeCell>` (forthcoming), prose — with explicit binding
metadata. The future Representation Alignment Audit (A4)
verifies notation consistency across the bound representations.

**Don't confuse with**: `comparison-cases` (which compares
*different concepts*); MRB binds *one concept* across modes.

**Citation**: Ainsworth, S. (2006). DeFT: A conceptual framework
for considering learning with multiple representations. *Learning
and Instruction*, 16(3), 183–198.

---

### `concrete-fading`

**Canonical name**: Concrete-fading.

**Also known as**: "start concrete, abstract progressively";
representational fading.

**Description**: Begin instruction with concrete representations
(physical objects, diagrams, specific numerical examples) and
gradually shift toward abstract representations (variables,
general equations, symbolic notation). The fading sequence helps
students see the abstract as a *generalization* of the concrete,
rather than as a separate disconnected formalism. Used for
introducing variables, derivations, generalized equations.

**Sophie components**: Sequence of `<Figure>` (concrete) →
`<KeyEquation>` (with specific numerical instance) →
`<KeyEquation>` (generalized symbolic form) → `<Aside
kind="definition">` (abstract definition). Sometimes paired with
prose narrating the fading.

**Don't confuse with**: `worked-example-with-fading` (which fades
*reasoning steps*); this move fades *representational concreteness*.

**Citation**: Goldstone, R. L., & Son, J. Y. (2005). The transfer
of scientific principles using concrete and idealized simulations.
*Journal of the Learning Sciences*, 14(1), 69–110.

---

(family-metacognition-and-retrieval)=
## Family: metacognition and retrieval

Moves that prompt students to think about their own thinking,
practice recall (rather than re-read), and apply learning in new
contexts.

### `self-explanation-prompt`

**Canonical name**: Self-explanation prompt.

**Also known as**: "explain it back to yourself"; reflective
articulation; metacognitive prompting.

**Description**: Ask students to articulate *in their own words*
the reasoning behind a worked example, derivation, or concept they
just encountered. The articulation forces them to identify the
gaps in their understanding — passive reading hides these gaps;
self-explanation surfaces them. One of the most robust effects in
the metacognition literature.

**Sophie components**: `<Reflection>` (the canonical Sophie
self-explanation primitive — free-text response prompt) or
`<ComprehensionGate>` (when paired with a specific question
checking the explanation). `<ConfidenceCheck>` can serve as a
lighter-weight variant ("how well do you understand…?").

**Don't confuse with**: `retrieval-practice` (which is *recall
under test*, not *articulation of reasoning*); this move asks for
explanation, not recall.

**Citation**: Chi, M. T. H., De Leeuw, N., Chiu, M.-H., &
LaVancher, C. (1994). Eliciting self-explanations improves
understanding. *Cognitive Science*, 18(3), 439–477.

---

### `retrieval-practice`

**Canonical name**: Retrieval practice.

**Also known as**: testing effect; "close the book and write it
down"; spaced recall.

**Description**: Prompt students to recall what they've learned
*from memory*, without reference materials. The act of retrieval
strengthens long-term retention far more than re-reading does — a
counter-intuitive finding now well-evidenced. Best deployed at
spaced intervals (immediately after learning, then days later,
then weeks later).

**Sophie components**: `<ComprehensionGate>` configured with
recall-style questions (no reference allowed). Future
retrieval-audio (per [vision/features/backlog.md](../vision/features/backlog.md)
B6 multi-modal generation pipeline) extends this to audio-paced
recall prompts for commute review.

**Don't confuse with**: `self-explanation-prompt` (which asks for
*reasoning articulation*); retrieval practice is *recall under
test*.

**Citation**: Roediger, H. L., & Karpicke, J. D. (2006).
Test-enhanced learning: Taking memory tests improves long-term
retention. *Psychological Science*, 17(3), 249–255.

---

### `transfer-prompt`

**Canonical name**: Transfer prompt.

**Also known as**: "now apply this to…"; far-transfer scaffolding;
cross-domain application.

**Description**: Ask students to apply a concept just learned in
one context to a *new* context — typically further from the
original than the practice problems. Transfer is the deepest sign
of learning; if students can only apply a concept to problems
identical to the worked example, they haven't transferred. Often
paired with `<ChapterRef>` to a *future* chapter ("we'll come back
to this in Chapter X").

**Sophie components**: `<Reflection>` (transfer variant — open-
ended prompt asking student to apply in new context) +
`<ChapterRef>` (anchoring the cross-domain context). Sometimes
paired with `<ComprehensionGate>` for a closed-ended transfer
check.

**Don't confuse with**: `self-explanation-prompt` (which asks for
*explanation in original context*); transfer prompts ask for
*application in new context*.

**Citation**: Barnett, S. M., & Ceci, S. J. (2002). When and where
do we apply what we learn? A taxonomy for far transfer.
*Psychological Bulletin*, 128(4), 612–637.

---

(family-diagnostics)=
## Family: diagnostics

Moves that measure (rather than instruct) — assessment formats
specifically designed to reveal student misconceptions.

### `concept-inventory-probe`

**Canonical name**: Concept-inventory probe.

**Also known as**: CI question; diagnostic distractor; "the wrong
answer is the data."

**Description**: A multiple-choice question where each *wrong*
answer is carefully constructed to represent a known misconception.
The pattern of student choices reveals which misconceptions are
prevalent in the cohort. The Force Concept Inventory (FCI) is the
canonical example — every distractor maps to a specific Aristotelian
physics intuition. Used pre/post-instruction to measure conceptual
change.

**Sophie components**: `<ComprehensionGate>` configured as a CI
probe (distractors map to misconceptions in the chapter's
misconception index per A5 Misconception Graph). Pre/post
deployment would feed the eventual closed-loop pedagogy work
(speculative; [vision/features/speculative.md](../vision/features/speculative.md)
S4).

**Don't confuse with**: `retrieval-practice` (which uses recall to
strengthen memory); CI probes use multiple-choice with diagnostic
distractors to *measure prevalence*, not strengthen anything.

**Citation**: Hestenes, D., Wells, M., & Swackhamer, G. (1992).
Force Concept Inventory. *The Physics Teacher*, 30(3), 141–158.

---

(family-sophie-native)=
## Family: Sophie-native

Moves that don't have a single dominant citation in the cognitive-
science literature but are load-bearing for Sophie's STEM-teaching
context. Each entry names the practice tradition; new citations may
be added as the literature catches up.

### `observable-model-inference-scaffold`

**Canonical name**: Observable → model → inference scaffold.

**Also known as**: OMI scaffold; the three-stage epistemic arc;
"start with what we see, then build the model, then derive what
follows."

**Description**: Structure each new concept's prose in three
explicit moves: (1) the *observable* phenomenon students can
witness or measure (e.g., redshift in galaxy spectra); (2) the
*model* that explains the observable (e.g., universal expansion);
(3) the *inference* that follows from the model (e.g., the
existence of a finite cosmic age). Aligned with Hempelian
deductive-nomological reasoning but adapted as a *pedagogical*
scaffold — making the epistemic structure of scientific reasoning
visible to students who typically encounter only the *model* layer
in textbooks.

**Sophie components**: Three-paragraph prose structure (observable
prose → `<KeyEquation>` or `<Figure>` for the model →
inference prose). Sometimes `<Predict>` punctuates the
observable→model transition. Per Anna's ASTR 201 pedagogical
contract, this scaffold is the *default* reasoning shape every
content chapter follows.

**Don't confuse with**: `predict-observe-explain` (which is an
*instructional* sequence over a specific question); OMI is the
*epistemic structure* of how knowledge is justified, used to
organize a whole section's prose.

**Citation**: No single dominant citation; rooted in Hempelian
philosophy of science (Hempel, C. G. (1965). *Aspects of scientific
explanation*) as adapted for instructional design. Sophie-native;
to be developed further as a Sophie-specific construct in
[`vision/pedagogy/observable-model-inference.md`](../vision/pedagogy/index.md)
(forthcoming).

---

### `approximation-honesty`

**Canonical name**: Approximation honesty.

**Also known as**: "when does this approximation work?"; declared
validity regime; "≈ with limits."

**Description**: When prose or equations invoke an approximation
("for nearby galaxies, redshift ≈ v/c"), explicitly declare
(a) the validity regime, (b) where the approximation breaks down,
(c) why it's useful pedagogically despite being inexact. Students
otherwise often memorize approximations as exact relations, then
mis-apply them outside the valid regime. Especially load-bearing
for STEM where almost every equation is an approximation of
something.

**Sophie components**: `<Approximation>` (component forthcoming
via [`vision/features/backlog.md`](../vision/features/backlog.md)
B2). The component declares `statement`, `valid_when`,
`breaks_when`, `why_useful`. Audit invariant flags prose-level
`≈` / `∼` / "roughly" without a corresponding `<Approximation>`
block.

**Don't confuse with**: `multiple-representations-binding` (which
is about representational coherence); approximation honesty is
about *regime declaration* — when does this equation actually
hold?

**Citation**: No single citation; STEM-teaching folk practice with
roots in physics-education research's emphasis on epistemological
sophistication. Sometimes cited as part of "nature of science"
pedagogy (Lederman, N. G., et al. (2002). Views of nature of
science questionnaire. *Journal of Research in Science Teaching*,
39(6), 497–521.) but not specifically.

---

### `frontier-flagging`

**Canonical name**: Frontier flagging.

**Also known as**: open-question callout; "we don't know"; the
research-frontier signal.

**Description**: Explicitly mark places in the curriculum where
the scientific understanding is *incomplete* — open research
questions, contested interpretations, areas under active
investigation. Students otherwise often assume textbook content
is *settled* and lose interest in the field; flagging the frontier
reveals that science is alive and that they could contribute. Anna's
ASTR 201 Module 1 already uses this via the `:::{.callout-frontier}`
Quarto syntax (e.g., "What is dark energy?", "Why does gravity
exist?", "Is the speed of light truly constant?").

**Sophie components**: `<Callout variant="frontier">` (forthcoming
this sprint; per [vision/features/backlog.md](../vision/features/backlog.md)
B-tier and the pre-Phase-4 Module 1 migration plan). The frontier
variant is paired with `<ChapterRef>` to "where to read more" when
the question has a future-chapter or future-course landing.

**Don't confuse with**: `misconception-confrontation` (which is
about wrong models students hold); frontier-flagging is about
genuine open questions where *the field* doesn't yet have answers.

**Citation**: No single citation; Sophie-native convention. Adjacent
to "nature of science" pedagogy (Lederman, N. G., 2007) and to
science-communication norms about expressing scientific uncertainty.

---

## Adding a new move

The 18-move list is the v1 floor, not the ceiling. New moves can be
added when:

1. A real chapter authoring need surfaces a pedagogical pattern not
   covered by existing moves.
2. A Sophie component ships that implements a previously-unnamed
   move.
3. Cognitive-science literature suggests a move that strengthens
   Sophie's repertoire AND a Sophie component is positioned to
   implement it.

Process: add the move to this reference doc following the existing
entry template; update `packages/components/src/pedagogy/move-index.ts`
when the code PR lands; append a `## Revisions §N` section to
[ADR 0041](../decisions/0041-teaching-move-library.md) recording
the addition + reason.

Renaming a move follows the same process. Removing a move is *not*
recommended once TDRs reference it — instead, mark the move as
deprecated in this reference doc with a pointer to its replacement.
