---
title: Risks and discipline
short_title: Risks
description: Four risks Sophie underweights, the strongest critiques a reviewer will raise, and the scope-discipline watchpoints that keep Sophie shippable rather than infinitely scoped. Read before every roadmap revision and every grant submission.
tags: [strategy, landscape, risk, scope, governance, prose]
---

# Risks and discipline

The previous pages locate Sophie in the field. This page names the
risks. The audit that produced this section found that Sophie's
technical scope is well-disciplined — vertical wedges, ADR-locked
before code, zero contradicting decisions across 78 ADRs. The
pedagogical and strategic scope is where the watchpoints live.

This page exists so the risks have *names*, *triggers*, and
*mitigation plans* — not so they live as background anxiety. Last
full review: **2026-05-22**.

## The four risks Sophie underweights

### 1. The Open Cognitive Graph paper is uncited

**The risk.** A CAREER reviewer, Cottrell selection committee
member, or ApJ-Ed referee surfaces Open Cognitive Graph
(arXiv 2602.16949) before Sophie does. The paper is the *theoretical
articulation* of Sophie's load-bearing thesis. Sophie reads as "OCG
with code" rather than as "first production implementation of OCG-
style infrastructure" — a one-line rejection note.

**The mitigation.** Read OCG this week. Cite it in the CAREER
narrative, Paper #1 introduction, and `positioning.md` differentiator
section. Frame Sophie as the production realization of OCG's
theoretical proposal. See [academic prior art § 1](academic-prior-art.md).

**Trigger to escalate:** If any reviewer comment in any submission
mentions OCG before the next revision lands the citation, the
positioning is already behind. Escalate to a rewrite, not a patch.

(prose-positioning)=

### 2. PROSE Consortium is uncited or framed as competition

**The risk.** PROSE has NSF Award #2230153, four-plus PIs across
institutions, 100+ open-source textbooks in production, native braille
output, and an active accessibility-funding line (PROTEUS at U-
Michigan Marsal). They own the "schema-driven accessible STEM
textbook" narrative. A CAREER reviewer with PROSE connections
reading a Sophie pitch that positions head-on against PROSE will
score the proposal lower. A pitch that ignores PROSE entirely reads
as either underprepared or arrogant.

**The mitigation.** Position Sophie **additively** with PROSE, not
against it:

> "Sophie layers OCG-style epistemic semantics and an AI-authoring
> contract on top of (or interoperable with) schema-driven publishing
> traditions, of which PROSE is the leading exemplar."

Concrete actions:

- **Read the PreTeXt accessibility guide and the PROTEUS award page
  before drafting any landscape paragraph.** See
  [comparators § PreTeXt + Runestone](comparators.md).
- **Reach out to a PROSE PI.** A 30-minute conversation about
  interop possibilities is cheaper than a CAREER rejection. Likely
  outcomes: (a) PROSE PI becomes a CAREER letter writer; (b)
  collaboration becomes a future-work bullet; (c) PROSE PI surfaces
  a critique now that would have been worse later.
- **Treat PreTeXt's RELAX-NG schema as interop target.** Future
  Sophie capability to import/export PreTeXt is a strong reviewer-
  facing claim.

**Trigger to escalate:** If a 2026 grant cycle closes without an
explicit PROSE positioning paragraph in the proposal, the next cycle
must include one.

### 3. The AI-authoring story is design-only

**The risk.** Sophie's load-bearing claim is that *the schema
constrains AI emission usefully* — that the eight-role contract
catches structural pedagogical failures that retrieval-augmented
free-text generation does not. As of 2026-05-22, no chapter has been
authored AI-first end-to-end in Sophie. The
[M2-L3 spectra-and-composition pilot](../../pilots/m2-l3-spectra-composition.md)
demonstrates schema expressiveness; it does not demonstrate AI-
emission constraint.

A reviewer asking *"what AI failure modes does Sophie's schema
prevent that RAG-only generation does not?"* will not yet find an
answer in the codebase.

**The mitigation.** Design and run an *AI-emission red-team report*
before the next grant cycle:

1. **Pick a target chapter** — ideally a future ASTR 201 or
   COMP 521 lecture not yet written.
