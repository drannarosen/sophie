---
title: Comparators
short_title: Comparators
description: Every open-source textbook authoring platform, AI-for-education tool, and accessibility-first publishing pipeline surveyed against Sophie's distinctive claims. Refresh per grant cycle.
tags: [strategy, landscape, comparators, prior-art, accessibility]
---

# Comparators

The platforms in this page are the ones a reviewer will know. Sophie's
positioning paragraphs need to make accurate, specific claims about
each — vague gestures at "we're different" do not survive proposal
review. Each entry below carries: status, distinguishing feature,
what they have that Sophie does not, what they lack that Sophie has,
and the *retrieved* date for the underlying sources. Last full
review: **2026-05-22**.

## Reading guide

- **Direct comparator** — overlaps Sophie's primary positioning. A
  Sophie pitch that fails to position relative to these will get
  pinged.
- **Adjacent** — solves a related problem with a different
  abstraction. Useful for "Sophie is not X" framing; cite when
  helpful.
- **Complementary** — Sophie can interoperate with this, not replace
  it. Worth naming as integration target.

## Direct comparators — open-source textbook and courseware platforms

### PreTeXt + Runestone (PROSE Consortium)

**Sophie's closest direct comparator.** PreTeXt is an XML-based
authoring schema for undergraduate STEM textbooks; Runestone is the
interactive-delivery platform; together they form the PROSE
Consortium, funded by NSF Award #2230153.

- **Status:** very active, **NSF-funded**, 100+ open-source textbooks
  in production, multi-PI governance.
- **Distinguishing feature:** schema-driven from inception;
  accessibility-first by *architectural commitment* — native braille,
  MathJax screen-reader integration, RELAX-NG validation.
- **What they have that Sophie does not:**
  - A decade-plus schema track record at production scale.
  - Native braille output.
  - NSF funding line for accessibility deepening (PROTEUS award at
    U-Michigan Marsal[^proteus]).
  - Multi-PI consortium governance.
  - Runestone analytics/learning-engineering portal for empirical
    SoTL signal.
- **What they lack that Sophie has:**
  - No epistemic role contract (PreTeXt XML encodes *document
    structure* — chapter, section, theorem, exercise — not
    *epistemic function*).
  - No AI-as-primary-author model.
  - No misconception graph.
  - No teaching-moves library.
  - No pedagogical-diff / curriculum CI.
  - No equation biographies.
  - XML authoring surface is less LLM-emission-friendly than Sophie's
    MDX+Zod-typed JSX.
