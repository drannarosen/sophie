---
title: AI-emission red-team report — plan
short_title: Red-team report plan
description: A focused 1–2 week wedge that produces empirical evidence for Sophie's load-bearing claim — that schema constrains AI-authored content usefully versus retrieval-augmented free-text. The artifact this plan produces is the strongest single evidence Sophie can carry into Cottrell, CAREER, and Paper #1.
tags: [strategy, evidence, ai-authoring, red-team, paper-1]
---

# AI-emission red-team report — plan

This plan describes a bounded wedge of work that produces a single
artifact: a *Sophie AI-emission red-team report* comparing AI
authoring under three conditions on the same target chapter. The
artifact is the strongest answer Sophie can give to the reviewer
critique *"prove the schema actually constrains AI usefully"* — and
the substrate for Paper #1.

Plan owner: Anna. Scoped as a one-to-two-week focused wedge, not a
multi-month project. Last revision: **2026-05-22**.

## Why this exists

Sophie's load-bearing claim is that the schema contract treats AI as
a grammar-bound emitter — that the eight-role epistemic taxonomy
catches structural pedagogical failures retrieval-augmented free-text
generation does not. As of 2026-05-22, that claim is **architectural
only**. No chapter has been authored AI-first end-to-end in Sophie.
A reviewer asking *"what AI failure modes does Sophie's schema
prevent?"* will not find an answer in the codebase.

The red-team report is the empirical answer. One chapter, drafted
three ways, audited against the same criteria, with the diff
reported honestly.

## What the report produces

A single published artifact under `docs/website/pilots/` (alongside
[`m2-l3-spectra-composition.md`](../../pilots/m2-l3-spectra-composition.md))
documenting:

1. **The target chapter** — content, learning objectives, target
   audience.
2. **The three drafting conditions** — schema-constrained,
   RAG-only, free-form.
3. **The drafts themselves** (or representative excerpts), with
   the AI session transcripts linked.
4. **The audit results** — each draft scored against the same
   eleven pedagogy-index audit invariants and axe-core accessibility
   rules.
5. **The structural-failure diff** — which failure modes did the
   schema catch? Which did it miss? Which did it create?
6. **Effort cost** — prompts-per-chapter, schema-correction edits
   per chapter, time-to-draft. (See
   [risks § watchpoint D](risks-and-discipline.md).)
7. **Honest conclusions** — including failure modes Sophie did
   not catch and the cases where schema overhead was not paid
   back.

This is *not* a paper. It is a public, citable, dated artifact that
Paper #1 can reference. Total report length: 8–12 pages including
representative excerpts.

## Method — bounded and specific

### Step 1. Pick the target chapter (~half day)

A chapter that does not yet exist, ideally:

- Within Anna's existing teaching needs (a real ASTR 201 or
  COMP 521 lecture, not a fabricated example).
- Pedagogically interesting enough that AI failure modes matter
  — typically a chapter with multiple equations, plots, and at
  least one canonical misconception.
- Not the M2-L3 spectra-and-composition pilot (already
  hand-authored; the comparison would be biased).

Candidate: an ASTR 201 chapter that has not yet been written and is
scheduled for Fall 2026. The Hertzsprung–Russell diagram lecture is
a strong candidate — multiple roles (Observable, Model, Inference),
canonical misconceptions, equations, plots.

### Step 2. Draft condition A — schema-constrained (~2 days)

AI authoring through Sophie's MDX+Zod contract:

- The AI is given the chapter spec, learning objectives, target
  audience, and *the full Sophie schema* including the eight-role
  taxonomy, misconception graph entries for any misconceptions
  in scope, the equation registry, the notation registry, and
  the component contract.
- The AI emits MDX directly using Sophie components.
- The Sophie build pipeline runs as a gate — failed schema
  validation fails the draft; the AI must repair.
- Audit invariants run as feedback to the AI between iterations.

Log every prompt, every schema-violation message, every author
intervention. The transcript is part of the artifact.

### Step 3. Draft condition B — RAG-only (~1 day)

AI authoring with the same source material pool but no Sophie
schema:

- The AI is given the chapter spec and the same source material
  pool (textbook references, papers, primary literature).
- The AI emits free-text Markdown.
- No schema validation. No audit. No component contract.
- Author may guide stylistically but does not enforce schema.

This is the realistic comparison. RAG-only is what most
AI-for-education tools deliver.

### Step 4. Draft condition C — free-form (~half day)

AI authoring with no retrieval and no schema:

- Chapter spec only.
- No source material pool.
- Free-text Markdown emission.
- Author may guide but does not constrain.

This is the worst-case baseline. Most authoring-with-AI workflows
fall between B and C.

### Step 5. Apply the same audit to all three drafts (~1 day)

For each draft, run:

- **Sophie's eleven pedagogy-index audit invariants** (Tier 1
  / Tier 2 / Tier 3) — manually if the draft is not in Sophie
  schema, automatically if it is.