2. **Draft it three ways:**
   a. **Schema-constrained:** AI authoring through Sophie's
      MDX+Zod contract, with the eight-role taxonomy as the
      grammar.
   b. **RAG-only:** AI authoring with the same source material
      pool but free-text Markdown output, no schema.
   c. **Free-form:** AI authoring with no retrieval and no schema.
3. **Audit each draft** against the eleven pedagogy-index audit
   invariants and axe-core a11y gates.
4. **Report the diff.** Which failure modes did the schema catch?
   Which did it miss? Which did it create?
5. **Publish the report** as a Sophie pilot artifact, link it from
   `vision/`, cite it in Paper #1.

This is the single most valuable empirical artifact Sophie can
produce in the next six months. It is also the strongest possible
answer to the "prove the schema constrains AI usefully" critique.

**Trigger to escalate:** If three months pass without a planned
red-team report on the roadmap, scope discipline has slipped toward
feature surface over evidence.

### 4. Single-PI longevity has no documented answer

**The risk.** PROSE has multiple PIs and NSF runway. Project Jupyter
has formal governance. The Executable Books Project has Project
Jupyter institutional backing. Sophie has one pre-tenure professor.
The platform's longevity story has to address governance now, not at
tenure-decision time.

A reviewer asks: *"What happens to Sophie if Anna takes a
sabbatical, gets pregnant, leaves SDSU, or hits a wall?"* AGPL is
the right license choice but does not, by itself, answer this
question.

**The mitigation.** Map a governance path *before* CAREER review:

| Option | Effort | Timeline | Notes |
| --- | --- | --- | --- |
| **Foundation umbrella** (Mozilla Foundation MOSS, Apache Incubator, CZI EOSS) | Medium | 6–12 months application | EOSS most fitting for science-oriented projects |
| **Project Jupyter / Executable Books integration** | High (governance + technical) | 12–18 months | Strong narrative; would require schema-format negotiation |
| **PROSE Consortium merge or interop track** | Medium-High | 12 months | Strong reviewer story; risks subordinating Sophie's distinctive bundle |
| **SDSU institutional commitment** | Low effort, low impact | Immediate | Useful as bridge; not sufficient as longevity claim |
| **Co-PI recruitment** | Medium | 6 months | One additional PI (DBER or CS-ed) materially changes single-PI critique |

**Recommended path:**

1. **CZI EOSS application** for v1+. Their scope explicitly includes
   open-source scientific tooling; the program has funded several
   Jupyter-adjacent projects. Application is ~3 months.
2. **One co-PI recruitment** before CAREER submission. Best fit:
   a DBER researcher at SDSU or partnering CSU campus, or a
   computer-science-education researcher with NSF CISE track
   record.
3. **Explicit governance section in `positioning.md`** naming the
   path chosen. Reviewers should see the longevity answer at the
   top of the positioning doc, not as a missing piece.

**Trigger to escalate:** If CAREER submission lands without a named
governance path, the proposal is at material risk.

## The strongest critiques a reviewer will raise

In priority order, with Sophie's defensible response per critique.
These belong in the CAREER narrative, Paper #1, and the public-facing
`positioning.md`.

### Critique 1: "Prove the schema actually constrains AI usefully"

**The response.** The eight-role taxonomy and eleven audit
invariants are the architectural answer. The empirical answer is
the *AI-emission red-team report* (Risk 3). Until that report
exists, the response is honest about the gap and names the planned
artifact. After it exists, the response cites it.