- **Strategic note:** PROSE owns the "schema-driven accessible STEM
  textbook" narrative. Sophie must position **with** PROSE, not
  against it. Frame Sophie as "epistemic semantics + AI-authoring
  contract layered on top of (or interoperable with) schema-driven
  publishing." A collaboration story is stronger than a competitive
  one. See [risks and discipline § PROSE positioning](risks-and-discipline.md#prose-positioning).
- **References:**
  - PROSE Consortium home: <https://prose.runestone.academy/> *(retrieved 2026-05-22)*
  - PreTeXt accessibility guide: <https://pretextbook.org/doc/guide/html/topic-accessibility.html> *(retrieved 2026-05-22)*
  - "PreTeXt as Authoring Format for Accessible Alternative Media" (Springer 2024): <https://link.springer.com/chapter/10.1007/978-3-031-62846-7_22> *(retrieved 2026-05-22)*

### Quarto (Posit)

- **Status:** very active, **commercial backing** (Posit/RStudio
  successor product to Bookdown). Quarto 1.9 shipped March 2026 with
  experimental PDF/A and PDF/UA tagging.
- **Distinguishing feature:** multi-language literate computing
  (R/Python/Julia/Observable), multi-format output (HTML/PDF/Typst/
  EPUB), mature ecosystem, structurally neutral with respect to *what
  kind of pedagogical thing* a chunk of content is.
- **What they have that Sophie does not:**
  - Mature ecosystem.
  - Native multi-language execution.
  - PDF/A11y/UA tagging via Typst+LaTeX.
  - `llms.txt` output as an LLM-consumption surface (Quarto 1.9).
  - Commercial backing.
- **What they lack that Sophie has:**
  - No epistemic role contract.
  - No misconception graph.
  - No curriculum CI / pedagogical diff.
  - No schema-constrained AI authoring guardrails.
  - No named teaching-moves library.
  - Accessibility is *retrofit*: PDF/UA only landed in 1.9; an active
    GitHub discussion (#12644) tracks whether Quarto will commit to
    full WCAG 2.1 AA.
- **Sophie's specific claim against Quarto:** "Quarto is a
  literate-computing publishing pipeline. Sophie adds a pedagogy
  schema on top." Both can coexist; Sophie does not replace Quarto
  for a data-science methods textbook.
- **References:**
  - Quarto 1.9 release notes: <https://quarto.org/docs/blog/posts/2026-03-24-1.9-release/> *(retrieved 2026-05-22)*
  - WCAG 2.1 AA discussion #12644: <https://github.com/quarto-dev/quarto-cli/discussions/12644> *(retrieved 2026-05-22)*
  - Posit PDF accessibility post: <https://opensource.posit.co/blog/2026-03-05_pdf-accessibility-and-standards/> *(retrieved 2026-05-22)*

### MyST Markdown / Jupyter Book 2

- **Status:** very active, community-governed
  (Executable Books Project / Project Jupyter), MIT-licensed.
- **Distinguishing feature:** *roles* and *directives* as first-class
  semantic constructs — closest existing analogue to Sophie's
  epistemic-role contract, but **generic** (citation, headings, math,
  code) rather than **pedagogical** (observable / inference /
  misconception).
- **What they have:**
  - Pure-Markdown source.
  - Mature directive / role extension model.
  - Multi-output engine (MECA, JATS, PDF, web).
  - Community governance — no corporate single-point-of-failure.
  - Queryable AST.
- **What they lack:**
  - Roles are *typographic / structural*, not *epistemic*.
  - No AI-authoring contract.
  - No misconception graph.
  - No teaching-moves library.
  - No pedagogical-diff CI.
  - No schema-enforced a11y gate (semantic HTML is good; no axe-core
    CI gate documented).
- **Sophie's positioning relative to MyST:** Sophie *uses* MyST for
  this docs site (per [ADR 0010](../../decisions/0010-myst-for-design-docs.md)),
  which is honest precedent. Sophie's chapter authoring is **not**
  MyST; it is MDX+Zod under Astro. The reason matters: MDX permits
  React-component composition with typed schemas in a way MyST's
  role/directive system was not designed for.
- **References:**
  - JB2 + MyST blog (2024-05-20): <https://executablebooks.org/en/latest/blog/2024-05-20-jupyter-book-myst/> *(retrieved 2026-05-22)*
  - MyST spec: <https://github.com/jupyter-book/myst-spec> *(retrieved 2026-05-22)*
  - MyST accessibility + performance: <https://mystmd.org/guide/accessibility-and-performance> *(retrieved 2026-05-22)*

### OLI Torus (CMU Open Learning Initiative)

- **Status:** very active. Torus v32b shipped 2026 with accessibility,
  mobile responsiveness, analytics improvements. Earlier v24 added
  Branching Questions, AI Activation Points, LTI integration.
- **Distinguishing feature:** adaptive-learning-first; built on CMU's
  learning-engineering research tradition; LTI-integrated; conditional
  branching as a first-class authoring primitive.
- **What they have:**
  - Mature LTI 1.3 integration.
  - Production-grade analytics + LearnSphere data infrastructure.
  - Continuous A/B and improvement loops.
  - AI Activation Points (instructor-controllable AI inserts).
- **What they lack:**
  - Authoring is server-bound (course lives on `proton.oli.cmu.edu`),
    not file-based + git-versioned.
  - No offline / static-site / multi-format publishing.
  - No epistemic role schema.
  - Primarily an LMS+authoring stack, not a textbook publisher.
- **Sophie's positioning relative to OLI:** orthogonal, not
  competitive. Sophie's "Markdown+schema+static-site" shape is
  fundamentally different from Torus's "Elixir/Phoenix server-hosted
  adaptive course platform." Either could integrate the other via LTI.
- **References:**
  - OLI Torus platform: <https://oli.cmu.edu/torus/> *(retrieved 2026-05-22)*
  - GitHub repo: <https://github.com/Simon-Initiative/oli-torus> *(retrieved 2026-05-22)*

### Open edX

- **Status:** very active. XBlock plugin ecosystem expanding with
  AI-evaluated coding, flashcards, read-aloud. Visual problem editor
  in development.
- **Distinguishing feature:** de-facto standard for MOOC-scale
  delivery; XBlock plugin architecture for interactives.
- **What they lack:**
  - Not a textbook authoring platform.
  - Not schema-driven for pedagogy (XBlocks are arbitrary HTML+JS
    containers).
  - No epistemic-role contract.
  - Not optimized for AI authoring.
  - Not a static-site publisher.
- **Positioning:** Adjacent, not competitive. Sophie chapters could
  in principle be wrapped as XBlocks for delivery in an existing
  Open edX deployment; that integration is plausible future work.
- **References:**
  - Open edX home: <https://openedx.org/> *(retrieved 2026-05-22)*
  - XBlocks developer guide: <https://docs.openedx.org/en/latest/developers/references/developer_guide/extending_platform/xblocks.html> *(retrieved 2026-05-22)*

### Bookdown (R)

- **Status:** active but mature; effectively superseded by Quarto
  (Posit's own successor product).
- **Distinguishing feature:** R Markdown to multi-format book.
- **What they lack:** no pedagogical layer, no a11y gate, no AI
  authoring, no misconception graph. Precursor of Quarto.
- **Reference:** <https://bookdown.org/> *(retrieved 2026-05-22)*

### H5P

- **Status:** active. February 2026 redesign; >90% of content types
  now WCAG-compliant per their reporting.
- **Distinguishing feature:** library of pre-built interactive
  widgets embeddable in any LMS / CMS.
- **What they lack:** not a textbook platform — a widget set. No
  book-level structure, no pedagogy schema, no AI authoring.
- **Positioning:** complementary, not competitive. A future Sophie
  component family could in principle export to H5P for embedding in
  non-Sophie courses.
- **Reference:** <https://h5p.org/h5p-february-2026-update> *(retrieved 2026-05-22)*

### Manning / O'Reilly LiveBooks

- **Status:** commercial; closed authoring pipelines.
- **Relevance:** not an open-source comparator; useful only as a
  shorthand for "interactive textbook" in lay conversation.

## AI-authoring tools for education (2024–2026)

The market in this category has converged on two shapes: (1) *AI-as-
tutor over fixed curriculum* (Khanmigo, Cognii, Querium); and (2)
*AI-as-content-drafter over RAG retrieval* (AI-University, Mindsmith,
Slide2Text). **None of the surveyed tools treat the output structure
as a typed, queryable schema that constrains what the AI is allowed
to emit.** Sophie's claim of *schema-as-guardrail-for-AI-emission* is
uncommon in this category and is the strongest single differentiator
against the AI-for-education vendor landscape.

| Tool | Approach | Schema-driven? | Sophie's distinction |
| --- | --- | --- | --- |
| **Khanmigo** (Khan Academy + OpenAI) | Socratic tutor integrated with KA's fixed curriculum library | No — chat over fixed curriculum, not an authoring tool | Sophie authors content; Khanmigo tutors over content |
| **Cognii** | NLP-based open-response assessment + virtual learning assistant | No — assessment-time AI | Sophie is authoring-time; Cognii is assessment-time |
| **Querium StepWise** | Step-by-step STEM tutoring with learning-analytics signal back to teachers | No — tutoring | Sophie is the textbook; Querium tutors *from* one |
| **AI-University** (USC, arXiv 2504.08846) | Fine-tuned LLM + RAG for instructor-aligned course content responses | Partially — alignment via RAG retrieval scaffolding, not a schema contract | Sophie binds the output shape, not just the retrieval set |
| **Open edX AI Activation Points** | Instructor-placed AI inserts inside structured course | No — AI uses an authored container, doesn't emit into a schema | Sophie's schema *is* what AI emits into |
| **Mindsmith / generic AI LMS tools** | Free-text course generation | No | Sophie constrains; these do not |
| **Slide2Text** (arXiv 2503.17710) | PPT-to-textbook via structured prompting | Weakly — structured prompts, not a typed schema | Sophie types the output, not just the prompt |

**Sophie's specific claim against this category:** "Other AI-for-
education tools constrain AI's *retrieval set* or *prompt*. Sophie
constrains AI's *output type*. The AI cannot emit a `<Figure>` without
the schema's required `alt` field. The AI cannot emit a `<KeyEquation>`
without the registry binding. The eight-role epistemic contract is the
grammar; the AI must speak it."

**References:**
- Khanmigo: <https://www.khanmigo.ai/> *(retrieved 2026-05-22)*
- Cognii: <https://www.cognii.com/> *(retrieved 2026-05-22)*
- Querium StepWise (third-party review): <https://www.stork.ai/en/querium-stepwise> *(retrieved 2026-05-22)*
- AI-University (arXiv 2504.08846): <https://arxiv.org/abs/2504.08846> *(retrieved 2026-05-22)*
- Slide2Text (arXiv 2503.17710): <https://arxiv.org/pdf/2503.17710> *(retrieved 2026-05-22)*

## Accessibility-first publishing — the schema-driven a11y comparison

Schema-driven, load-bearing accessibility is rare but not unique to
Sophie. The comparison below grounds Sophie's a11y differentiation
honestly.

| Platform | Accessibility approach | Enforcement layer | Retrieved |
| --- | --- | --- | --- |
| **PreTeXt + PROSE** | Foundational — native braille, MathJax screen-reader, RELAX-NG validation. NSF-funded a11y deepening (PROTEUS). | Schema-at-validation-time | 2026-05-22 |
| **Sophie** | Foundational — axe-core CI gate per PR; Radix UI primitives; Zod-typed `alt` enforcement on `<Figure>`; ADR 0004 mandate. | Schema-at-commit-time | 2026-05-22 |
| **Quarto** | Retrofit — PDF/UA tagging shipped in 1.9 (2026-03); full WCAG 2.1 AA commitment under discussion. | Build-pipeline tagging | 2026-05-22 |
| **MyST / JB2** | "Significant work on performance and accessibility" via semantic HTML. No axe-core CI gate documented. | Semantic HTML conventions | 2026-05-22 |
| **OLI Torus** | Iterative accessibility releases per version (v32b notes a11y improvements). | Per-version remediation | 2026-05-22 |
| **H5P** | Per-widget WCAG compliance (>90% as of Feb 2026). | Widget-level | 2026-05-22 |
| **Open edX** | Mature accessibility infrastructure; per-XBlock variance. | Platform + plugin | 2026-05-22 |

**Sophie's specific a11y claim, said precisely:** "PreTeXt validates
a11y at publish-time via schema; Sophie validates a11y at commit-time
via axe-core CI gate, Radix primitives, and Zod-typed alt-text
contracts. Both treat accessibility as architectural; the enforcement
layer differs."

PreTeXt is the only other platform with a foundational a11y story.
Quarto, MyST, OLI Torus, and Open edX all treat accessibility as
ongoing remediation work rather than as a schema commitment. Sophie's
specific advance over PreTeXt is the **per-commit** rather than
**per-publish** gate — see [WCAG 2.1 AA reference](../../reference/wcag-21-aa.md).

## Funding programs aligned with Sophie

Active NSF + foundation programs whose RFPs and recent awards align
with Sophie's claims. Verify deadlines and example awards each cycle.

| Program | Award | Sophie fit | Recent example | Retrieved |
| --- | --- | --- | --- | --- |
| **NSF IUSE: EDU** (NSF 23-510) | \$300K–\$2M / 3–5 yr | **Strong.** Adaptation/Implementation/Dissemination track is closest to "platform for evidence-based STEM teaching" | June 2025 cycle | 2026-05-22 |
| **NSF CAREER** | \$400K+ / 5 yr | **Strong.** Required teaching-research integration component is literally what Sophie is. | Cyr-Racine (UNM) 2025 ML+cosmology with pedagogy | 2026-05-22 |
| **Cottrell Scholar (RCSA)** | \$120K / 3 yr | **Strong.** Requires research+education integration in chemistry/physics/astronomy. | 2026 class of 24 awardees | 2026-05-22 |
| **NSF CISE — HCC, RI, IIS, CRII** | Varies | **Possible.** Frame as HCI / human-AI collaboration for the AI-authoring research thread. | Ke Xu (RIT) CAREER 2025 | 2026-05-22 |
| **NSF DRK-12 / NSF STEM K-12** (NSF 25-545) | \$350K–\$750K | **K-12 only.** Rules out Sophie's undergrad focus unless Sophie Astro/Compute targets dual-level. | Replaced AISL track Sep 2025 | 2026-05-22 |
| **PROSE Consortium** (NSF #2230153) | (existing NSF runway) | **Competitor or collaborator.** Do not compete head-on; engage as additive partner. | \$1.5M+ NSF runway | 2026-05-22 |
| **Sloan Foundation — Technology** | \$300K–\$750K typical | **Strong for v1+.** Open-source infrastructure for science angle. | Rolling LOI; target Nov 2026 | 2026-05-22 |
| **AAS-EPD Mini-grants** | up to \$1K | **Easy bridge.** | Summer 2026 | 2026-05-22 |
| **SDSU internal** | \$5K–\$50K | **Bridge funding** for travel, RA support. | Fall 2026 | 2026-05-22 |

**References:**
- NSF IUSE: EDU (23-510): <https://www.nsf.gov/funding/opportunities/iuse-edu-improving-undergraduate-stem-education-directorate-stem> *(retrieved 2026-05-22)*
- NSF CAREER: <https://www.nsf.gov/funding/opportunities/career-faculty-early-career-development-program> *(retrieved 2026-05-22)*
- Cottrell Scholar 2026 cohort: <https://rescorp.org/2026/02/rcsa-welcomes-2026-class-of-cottrell-scholars/> *(retrieved 2026-05-22)*
- RIT NSF CAREER 2025 examples: <https://www.rit.edu/news/nsf-career-awards-spotlight-rit-research-shaping-future-ai> *(retrieved 2026-05-22)*
- NSF STEM K-12 program: <https://www.nsf.gov/news/nsf-invests-11m-expand-ai-professional-development-k-12> *(retrieved 2026-05-22)*
- PROTEUS award (PreTeXt-Runestone, UMich): <https://marsal.umich.edu/grants-awards/collaborative-research-pretext-runestone-open-textbooks-engaging-undergraduates-stem> *(retrieved 2026-05-22)*

## How to use this page

When writing any of: a grant proposal landscape paragraph; a paper
"related work" section; a job-talk competitive-positioning slide;
a tenure-file external-impact narrative; a public-facing "what is
Sophie" page — pull the specific claims for each platform from this
page. Do not paraphrase from memory. The retrieved dates are how you
know whether a claim is current.

When a new tool or program appears in conversation, in review, or in
the news, *add it here first*. Surface it before a reviewer does.

[^proteus]: PROTEUS = "Collaborative Research: PreTeXt–Runestone:
    Open Textbooks Engaging Undergraduates in STEM," U-Michigan Marsal
    award, ongoing. See URL in the PreTeXt entry above.
