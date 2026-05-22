---
title: Academic prior art
short_title: Academic prior art
description: The theoretical and empirical literature Sophie inherits and updates — Open Cognitive Graph, IMS Learning Design, pedagogical pattern languages, epistemic-framing in DBER, knowledge graphs in education, and AI-authoring-with-structural-constraints precedents. Cite-or-be-cited reading.
tags: [strategy, landscape, prior-art, dber, epistemic-framing, knowledge-graphs]
---

# Academic prior art

This page enumerates the academic literature that defines Sophie's
intellectual neighborhood. Some of it is precedent Sophie inherits.
Some of it is the theoretical articulation of what Sophie implements.
Some of it is adjacent work that reviewers will know — and that
Sophie's positioning must engage rather than ignore.

A proposal that fails to cite this literature reads as either
underprepared or arrogant. A proposal that engages it carefully reads
as a production realization of an emerging research program. The
difference is consequential at the CAREER, Cottrell, and ApJ-Ed
review levels.

Last full review: **2026-05-22**.

## 1. The piece you must read first — Open Cognitive Graph

> Open Cognitive Graph proposes "externalising pedagogical structure
> in forms aligned with human educational reasoning" by "explicitly
> representing concepts, prerequisite relations, misconceptions, and
> scaffolding" so that "the cognitive logic governing AI behaviour is
> inspectable and revisable."

**Citation:** Open Cognitive Graph (arXiv 2602.16949). *Retrieved
2026-05-22.* PDF: <https://arxiv.org/pdf/2602.16949>.

**Why this is non-negotiable reading.** OCG is the *theoretical
articulation* of Sophie's load-bearing thesis. It introduces a
"trunk-branch governance model" for distributed expertise. It is
conceptual — no implementation — and that is the opportunity. Sophie
is in a position to claim: **"first production implementation of
OCG-style infrastructure."** Without that framing, Sophie is
vulnerable to "this is just OCG with code" as a one-line reviewer
rejection note. With that framing, OCG becomes a credential Sophie
holds.

**Action items:**
- Read OCG in full before drafting CAREER narrative.
- Cite OCG in the Paper #1 introduction (methods/infrastructure
  paper, Q4 2026 target).
- Use OCG's terminology where it clarifies — "cognitive logic" is
  the field's phrase for what Sophie calls "epistemic role contract."

**Sophie's specific extensions beyond OCG:**

| OCG (theory) | Sophie (production) |
| --- | --- |
| "Externalised pedagogical structure" | Zod-typed schema across 33 components, audited per-PR |
| "Explicitly representing misconceptions" | Misconception graph schema (ADR 0044) + intervention library (12 canonical interventions across 4 families) |
| "Scaffolding represented" | Teaching Move Library (18 named moves across 7 families; ADR 0041) |
| "Cognitive logic inspectable and revisable" | Pedagogy Index audit + pedagogical-diff CLI (ADR 0045) |
| "Trunk-branch governance for distributed expertise" | AI as four roles (author / pedagogy / domain / brainstorming) with instructor as supervisor; ADR 0030 |
| Theoretical proposal | AGPL-licensed production codebase with 78 ADRs, 177+ tests, axe-core CI gate, visual-regression baselines, working ASTR 201 pilot |

This is the strongest single positioning move available to Sophie.
Make it.

## 2. The intellectual lineage Sophie inherits — pedagogical pattern languages

Pre-LLM-era attempts at formal pedagogical schemas. They largely
failed at production scale. Understanding *why* they failed is how
Sophie defends against the "you've reinvented IMS LD with React"
critique.

### IMS Learning Design (2003)

- **What it was:** An XML-based specification language for
  representing learning units — activities, roles, environments,
  conditions. Standardized through IMS Global (now 1EdTech).
- **Why it failed at scale:**
  - XML was hostile to authors.
  - No AI existed to emit into the schema. The overhead bought
    nothing the author could see.
  - Tooling never matured beyond reference implementations.
- **What Sophie inherits:** the *intuition* that pedagogical structure
  is formalisable. The data model is dead; the underlying claim is
  not.

### Pedagogical Pattern Languages / E²ML

- **Citation:** "Formal Model of a Pedagogical Pattern Language,"
  IJSTR 2019.
  PDF: <https://www.ijstr.org/final-print/sep2019/Formal-Model-Of-1040-Pedagogical-Pattern-Language.pdf>
  *(retrieved 2026-05-22)*.
- **What it tried:** Formalize design patterns from instructional
  design literature into a queryable language. Christopher Alexander's
  pattern-language methodology applied to teaching.
- **Why it stalled:** No clear emission target. Patterns were
  describable but not directly executable as content.
- **What Sophie inherits:** The teaching-moves library (ADR 0041)
  borrows the *named, citable pattern* shape from this tradition,
  bound to actual component contracts so the pattern produces content.

### Sophie's response to "you've reinvented IMS LD with React"

This critique is partly fair and Sophie's response must be precise:

