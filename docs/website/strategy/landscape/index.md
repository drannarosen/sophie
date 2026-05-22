---
title: Landscape and discipline
short_title: Landscape
description: Sophie's position relative to comparable platforms, academic prior art, funding programs, and the scope-discipline watchpoints that keep ambition honest. A living index — review after every ADR cluster or grant cycle.
tags: [strategy, landscape, positioning, prior-art, scope-discipline]
---

# Landscape and discipline

This section locates Sophie in three landscapes — the open-source
authoring-tool ecosystem, the academic literature on pedagogy-as-schema
and AI-augmented learning, and the active funding programs — and names
the scope-discipline watchpoints that keep Sophie's ambition honest as
the platform grows.

Sophie's positioning claims are strongest when they are *specific*.
"Schema-driven STEM textbook" is a category PreTeXt already owns.
"AI-authored interactive textbook" is a category Khanmigo, Cognii, and
half a dozen vendor tools occupy without serious differentiation.
Sophie's distinctive bundle — *epistemic-role-typed schema + AI-emission
contract + misconception graph + named teaching moves + curriculum CI +
schema-gated WCAG* — is novel only when the comparison is precise.
That precision is the job of this section.

This page is a living index. Sub-pages get reviewed after each ADR
cluster (every ~10 new ADRs) and at each grant-cycle boundary. Last
full review: **2026-05-22**.

:::{seealso}
The strategic positioning pitches (1-sentence, 30-second, reviewer
one-liners) live in [`positioning.md`](../positioning.md). The
DBER-vs-traditional tenure question lives in
[`dber-positioning.md`](../dber-positioning.md). This section
complements them with external comparison.
:::

## Sophie's position in one paragraph

Sophie is the first production attempt at *schema-driven STEM textbook
infrastructure with AI as primary author under structural human-in-the-
loop constraint*. Each constituent of that claim has prior art:
PreTeXt has a schema; MyST has a structured AST; OLI Torus has
adaptive learning analytics; Open Cognitive Graph[^ocg] argues
theoretically for externalized pedagogical structure with explicit
misconception representation; the IMS Learning Design tradition tried
formal pedagogical patterns in XML twenty years ago. The composition
— schema as both AI-emission boundary *and* pedagogy audit surface —
is, as best the surveyed landscape shows, not yet implemented anywhere
else. That composition is the moat. The composition is also the
adoption barrier.

## Three honest claims about where Sophie sits

1. **Sophie is novel as a composition, not as any single capability.**
   Every individual piece of Sophie's architecture exists somewhere in
   the surveyed landscape. The bundle does not. A reviewer who
   evaluates Sophie one component at a time will find precedent for
   every one and miss the point.

2. **Sophie's load-bearing claim is currently architectural, not
   empirical.** Sophie's schema *can* constrain AI emission. Whether
   it *does* — whether the eight-role contract catches structural
   pedagogical failures that retrieval-augmented free-text generation
   does not — is unverified. No chapter has been authored AI-first
   end-to-end in Sophie as of 2026-05-22. The pilot work
   ([M2-L3 spectra-and-composition](../../pilots/m2-l3-spectra-composition.md))
   demonstrates the schema's expressive range; it does not yet
   demonstrate the AI-constraint claim.

3. **Sophie's longevity story needs to predate the tenure decision.**
   PROSE Consortium has four-plus PIs and NSF runway. Project Jupyter
   has formal governance. Sophie has Anna Rosen. AGPL is the right
   licence choice; AGPL alone does not answer the "what happens if
   Anna takes a sabbatical, gets pregnant, leaves SDSU" question. A
   governance answer — foundation, consortium, or merge — is owed to
   reviewers *before* CAREER review, not at it.

## What this section contains

- [**Comparators**](comparators.md) — every open-source textbook
  authoring platform, AI-for-education tool, and accessibility-first
  publishing pipeline surveyed against Sophie's distinctive claims.
  This is the page to consult before writing a "competitive landscape"
  paragraph in any proposal.

- [**Academic prior art**](academic-prior-art.md) — the theoretical
  and empirical literature Sophie inherits and updates: Open Cognitive
  Graph, IMS Learning Design and pedagogical pattern languages,
  epistemic-framing research in DBER, knowledge-graph approaches in
  education, and AI-authoring-with-structural-constraints precedents.
  Cite-or-be-cited reading.

- [**Risks and discipline**](risks-and-discipline.md) — the four risks
  the assessment surfaced as underweighted, and the scope-discipline
  watchpoints that keep Sophie shippable rather than infinitely
  scoped. Read before every roadmap revision.

## Update cadence

This section drifts faster than the architecture does. Treat it as a
*living document*, not a settled reference. The trigger conditions for
update:

- **Every ~10 new ADRs.** New architectural decisions should provoke
  a re-check: do the comparators still describe the same gaps?
- **Every grant cycle.** Funding-program details and example awards
  shift annually. Verify before pitching.
- **Every new pilot, every new co-author.** External engagement
  surfaces gaps the platform team cannot see from inside.
- **Whenever an unfamiliar paper or tool gets surfaced in review.**
  Prior art that lands in a reviewer's comments is too late; this
  section's job is to be ahead of it.

(landscape-citation-discipline)=

## Citation discipline

All references on these pages carry an explicit *retrieved* date. URLs
move; programs get renamed; awards get rescoped. The retrieved date
makes it trivially obvious when a claim has aged out. When updating,
update the retrieved date or flag the entry as stale.

[^ocg]: Open Cognitive Graph (arXiv 2602.16949). See
    [academic prior art](academic-prior-art.md) for the full reference
    and Sophie's positioning relative to it.
