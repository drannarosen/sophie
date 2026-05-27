---
title: "Formative assessment & reading-hardening design"
short_title: "Formative assessment design"
description: >-
  Pre-ADR design for a forward-compatible formative-assessment family (MCQ,
  QuickCheck, Solution/Hint, the practice route) plus a batch of reading-hardening
  fast wins (Video, author-trap lint, audit DX, figure dedup guard). Distilled from
  the ASTR 201 Modules 1-4 reading migration. Seeds ADR 0073.
date: 2026-05-27
status: draft
---

# Formative assessment & reading-hardening design

Pre-ADR design distilled from migrating all 23 ASTR 201 readings (Modules 1–4) into
Sophie MDX. It defines a **formative-assessment family** and a **practice route**
(Track A, seeds ADR 0073), plus a batch of independent **reading-hardening fast wins**
(Track B). Brainstormed and validated in chat 2026-05-27; this is the input to a fresh
Sophie session that will explore the codebase, brainstorm specifics, and write the
implementation plan.

## Why (findings from the migration)

The migration kept hitting the same gaps. Ranked by leverage:

- **`practice.mdx` is authored-but-unrouted (#189).** Every reading with a practice
  section — M3-L10 and all three M4 readings, ~35 problems — builds clean but **never
  renders for students**. Authored content is invisible. *Highest concrete waste.*
- **No single-best-answer MCQ component (#204).** The `:::{.quiz}` block appears in all
  three M4 readings; currently remapped to a `tip` Callout + ballot-box bullets +
  `Dropdown`. A raw GFM task-list would throw one axe `label` violation per option.
- **The "Quick Check" pattern is everywhere** — `tip` Callout + `<Dropdown label="Answer">`
  appears dozens of times across the course. It is one reusable self-check shape.
- **No structured answer / solution / hint model** owned anywhere.
- **`<Video>` is unbuilt** (ADR 0064 known gap) — 4+ readings (Rubin, ScienceClic ×2,
  …) all became link Callouts. The most-repeated workaround.
- **Author-trap ergonomics:** raw-`<` hazards recur (`<3,700`, `$v_r<0$`, `M(<r)`); the
  lint catches `<`-before-non-letter but not `<`-before-a-letter in math (we hand-fix with
  `\lt`). The lint also scans comments.
- **Pedagogy-audit DX:** the generic "audit found errors" throws at the end of the build
  while the `[ERROR Rxx]` detail prints near the front — every error hunt is scroll-and-grep.
- **`figures.ts` hand-edited (~1800 lines), global keys:** duplicate-key collisions on
  shared art break the build; caught 3+ times only by a disciplined exact-key grep.
- **A silently-missing `<Aside>` ships with no build signal** when both the `<GlossaryTerm>`
  and its definition Aside are absent (no D4/D5 to fire) — caught only by counting rendered
  defs. The same *class* of "authored-but-answerless" gap motivates the AS-2 audit below.

## Scope decision

**v1 = formative-with-solutions; grading deferred but designed forward-compatible.**
Render practice and self-checks, reveal structured solutions/hints, give MCQ/QuickCheck
first-class components — but **no** auto-grading, attempt-tracking, or score persistence
in v1 (zero students pre-launch; grading is a large lift with unclear near-term payoff).
The schema carries the seams so grading slots in later without re-authoring call sites.

**Item model:** distinct, purpose-built components that **share a common contract** — a
`<Solution>`/`<Hint>` reveal sub-shape, an optional structured `answer`, and the standard
`course/unit/id` props. Not one giant generic `<AssessmentItem>` (over-abstraction); not a
registry collection (over-engineering until reuse demand appears).

## Design

### 1. System shape — extend the retrieval family, don't fork a silo

Sophie already ships a Wedge-B formative family (`<RetrievalPrompt>`, `<Predict>`,
`<ComprehensionGate>`, `<ConfidenceCheck>`) — persistence-bearing, `client:load` +
`course/unit/id`. The new self-checks join it:

- **`<MCQ>`** — single-best-answer (radio semantics, accessible names; replaces the
  `.quiz` ballot-box workaround).
- **`<QuickCheck>`** — prompt + reveal (replaces the `tip`-Callout + `Dropdown` pattern).

Both — and practice problems — compose **`<Solution>`** and **`<Hint>`** (disclosure-based,
on the existing Radix/`Dropdown` machinery; children-mode so **KaTeX renders**, the gap that
blocks `<Predict>`'s string props). Each formative component also accepts an **optional
structured `answer`** (MCQ: correct choice; numeric: value + tolerance; free-response:
solution only). v1 renders and reveals — never grades. The `answer` field + `course/unit/id`
props are the **entire forward-compat grading seam**: a later version turns on attempt
tracking by wrapping these in Sophie's existing `useInteractive`/IndexedDB pattern, with no
call-site changes.

The **practice route** (`/units/<unit>/practice`) renders `practice.mdx` as MDX, so reading
and practice share one component family.

### 2. Component APIs + index/audit

```mdx
<MCQ client:load course="astr201" unit="…" id="q-flat-curve">
  <MCQ.Prompt>From $M(\lt r)=rv^2/G$, a flat rotation curve implies…</MCQ.Prompt>
  <MCQ.Choice>almost no mass beyond the disk</MCQ.Choice>
  <MCQ.Choice correct>enclosed mass keeps rising with radius</MCQ.Choice>
  <MCQ.Choice>the outer gas feels no gravity</MCQ.Choice>
  <Solution>Since $v$ is ~constant, $M\propto r$…</Solution>
</MCQ>
```

- **`<MCQ>`** — Radix RadioGroup; the `correct` boolean-presence is the answer contract. v1
  reveals the correct choice + `<Solution>` on demand (reveal, not scoring); nothing persists.
- **`<QuickCheck>`** — `<QuickCheck.Prompt>` + `<Solution>` (+ optional `<Hint>`);
  free-response/conceptual, solution-only.
- **`<Solution>` / `<Hint>`** — shared disclosure sub-components; `<Hint>` repeatable/progressive,
  `<Solution>` the full reveal; open-state persists via the existing `Dropdown` IDB key.

Index + audit (the build-time guarantees):

- New formative pedagogy-index bucket (extends the retrieval-family extractor): per-callsite
  unit, prompt, has-solution, has-answer.
- **AS-1 (ERROR):** an `<MCQ>` must have **exactly one** `correct` choice — kills the
  silently-broken MCQ.
- **AS-2 (WARN):** a formative item with no `<Solution>` — catches the authored-but-answerless
  gap (same class as the silently-missing-Aside trap).
- A `/library` self-check room is free once the bucket exists (deferred, YAGNI).

### 3. Practice route (ADR 0073, scoped)

Inject `/units/<unit>/practice` in `@sophie/astro` like the ADR-0082 reading route; render
`practice.mdx` through `makeStaticComponents` + the new components; retire the #189 warning;
add a reading→practice nav link. **The route can ship before the components** — it renders the
existing prose problems immediately, so the #189 visibility fix does not wait on `<MCQ>`/
`<QuickCheck>`.

## Prioritized step list (the fresh-session plan)

Full platform discipline on every PR: ADRs where warranted, R6–R10 review, tests, zero biome
warnings.

**Track A — assessment (one ADR + bottom-up PRs):**

1. **ADR 0073 (scoped)** — formative schema v1: the family, `<Solution>`/`<Hint>`, the `answer`
   contract + grading seam, the route, AS-1/AS-2. *Design/ADR first.*
2. **Practice route** — instant #189 fix (renders prose practice). *Front-loaded: highest
   leverage, no component dependency.*
3. **`<Solution>` + `<Hint>`** — foundation everything reuses.
4. **`<QuickCheck>`** + formative index bucket.
5. **`<MCQ>`** + AS-1 / AS-2 audit invariants.

**Track B — reading-hardening fast wins (independent, no shared ADR):**

6. **`<Video>`** — privacy-light embed, `title` for axe; retires the video→link workaround
   course-wide (closes the ADR 0064 gap). *Best first confidence-builder.*
7. **author-trap lint** — warn on `<`-before-letter in math, suggest `\lt`.
8. **audit-error DX** — print `[ERROR …]` detail adjacent to the summary / in the throw.
9. **figures.ts duplicate-key build guard** — friendly error (manifest-generation + image
   optimization a later optional follow-up).

**Recommended order:** `<Video>` (6) first for a quick win, then ADR 0073 design (1) →
practice route (2) → `<Solution>`/`<Hint>` (3) → `<QuickCheck>` (4) → `<MCQ>` (5); the tiny
B items (7–9) slot in opportunistically.

## Deferred (YAGNI, revisit later)

- Auto-grading, per-student attempt tracking, score persistence (the forward seam is built;
  the machinery is not).
- A registry-backed assessment-item collection + `/library` self-check room.
- `figures.ts` manifest generation + image-optimization pipeline.
- #198 desktop table sub-pixel overflow platform fix (currently routed around with slash-form
  math in summary tables).

## Follow-on (astr201, separate from the Sophie session)

Once the components land, an astr201 adoption pass converts `.quiz` → `<MCQ>`, Quick Checks →
`<QuickCheck>`, and adds `<Solution>`s to practice — incrementally, reading by reading.