- **Accessibility audit** — axe-core for the Sophie-rendered
  condition A; manual WCAG 2.1 AA inspection for conditions B
  and C.
- **Factual correctness check** — Anna validates physics,
  citations, equations.
- **Pedagogical-failure-mode taxonomy** — borrow from
  [academic prior art § 6 empirical-validation precedents](academic-prior-art.md);
  named failure modes (color-only meaning; missing alt text;
  unstated assumptions; incorrect units; misconception masked
  rather than confronted; etc.).

### Step 6. Write the report (~2 days)

Honest, quantitative, citing the artifacts. Structure:

1. **Why this report exists** — same framing as this plan, one
   page.
2. **The target chapter** — one page.
3. **Three drafting conditions** — methods, two pages.
4. **Audit results table** — counts per failure mode per
   condition, one page.
5. **Diffs that mattered** — qualitative analysis of failure
   modes the schema caught (and missed), two-to-four pages with
   representative excerpts.
6. **Effort cost** — quantitative, one page.
7. **Honest limitations** — what this report is not, one page.
8. **References and artifacts** — links to drafts, transcripts,
   audit outputs.

## Hypothesis to test (honest)

**The schema catches certain failure-mode classes; it does not
catch others; the overhead is paid back when authoring is
high-stakes (e.g., chapters with canonical misconceptions or
quantitative claims) and not paid back for low-stakes prose.**

That hypothesis is *less ambitious* than "schema universally
improves AI authoring." It is also more defensible and more useful
to a future adopter.

## What this report does NOT do

- **Not a controlled experiment with student outcomes.** That is
  Paper #2 substrate, deferred to the [B9 Learning Telemetry
  backlog item](../../status/roadmap.md). The red-team report
  measures *AI emission quality* against schema-encoded criteria,
  not student learning.
- **Not multiple chapters.** One chapter, three conditions, with
  honest limitations about generalization.
- **Not statistical inference.** N = 1 chapter in three
  conditions. Qualitative + counts, not p-values.
- **Not a Sophie-promotional artifact.** Honest about failure
  modes Sophie does not catch.

## Cost-benefit honest accounting

**Cost.** Approximately 1.5–2 focused work weeks at 25–35 hours per
week summer cadence. The biggest cost is condition B (RAG-only) —
without Sophie's component-by-component reference, the AI has more
freedom and the author has more correction work.

**Benefit, in priority order:**

1. **Strongest single evidence for Cottrell / CAREER / Paper #1.**
   Closes the "prove it" critique with a citable artifact.
2. **Surfaces the real failure modes the schema misses.** Tells
   you where the platform's next investment should go.
3. **Establishes baseline metrics for the
   [AI-authoring effort metric watchpoint](risks-and-discipline.md).**
4. **Produces a real ASTR 201 chapter** ready for Fall 2026
   deployment — work that needed to happen anyway.
5. **Defangs the "this is just IMS LD with React" critique** by
   showing the specific structural failures Sophie catches that
   schemaless AI authoring does not.

The work is not pure overhead. It produces a chapter Anna needed
to write anyway, plus the artifact.

## When to do this

**Recommended timing:** Before the Cottrell submission
(2026-07-01) ideally, before CAREER (2026-07-22) at the latest.
The artifact does not need to be polished for the proposals; a
draft with preliminary results plus the published-by date is
sufficient to cite as "Sophie AI-emission red-team report (in
preparation, drannarosen/sophie pilots/, completion 2026-07)."

The artifact itself takes ~2 weeks of focused work. Reserving the
summer 2026 work-week beginning 2026-06-09 (or similar) is the
likely cadence.

**If timing slips:** The Cottrell / CAREER proposals can still
cite this work as planned-and-scoped, with a 2026-08 completion
target. That is weaker than "in preparation" but stronger than
silence.

## Trigger to revisit this plan

- If three months pass without the red-team report being either
  produced or scheduled, scope discipline has slipped toward
  feature surface over evidence. See
  [risks § watchpoint B](risks-and-discipline.md).
- If the chosen target chapter changes substantially, revisit
  Step 1.
- If a real AI-authoring workflow improvement lands in the
  platform during the red-team work, fold it into condition A.
- If condition A fails to converge (the AI cannot produce a
  schema-valid draft even with iteration), that is itself the
  finding — write the report around it.

## See also

- [Academic prior art § 5 — AI-authoring-with-structural-constraints
  precedents](academic-prior-art.md)
- [Risks and discipline § 3 — AI-authoring story is design-only](risks-and-discipline.md)
- [Paper #1 — methods](../papers/paper-1-methods.md)
- [M2-L3 spectra-and-composition pilot](../../pilots/m2-l3-spectra-composition.md)
  — the existing hand-authored pilot the red-team contrasts with
