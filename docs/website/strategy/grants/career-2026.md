---
title: NSF CAREER — 2026
short_title: CAREER 2026
description: NSF CAREER proposal plan (deadline July 22, 2026) — solicitation summary, project description structure, education plan strategy, departmental letter, MPS/AST framing.
tags: [strategy, grants, nsf, career, 2026]
---

# NSF CAREER — 2026

The NSF Faculty Early Career Development Program (CAREER) is NSF's
flagship pre-tenure award and is widely regarded as the single most
important grant a pre-tenure faculty member can win. The 2026 deadline
is **July 22, 2026** (the fourth Wednesday of July, 5 PM submitter's
local time). Solicitation: **[NSF 22-586](https://www.nsf.gov/funding/opportunities/career-faculty-early-career-development-program/nsf22-586/solicitation)**.

Anna committed 2026-05-13 to applying this cycle.

## Program quick facts

- **Funder**: National Science Foundation
- **Solicitation**: NSF 22-586 (current as of May 2026; valid for
  submission years 2022–2026)
- **Eligibility**:
  - Untenured assistant professor (≥50% tenure-track or
    tenure-track-equivalent appointment).
  - No prior CAREER award received.
  - No more than three CAREER competition submissions over career
    (withdrawn proposals don't count).
  - Doctoral degree in NSF-supported field.
- **Award (MPS, including AST)**: minimum **$400,000 over 5 years**.
  (Higher minimums apply to BIO / ENG / OPP — not applicable.)
- **Deadline**: **July 22, 2026** at 5 PM submitter's local time.
- **Decision timeline**: Decisions typically Q1–Q2 of the year
  following submission.
- **Project description page limit**: **15 pages**.

## Directorate framing: MPS/AST, not EDU/DUE

CAREER proposals are routed to a directorate. Sophie sits at the
intersection of astronomy (MPS/AST) and education research (EDU/DUE).
The recommendation is to submit through **MPS/AST**, with Sophie as
the *integrated education plan* alongside an astronomy-flavored
research thread, rather than through EDU/DUE with Sophie as the
research subject directly.

### Why MPS/AST over EDU/DUE

- **Sophie's research questions read better as astronomy-pedagogy in
  an astronomy directorate.** AST reviewers can evaluate the
  astronomy-specific learning outcomes and the AI-authoring research
  on their merits.
- **The Cottrell Scholar Award is astronomy/physics/chemistry-only.**
  Aligning the CAREER directorate with Cottrell directorate-equivalent
  reinforces Anna's research-program identity as an astronomer who
  studies astronomy education.
- **EDU/DUE proposals require deeper DBER methodology** — formal
  experimental design, validated instruments, IRB protocols. Anna is
  building toward this but is not yet at the depth EDU/DUE reviewers
  expect.
- **AST has occasionally funded education-software CAREERs** with
  strong integration narratives — there's precedent.

### When EDU/DUE might be better

Reconsider EDU/DUE if (a) DBER co-authors are already in place by
mid-June 2026, (b) formal experimental design is ready, and (c) the
chair conversation reveals DBER is *strongly* preferred for the
tenure case. Otherwise, MPS/AST is the better venue.

## Required components

Beyond the 15-page Project Description:

| Component | Length | Notes |
|-----------|--------|-------|
| **Project Description** | 15 pp max | Includes integrated research + education plan |
| **Departmental Letter** | 2 pp max | Signed by chair; demonstrates departmental support for research/education integration |
| **Biographical Sketch** | NSF standard | Include research *and* education accomplishments |
| **Budget Justification** | 5 pp max | Standard NSF format |
| **References Cited** | no page limit | Standard |
| **Letters of Collaboration** | as needed | NSF single-sentence format only |
| **Data Management Plan** | 2 pp max | Standard NSF requirement |

The solicitation does *not* require a separate mentoring plan or
software development plan, but a software-component DMP needs to
**state and justify the software license(s)** used. Specify
AGPL-3.0-or-later and cite [AGPL rationale](../agpl-rationale.md).

## Project Description structure (recommended)

CAREER does not mandate a section structure within the 15-page Project
Description, but the conventional shape is:

| Section | Pages | What goes there |
|---------|-------|-----------------|
| **Introduction / overview** | 1–1.5 | Why this work matters, the integrated research-education vision, the "why now" |
| **Background / state of the art** | 2 | Literature review on AI-authoring + DBER + interactive OER |
| **Research plan** | 5 | The astronomy/AI-authoring research deliverables and methods |
| **Education plan (integrated)** | 3 | Sophie deployment in ASTR 101/201, COMP 521; learning-outcomes measurement; broader impacts on HSI population |
| **Integration narrative** | 1–1.5 | How research and education feed each other; the iterative cycle |
| **Broader impacts** | 1 | HSI + CSU mission; open-source dissemination; AAS-EPD engagement |
| **Project management / timeline / sustainability** | 1 | 5-year plan, milestones, deliverables, succession |
| **Results from prior NSF support** | 0 (Anna has none) | Skip or note "no prior NSF support" |

The integration narrative is the proposal's load-bearing section.
Reviewers ask: *is this two separate plans glued together, or is it a
single program where research and education co-evolve?* The Sophie
narrative makes the latter obvious — the platform is the integration.

## Education plan strategy

NSF expects the education plan to be *substantive*, not boilerplate.
The solicitation language: "an integrated research and education plan"
where the activities "feed each other" — research generating insights
that transform how students learn, education producing observations
that strengthen the research.

For Sophie, the education plan elements:

### 1. Curricular integration

Sophie deployed in ASTR 101 (gen-ed), ASTR 201 (intro astro for
science majors), and COMP 521 (scientific computing). Each course
becomes a Sophie-authored, Sophie-rendered, Sophie-measured artifact.
Specific deliverables:

- ASTR 201 textbook fully migrated from Quarto to Sophie (fall 2026).
- COMP 521 textbook greenfield in Sophie (fall 2026).
- ASTR 101 chapters added over years 2–3.

### 2. Learning-outcomes measurement

Disaggregated cohort comparisons across:

- Pre/post conceptual inventory scores (use existing astronomy
  conceptual inventories — Astronomy Diagnostic Test, Light and
  Spectroscopy Concept Inventory).
- Pre/post confidence-calibration measures (from Sophie's confidence
  components).
- Demographic disaggregation: HSI / first-gen / women in STEM /
  transfer students. SDSU's HSI status makes this a structural
  Broader Impacts win.

### 3. Open-source dissemination

Sophie + course content released openly. The platform becomes
infrastructure other instructors adopt. Concrete dissemination
activities:

- Workshops at AAS-EPD, AAPT, AAS summer meetings.
- A Sophie tutorial/onboarding pathway for adopting instructors.
- Conference presentations on AI-authoring + structural HITL.

### 4. Sustainability + governance

Sophie's [40+ ADRs](../../decisions/template.md), AGPL license,
contributor process, and roadmap demonstrate that the platform is
designed for sustained community use beyond the funded period. Cite
this explicitly — it differentiates Sophie from grant-funded prototype
software that dies post-funding.

## Departmental Letter — request strategy

The Departmental Letter (2 pp max, signed by chair) is a structural
NSF requirement. The chair must affirm:

- Anna is in good standing as an Assistant Professor.
- The department supports the integrated research-and-education plan.
- The department will provide the teaching context for the education
  plan (specifically: the courses Sophie will be deployed in).

Anna needs to **brief the chair before requesting the letter**. The
[DBER positioning playbook](../dber-positioning.md) describes the
sequence: read RTP → talk to mentor → talk to chair with memo in
hand. The chair conversation should ideally happen *before* the
CAREER letter request, so the chair already understands the program
when the letter draft arrives.

Provide the chair with:

- A 1-page summary of the CAREER proposal.
- A draft of the letter for them to edit (this is standard practice
  and accelerates the process).

## Sprint plan (parallel with Cottrell)

CAREER drafting overlaps Cottrell drafting. The shared research-and-
education narrative pays off here. See [2026 calendar](../2026-calendar.md)
for the joint week-by-week sequence. Highlights for CAREER:

- **Weeks 3–6 (Jun 5–25)** — CAREER project description outline +
  research-plan draft (5 pp) + education-plan draft (3–4 pp)
  drafted in parallel with Cottrell.
- **Week 7 (Jun 26–Jul 1)** — Cottrell submitted; CAREER integration
  narrative drafted.
- **Week 8 (Jul 2–9)** — Full CAREER draft to mentor + 1 senior
  reviewer for feedback.
- **Weeks 9–10 (Jul 10–22)** — Revise; polish broader impacts;
  submit by July 22.

## Budget shape

$400K minimum over 5 years for MPS. Typical CAREER budget allocation:

- **Summer salary** for PI across 5 summers (largest line).
- **Graduate student support** (1 PhD student at SDSU — note this is
  through the joint SDSU/UCSD astronomy PhD program).
- **Undergraduate RA support** for ASTR 201 / COMP 521 learning-outcomes
  research.
- **Sophie infrastructure** (hosting, domains, occasional hardware).
- **Conference travel** for PI + students.
- **Open-access publication fees** for the 4 planned papers.
- **Software / external evaluator** budget for learning-outcomes
  assessment.

Budget Justification (5 pp) should make every line auditable. NSF
panel reviewers will scrutinize budgets — clean is competent.

## Top 5 pitfalls to avoid

1. **Two separate plans glued together.** If research-plan and
   education-plan read as parallel rather than integrated, the
   proposal underperforms. The integration narrative is the
   load-bearing section.
2. **Boilerplate education plan.** "I will mentor undergraduates"
   without specifics is a dead giveaway. Be concrete: which courses,
   which assessments, what learning-outcomes measurements.
3. **Vague Broader Impacts.** Generic "this will help underrepresented
   students" is weak. SDSU's HSI status + ASTR 201's demographics
   make a concrete Broader Impacts case — use it.
4. **Underdeveloped methodology.** AST reviewers may not be DBER
   experts; they will still expect rigorous experimental design for
   the learning-outcomes work. Don't hand-wave.
5. **Sophie as an afterthought.** Sophie should be visible throughout
   the proposal — it's the integration. If it appears only in the
   education plan section, the structural HITL story doesn't land.

## See also

- [Cottrell Scholar Award 2026](cottrell-2026.md) — shares narrative
- [DBER positioning](../dber-positioning.md) — chair conversation playbook
- [Papers](../papers/index.md) — the publication pipeline this proposal references
- [NSF CAREER solicitation (NSF 22-586)](https://www.nsf.gov/funding/opportunities/career-faculty-early-career-development-program/nsf22-586/solicitation)
- [NSF CAREER FAQ (2022–2026 submission years)](https://www.nsf.gov/funding/information/faq-faculty-early-career-development-career-program)