1. **MDX+Zod is LLM-emittable in a way XML was not.** Sophie's schema
   overhead is now paid by an AI that benefits from typed constraints,
   not by a human author bearing the cost alone. The cost-curve
   reverses.

2. **The grammar is tighter and smaller.** IMS LD attempted to
   describe all possible learning activities. Sophie's eight-role
   epistemic contract describes one specific thing — *the structure
   of scientific reasoning* — and binds it to a closed set of components.

3. **The audit makes the schema visible.** IMS LD documents were
   black boxes once authored. Sophie's pedagogy index + audit
   invariants make every chapter's structure queryable.

4. **Production cost is paid in continuous integration, not author
   labor.** A `<Figure>` without `alt` fails at commit time; the
   author never has to *remember* to add it.

This response belongs in the CAREER narrative and in Paper #1.

## 3. Epistemic-framing research in DBER

Sophie's eight-role taxonomy claims scientific legitimacy. That claim
rests on a tradition in Discipline-Based Education Research, most
explicit in physics education research.

### Foundational references

- **Hammer, D. (1996).** "More than misconceptions: Multiple
  perspectives on student knowledge and reasoning." *American Journal
  of Physics* 64(10), 1316–1325. *— The "resources" framework that
  underpins much of modern PER on student reasoning.*
- **Hammer, D., Elby, A., Scherr, R. E., & Redish, E. F. (2005).**
  "Resources, framing, and transfer." In J. Mestre (Ed.), *Transfer
  of Learning from a Modern Multidisciplinary Perspective*, 89–119.
- **Redish, E. F. (1994, 2004 expanded).** *Teaching Physics with the
  Physics Suite*. The "epistemic frame" construct in physics
  education.

These are the canonical citations. Sophie's eight-role taxonomy —
**observable / model / inference / assumption / approximation /
uncertainty / numerical / misconception** — should be grounded in
this lineage in any DBER-facing writeup. The taxonomy is not
arbitrary; it is a discipline-specific compression of the
epistemic-frame tradition for STEM textbook authoring.

### Contemporary work

- **"How Physics Professors Use and Frame Generative AI Tools"**
  (arXiv 2511.11317). PDF:
  <https://arxiv.org/pdf/2511.11317> *(retrieved 2026-05-22)*.
  Direct empirical study of how STEM faculty engage with GenAI;
  useful framing for Sophie's "structured HITL" thesis.

**Action item:** When writing the Paper #1 methods section, cite at
least Hammer (1996) and one Redish work to ground the eight-role
contract in the DBER lineage. Failing to do so leaves the taxonomy
exposed to "where did these eight come from?" pushback.

## 4. Knowledge graphs in education

Knowledge graph approaches are an active research thread. Most
applications target *course recommendation* and *prerequisite
mapping*; only a small subset address *misconception representation*
or *AI-authoring guardrails* — Sophie's specific application.

- **"Knowledge Graph Construction in Education" (systematic review).**
  PMC10847940: <https://pmc.ncbi.nlm.nih.gov/articles/PMC10847940/>
  *(retrieved 2026-05-22)*. State-of-the-field as of 2024.
- ACM Survey on educational knowledge graphs:
  <https://dl.acm.org/doi/10.1145/3772326.3772335> *(retrieved 2026-05-22)*.

**Sophie's specific contribution to this space:** Sophie's
misconception graph (ADR 0044) is a knowledge graph whose **nodes are
misconceptions** rather than concepts, whose **edges are
prerequisite / related-to relations**, and whose **leaves are
canonical interventions** the platform implements. This combination
— misconception-as-node + intervention-as-leaf + author-time AI
binding — does not appear in the surveyed knowledge-graph-in-education
literature.

**Action item:** Cite the systematic review in any paper that touches
the misconception graph. Frame Sophie's misconception graph as "novel
contribution within knowledge-graph-in-education literature: the node
ontology is misconception-first, not concept-first."

## 5. AI-authoring-with-structural-constraints precedents

The narrow research thread closest to Sophie's central technical
claim. Most AI-for-education work focuses on tutoring or open-response
assessment; Sophie's bet is authoring-time emission constrained by
typed schema.

### Direct precedent — none yet at production scale

The landscape scan found **no surveyed implementation** that treats
AI emission as schema-constrained for educational content. The
closest theoretical proposal is OCG (above); the closest production
work uses RAG retrieval scaffolds rather than typed output contracts.

This is the leapfrog claim Sophie can defensibly make. Said
precisely: **"Sophie is the first production system where the
schema contract is both (a) the AI-emission boundary and (b) the
audit surface for pedagogical structure and accessibility."**

### Adjacent work worth citing

- **TEACH-AI Framework** (arXiv 2512.04107). PDF:
  <https://arxiv.org/pdf/2512.04107> *(retrieved 2026-05-22)*. A
  meta-framework for evaluating AI-driven learning systems. Sophie's
  eleven audit invariants and eight-role taxonomy could *implement*
  TEACH-AI's evaluation criteria. Cite as evaluation-rubric
  precedent, not implementation precedent.