Defensible wording: *"Sophie's schema treats AI as a grammar-bound
emitter. The empirical question is which structural failure modes
the grammar prevents. We characterize this in our forthcoming
red-team report (see also Paper #1, §3); preliminary results show
[concrete examples]."*

### Critique 2: "Single-PI risk — will this survive beyond Anna?"

**The response.** Risk 4's governance path. Cite the chosen route
(CZI EOSS / foundation / consortium / co-PI) explicitly. Naming a
path beats hand-waving every time.

### Critique 3: "You've reinvented IMS Learning Design with React"

**The response.** Four-point counter from
[academic prior art § 2](academic-prior-art.md):

1. MDX+Zod is LLM-emittable in a way XML was not.
2. The grammar is tighter and smaller (eight roles, not a universal
   activity ontology).
3. The audit makes the schema visible.
4. Production cost is paid in CI, not author labor.

### Critique 4: "Accessibility-as-differentiator is already PreTeXt's claim"

**The response.** True. Sophie's specific advance is *per-commit*
versus *per-publish* enforcement — see the accessibility-first
publishing comparison in [comparators](comparators.md).
PreTeXt validates a11y at publish via RELAX-NG schema validity;
Sophie validates at commit via axe-core CI gate, Radix UI
primitives, and Zod-typed alt-text contracts. Both are foundational
approaches; the enforcement layer differs. Frame Sophie as additive
to PreTeXt's accessibility-first publishing tradition, not as
replacement.

### Critique 5: "Misconception graph and teaching-moves library — who curates?"

**The response.** As of 2026-05-22, Anna curates. ADR 0041 commits
to 18 named teaching moves across 7 families; ADR 0044 commits to
12 canonical interventions across 4 families. PROSE has an NSF-
funded community of math educators answering the analogous
question. Sophie's curation-authority story must be specified
before CAREER submission. Plausible answers:

- **Bound to literature**: each move and intervention cites
  primary DBER literature; the curation authority is the field, not
  Anna. (Strongest answer; currently underdocumented.)
- **Community process**: future-work commitment to opening the
  curation to instructor contributors with peer review. (Roadmap
  item.)
- **Audit-as-validation**: usage data from pilot courses validates
  which moves and interventions show effect. (SoTL paper substrate.)

The cleanest move is to **strengthen the literature-binding** in
the existing reference docs so the curation authority is the field
itself, not the maintainer.

## Scope-discipline watchpoints

The technical scope is well-disciplined. The pedagogical and
strategic scope is where vigilance pays off.

### Watchpoint A: Pedagogical surface area

**Current commitment count (as of 2026-05-22):**

- 8 epistemic roles ([ADR 0058](../../decisions/0058-epistemic-component-contract.md))
- 18 teaching moves across 7 families ([ADR 0041](../../decisions/0041-teaching-move-library.md))
- 12 canonical interventions across 4 families ([ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md))
- 11 audit invariants (Tier 1 / Tier 2 / Tier 3)
- 5 conformance failure modes ([ADR 0053](../../decisions/0053-conformance-failure-modes.md))
- Misconception graph schema, equation biography schema, pedagogical-
  diff taxonomy, course-schedule schema, AI-contribution schema

Each is defensible individually. Together, the cognitive load of
being an *author* in this system is substantial. **When the first
non-Anna instructor tries to write a chapter, can they?**

**Discipline rule:** Before adding any new named pattern, taxonomy,
or schema commitment, ask:

1. Is it bound to existing primary literature?
2. Does it have a working example in a smoke chapter?
3. Will an author who has never read its ADR be able to use it
   correctly?

If any answer is no, the addition is premature.

### Watchpoint B: Course-website roadmap velocity vs. empirical evidence

**The tension.** The 27-decision course-website roadmap (ADRs
0065–0078, locked May 2026) is approximately 12 months of focused
work — LTI 1.3, FSRS, library rooms, Pyodide labs, learning cockpit,
AI packets, reasoning traces. Each ADR is good. The aggregate is
ambitious next to the **Cottrell 2026-07-01** and **CAREER
2026-07-22** deadlines.

**The discipline question:** Does the next six months prioritize
*empirical proof of the thesis* (AI-emission red-team report; ASTR
201 + COMP 521 pilots that ship cleanly; SoTL signal collected) or
*more feature surface* (the course-website 27-decision roadmap)?

**Current roadmap weight:** Feature-surface heavy.

**Tenure / Cottrell / CAREER reward weight:** Evidence heavy.

**Recommended rebalance:** The course-website roadmap is the right
long-term plan. The next six months should foreground *empirical
proof* — red-team report, pilot stability, SoTL pre-registration.
Course-website work resumes after the grants land or after the
evidence artifacts exist.

**Trigger to revisit:** Every six weeks, audit the roadmap for
ratio of empirical-evidence work to feature-surface work. If the
ratio is below 1:1 going into a grant cycle, rebalance.

### Watchpoint C: Documentation drift

Sophie has caught two doc-drift incidents (EqRef rename, validation
regen). The fact that the audits caught them does not mean the next
one will be caught. The documentation drift state as of 2026-05-22
is 98% sync — strong, not perfect.

**Discipline rule:** Per Anna's saved feedback
(`feedback_docs_no_drift.md`), any code rename or reshape that
touches docs lands the doc update in the *same change*, not a
follow-up. The discipline rule applies double to *this section* of
the docs: when comparators rename their products, when ADRs
supersede each other, when a cited paper revises, this section gets
the update in the same change as the underlying event.

### Watchpoint D: AI-authoring-workflow burden in the wild

The schema-as-grammar bet is strongest when AI authoring is
*fluent*. If the AI-authoring workflow requires 30 prompts and 20
manual schema corrections per chapter, the cost-curve reverses and
Sophie inherits IMS Learning Design's failure mode.

**Discipline rule:** Track an *AI-authoring effort metric* —
prompts-per-chapter, schema-correction-edits-per-chapter, time-to-
draft. Establish a baseline with the first AI-first chapter. Set a
threshold below which AI authoring is "fluent" and the schema's
overhead is paid. If the effort exceeds threshold consistently, the
schema needs simplification, not the workflow needs more guidance.

**Trigger to escalate:** Three AI-authoring sessions producing
effort > 2× baseline = schema simplification candidate.

### Watchpoint E: Adoption barrier vs. moat trade-off

The schema *is* the moat. The schema *is* the adoption barrier. An
instructor who has not bought into the eight-role taxonomy sees the
schema as overhead, not as feature. The Cottrell + CAREER pitch
should *explicitly name* how AI authoring collapses that cognitive
load back down — because right now, on paper, Sophie asks
instructors to learn more about pedagogy taxonomy than most have
encountered.

**Possible mitigations to evaluate:**

- **"Sophie Lite" entry point.** A reduced subset that gives an
  instructor most of the value (component contract + accessibility
  gate + AI authoring) without requiring full taxonomy adoption.
  Risk: dilutes the distinctive bundle.
- **AI as on-ramp.** Frame the AI authoring agent as the *taxonomy
  expert*, so the instructor never has to learn the taxonomy
  directly — the AI emits taxonomy-correct structure on the
  instructor's behalf. This is the current model. It requires the
  AI authoring story to actually work (Risk 3).
- **Worked-example chapters.** Public "Sophie Astro M2-L3" type
  chapters demonstrate the value before the instructor commits.
  This is the existing strategy.

**Recommended path:** AI-as-on-ramp + worked examples. Avoid Sophie
Lite for as long as possible; the distinctive bundle is the value.

## How to use this page

Read this page before every roadmap revision, every grant
submission, every public-facing pitch.

When a new risk surfaces — in a reviewer comment, a Slack
conversation, a paper finding — add it here with its trigger and
mitigation. Risks that live as background anxiety are uncatalogued
debts. Risks that live on this page are tracked debts with
mitigation plans.

When a risk closes (mitigation implemented, empirical evidence
collected, governance path locked), mark it closed *here* — not
just in the implementation work. The closure is the evidence.

(scope-discipline-checklist)=

## Scope-discipline checklist (use at every roadmap revision)

Before locking the next ADR cluster or sprint plan, check:

- [ ] Does this work directly produce evidence for one of the
  load-bearing claims (schema constrains AI usefully / better
  student outcomes / accessibility at commit time)?
- [ ] Is the cited prior art on [academic prior art](academic-prior-art.md)
  current for the work in question?
- [ ] If this adds a named pattern / taxonomy / schema, is it
  bound to existing primary literature *and* exemplified in a
  smoke chapter?
- [ ] Does the work intersect a comparator on
  [comparators](comparators.md)? If yes, is Sophie's distinctive
  claim still defensible after the addition?
- [ ] Does this work plausibly bear fruit before the next grant
  deadline?
- [ ] If empirical-evidence work and feature-surface work are
  competing, does the rebalance favor evidence?
- [ ] Has this page itself been reviewed since the last roadmap
  revision?

If any box is unchecked, the roadmap is not yet locked.
