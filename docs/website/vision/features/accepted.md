---
title: Accepted-pending-ADR features
short_title: Accepted features
description: Features committed to ship, awaiting their authoring ADR. Each entry includes a motivating use case, design sketch, estimated cost, defended priority claim, and a framed open ADR question.
tags: [vision, features, accepted, adr, sophie-lds]
---

# Accepted-pending-ADR features

Features committed to ship. Each entry has cleared the
[backlog](backlog.md) → accepted gate (see
[Transitions](../transitions/index.md) for criteria) and is awaiting
its authoring [ADR](../../decisions/).

When an entry's ADR is drafted, accepted, and (usually) placed on the
[roadmap](../../status/roadmap.md), the entry moves to *graduated*
status — a one-line pointer with a cross-link.

(a1-teaching-decision-records-tdrs)=
## A1. Teaching Decision Records (TDRs) — graduated 2026-05-14

**Graduated** → [ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
+ [TDR template](../../reference/tdr-template.md).

The ADR resolved the "where do TDRs live?" open question (option c —
in consumer repos, not platform docs), ratified the ADR-shaped
schema, and locked folder-scoped 3-digit numbering. TDRs are now a
first-class Sophie convention; consumer repos copy the template and
begin authoring `teaching-decisions/001-...md` entries.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0040](../../decisions/0040-teaching-decision-records.md)

---

## A2. Teaching Move Library

**Motivating use case.** Sophie's chapter components — `<Predict>`,
`<Aside kind="key-insight">`, `<ComprehensionGate>`, `<Reflection>`,
`<CollapsibleCard>` — *already implement* pedagogical moves: elicit
prior model, create cognitive conflict, reduce abstraction, generalize
from case, check transfer, fade support. But the *moves themselves*
aren't named. When AI scaffolds a chapter or Anna designs a new
section, "what move are we making here?" should be the first
question — not "what component do you want?" Naming the moves turns
Sophie from a component library into a *language for teaching*.

**Design sketch.** A library of ~12–20 named teaching moves, each
with a short description, when-to-use guidance, and a mapping to
Sophie components that implement it. Each existing component gains a
`pedagogy_intent` metadata field declaring which move(s) it
implements. The library is reference content
(`docs/website/reference/teaching-moves.md` or similar), not a code
abstraction. AI authoring prompts (future Phase 3 work) reference the
library by name.

**Estimated cost.** ADR (~1 hour) + library document with ~15 named
moves (~3–4 hours of authoring) + per-component metadata field added
to existing schemas (~1 day of mechanical work across ~30 components).
Total: ~2–3 days.

**Priority claim.** Highest *conceptual* leverage of any accepted
item. Names a category-defining abstraction that distinguishes Sophie
from generic component libraries. Cheap relative to its leverage. AI
authoring (eventual) and migrated chapters (near-term) both benefit
from move-named scaffolding. Without it, every AI prompt re-invents
the move vocabulary.

**Open ADR question.** *What's the canonical move taxonomy?* Options:
(a) ground in cognitive-science literature (Renkl's worked examples,
Chi's ICAP, Mayer's multimedia learning); (b) ground in Anna's
existing teaching practice (what moves does ASTR 201 already use?);
(c) hybrid. The ADR also decides where `pedagogy_intent` lives —
PropsSchema (typed), Storybook stories (documentation only), or both.

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to accepted-pending-ADR
- ADR target: after A1 (TDRs) lands

---

## A3. AI Contribution Ledger + Pedagogy Contract

**Motivating use case.** Sophie's [CLAUDE.md](../../../CLAUDE.md)
Engineering Principles informally codify the responsible-AI workflow:
HITL mandate, no back-compat pre-launch, build the best now, SoTA over
simple. But CLAUDE.md is project-instruction-for-Claude-Code, not a
*per-course* artifact a reader can inspect. Promote it: each course
ships a `pedagogy_contract.yaml` (the values that govern this course)
and per-chapter `ai_contribution` metadata (which AI helped draft what,
which instructor decisions overruled AI suggestions, what was reviewed).
This is the *responsible-AI demonstrator* the broader ed-tech
community needs to see.

**Design sketch.** Two artifacts: (1) `pedagogy_contract.yaml` —
course-level YAML covering teaching philosophy, AI use standards,
math/units expectations, citation expectations, accessibility, and
"what Sophie should never do" — readable and machine-loadable;
(2) per-chapter `ai_contribution` frontmatter — drafted_by,
reviewed_by, instructor_decisions list, transparency_note. Optionally
a course-site page rendering the contract + aggregate ledger
("How this course was made with AI").

**Estimated cost.** ADR (~1 hour) + 2 schema files (~3–4 hours) +
example contract + 3 chapter migrations to populate ledger (~2–3
hours). Total: ~1–2 days.