- **Learning Visibility Framework** (arXiv 2603.07834). PDF:
  <https://arxiv.org/pdf/2603.07834> *(retrieved 2026-05-22)*. Calls
  for "clear specification and modeling of acceptable AI use" with
  "transparent timelines of student activity." Sophie's AI
  Contribution Ledger (ADR 0042) is one realization of this
  framework's call. Cite when discussing AI provenance disclosure.
- **AI-University** (arXiv 2504.08846):
  <https://arxiv.org/abs/2504.08846> *(retrieved 2026-05-22)*.
  RAG-aligned instructor content generation. Closest production
  precedent to Sophie's authoring stance, but the contract is at the
  *retrieval set*, not the *output type*. Cite as the precedent
  Sophie advances beyond.

## 6. Empirical-validation precedents

Sophie's two-paper SoTL plan (ADR 0047) needs to ground its method
in existing validated approaches.

- **Concept Inventories** — Force Concept Inventory (Hestenes et al.
  1992); Astronomy Diagnostic Test; Lecture-Tutorials in Astronomy
  (Prather et al.). Sophie's misconception graph borrows the
  *named-misconception* structure from this tradition.
- **Predict-Observe-Explain** (White & Gunstone, 1992). *Probing
  Understanding*. Falmer Press. — The pedagogical pattern Sophie's
  `<Predict>` component implements. Cite when discussing
  comprehension-check rationale.
- **Bayesian Knowledge Tracing** (Corbett & Anderson, 1995) — the
  classical model Sophie's BKT state schema is built on.
- **Spaced Repetition / FSRS** (Wozniak; recent FSRS work by
  Murakovsky et al.) — the algorithm family the planned spaced-
  review (ADR 0069) is built on.
- **Comparison cases** — Bransford & Schwartz (1999). "Rethinking
  transfer." *Review of Research in Education*, 24, 61–100. — The
  underpinning of Sophie's MultiRep component (ADR 0043).

These citations live in the intervention library; this page
duplicates them for SoTL-paper convenience.

## 7. Adjacent fields whose practitioners will review Sophie

A non-exhaustive list of communities whose conferences and journals
will likely review Sophie's work, and whose foundational citations
should be in any Sophie paper:

- **PER (Physics Education Research)** — AJP, PRPER, AAPT meetings.
- **CER (Chemistry Education Research)** — JChemEd, BCCE.
- **AER (Astronomy Education Research)** — JAESE, AAS-EPD.
- **DBER (broader)** — National Academies DBER report (Singer,
  Nielsen & Schweingruber 2012) is the foundational synthesis.
- **CS education** — SIGCSE, ICER, ITiCSE.
- **Learning Analytics / Learning Engineering** — LAK conference;
  *Journal of Learning Analytics*.
- **Educational Technology** — *Computers & Education*; *British
  Journal of Educational Technology*; *Educational Technology
  Research and Development*.
- **HCI for Education** — CHI, IUI; *International Journal of
  Human-Computer Studies*.

Sophie's Paper #1 target (JOSS + Computers & Education) is well-
chosen. JOSS reviews the software; *Computers & Education* reviews
the pedagogical claim. Both audiences require different framings.

## 8. Specific reading list — priority-ordered

If time is limited, read in this order:

1. **Open Cognitive Graph** (arXiv 2602.16949) — *must read before
   CAREER drafting*. <https://arxiv.org/pdf/2602.16949>
2. **PreTeXt accessibility guide** — *required for any a11y
   comparison paragraph*. <https://pretextbook.org/doc/guide/html/topic-accessibility.html>
3. **Hammer (1996)** "More than misconceptions" — *foundational for
   eight-role taxonomy grounding*.
4. **TEACH-AI Framework** (arXiv 2512.04107) — *cite as
   evaluation-rubric precedent*. <https://arxiv.org/pdf/2512.04107>
5. **Learning Visibility Framework** (arXiv 2603.07834) — *cite when
   discussing AI provenance*. <https://arxiv.org/pdf/2603.07834>
6. **Knowledge Graph Construction in Education** (PMC10847940) —
   *systematic review; cite for misconception graph contribution*.
   <https://pmc.ncbi.nlm.nih.gov/articles/PMC10847940/>
7. **"How Physics Professors Use Generative AI"** (arXiv 2511.11317)
   — *cite for HITL framing*. <https://arxiv.org/pdf/2511.11317>
8. **Pedagogical Pattern Language formal model** (IJSTR 2019) —
   *defend against "you've reinvented IMS LD" critique*.
   <https://www.ijstr.org/final-print/sep2019/Formal-Model-Of-1040-Pedagogical-Pattern-Language.pdf>

## How to use this page

When drafting any paper, proposal, or job-talk slide that touches
Sophie's positioning relative to academic prior art, pull the
relevant citations from this page rather than reconstructing them.
When a reviewer surfaces unfamiliar work, *add it here first* and
incorporate it into the next revision.

The single highest-leverage move on this page is reading Open
Cognitive Graph and integrating the framing into the CAREER
narrative. Do that this week.