**Priority claim.** Highest *external-positioning* leverage of any
accepted item. The cultural intervention Sophie is positioned to make
("AI use is structured, supervised, documented — not banned, not
hidden") becomes *demonstrable* once these artifacts ship.
Tenure case + grant proposals + talks all want to point at concrete
evidence. Without these, the "responsible AI" claim stays rhetorical.

**Open ADR question.** *Where does the per-course pedagogy contract
live?* As a top-level YAML in consumer repos? As frontmatter on a
canonical course-index.mdx? Both? And: *what's the minimum required
`ai_contribution` schema* — instructor's call on stringency vs
overhead.

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to accepted-pending-ADR
- ADR target: after A1 (TDRs)

---

## A4. MultiRep + Notation Registry + Representation Alignment Audit

**Motivating use case.** STEM students fail to learn when prose says
"distance," equation uses *r*, figure labels radius *R*, code names
the variable `distance_pc`, and plot axis says "separation." The
representations are *materially the same concept*; the *symbols and
language* drift. Sophie should encode the binding and audit it.
Existing PR-C4 pedagogy index has all the raw data (definitions,
equations, figures, inline-ref usages); the audit just doesn't yet
look across representations.

**Design sketch.** Three paired sub-features that ship in sequence:
(1) **Notation Registry** — a per-course schema declaring canonical
symbols, their meanings, units, common confusions; (2) **`<MultiRep>`**
primitive — declares "these representations are the same concept"
binding for one concept (verbal, equation, plot, code, diagram, physical
intuition); (3) **Representation Alignment Audit** — invariants on
notation consistency across the bound representations of one concept,
plus catch-all symbol-reuse warnings.

**Estimated cost.** ~1–2 weeks. Real schema additions + new
component + new audit invariants. Largest of the accepted entries.

**Priority claim.** Highest *STEM-specific* leverage of any accepted
item. Catches a real chapter-authoring failure mode that current tools
miss entirely. Sophie's "rigorous STEM teaching" claim depends on
this kind of structural support. Equation Biography (backlog) depends
on Notation Registry; MultiRep also unlocks better Cosmic Playground
demo integration via the canonical-notation binding.

**Open ADR question.** *Schema shape for Notation Registry.* Per-course
YAML (declarative) vs schema-driven derivation from `<KeyEquation>` +
`<Figure>` + `<CodeCell>` walks (implicit). Plus: *what audit
invariants does Representation Alignment ship with at v1?*

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to accepted-pending-ADR
- ADR target: after A1 (TDRs) + A2 (Teaching Moves)

---

## A5. Misconception Graph + Intervention Library

**Motivating use case.** PR-C4 shipped a `misconceptions` collection
in the pedagogy index — each misconception has a name, a chapter
locator, and short/long content discriminator. But misconceptions
*relate*: "universe expands from a center" is a *prerequisite* to
"redshift is ordinary Doppler motion"; "brightness is intrinsic"
*relates to* "flux and luminosity are interchangeable." And
misconceptions have *reusable interventions*: contrasting cases,
Predict-then-reveal sequences, specific analogies. Today: each
chapter rediscovers these. Tomorrow: a graph + library makes them
queryable + reusable across courses.

**Design sketch.** Two paired sub-features: (1) **Misconception
Graph** — extend `MisconceptionEntry` schema with `related_concepts`,
`prerequisite_misconceptions`, `addressed_by` (chapter/component
FKs); (2) **Intervention Library** — reusable misconception →
intervention pairings (Predict + contrasting cases; analogy with
explicit limits; etc.) that any chapter can reference. The
PR-C4 audit pass extends with M3 (orphan misconception),
M4 (misconception addressed but no intervention paired), M5
(intervention used but no misconception cited).

**Estimated cost.** ~1 week. Schema extension on existing collection;
new lightweight intervention-library schema; audit invariant
additions.

**Priority claim.** Highest *curriculum-design distinctiveness*
leverage of any accepted item. Most courses track "what students
should know"; Sophie tracks "what wrong models students bring and
how the course transforms them." That's the deepest pedagogical
claim Sophie can make. Builds directly on PR-C4's shipped
misconceptions index; no greenfield work.

**Open ADR question.** *Graph topology — should misconception
prerequisites form a DAG (build-time audit catches cycles) or just
loose `related_to` links?* Plus: *intervention-library reuse model —
named interventions referenced by anchor (rigid), or per-chapter
inline interventions tagged with type (flexible)?*

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to accepted-pending-ADR
- ADR target: after A1 (TDRs)

---

## Graduated entries (links only)

Once an entry's ADR ships, the full content moves into the ADR; the
vision/features/ entry collapses to a one-line pointer.

- **A1 — Teaching Decision Records (TDRs)** → [ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
  + [TDR template](../../reference/tdr-template.md). Graduated 2026-05-14.
