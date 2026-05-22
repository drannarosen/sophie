# Wedge B1 — Retrieval Family Components (Design)

> **For Claude:** This is a **design** document validated through
> `superpowers:brainstorming` (2026-05-21). The corresponding
> implementation plan lands as a separate file when scoped. The Wedge B
> plan is split into B1 (this doc) and a follow-up B2 (worked-example
> family); B1 ships first.

**Scope:** Three new Tier 1 pedagogy components forming the **retrieval
family** — `<RetrievalPrompt>`, `<SpacedReview>`, and (evolved)
`<SkillReview>`. Plus the shared `practice_attempt` persistence schema,
the `useRetrievalAttempt` hook, the shared `<RetrievalCard>` internal
primitive, 3 new pedagogy-index entry types, 3 new curriculum-CI audit
invariants, smoke chapter usage, and 2 small doc updates.

**Out of scope (deferred to follow-up wedges):**

- `<WorkedExample>`, `<FadedPrompt>`, `<InterleavedSet>` — these form
  **Wedge B2**; separate design + plan + PR.
- FSRS algorithm proper — Wedge D; B1 ships a `practice_attempt`
  queue + LRU-stub `<SpacedReview>` scheduler that Wedge D replaces.
- BKT mastery + adaptive `<SkillReview>` prominence — Wedge E.
- Topic-registry auto-resolution for self-closing `<SkillReview>` —
  Wedge C (Library room).
- AI Authoring Packets — Wedge G.

**Foundation already in place (Wedge A + A.5):**

- `BaseRecordSchema` (ADR 0066) with the `user_id` + `course_id` +
  `schema_version` + `state_type` + `created_at` + `updated_at`
  contract every persisted record extends.
- `FSRSRecordSchema` + `BKTStateSchema` (ADR 0073) — Wedge D + E
  consume the records Wedge B1 produces.
- `SectionSchema` discriminated union (ADR 0067 + Wedge A.5) — the
  `section="..."` selector on `<SpacedReview>` resolves against
  these.
- `useInteractive` hook (ADR 0007) + BroadcastChannel LWW (ADR 0029)
  — the persistence + cross-tab plumbing.

---

## 1. The three components

### `<RetrievalPrompt>` — primary in-flow recall

Author-authored, always-rendered prompt asking the student to recall
something from the current reading.

```mdx
<RetrievalPrompt target="eq:stefan-boltzmann">
  <Prompt>
    A star doubles its radius at fixed temperature. How does its
    luminosity change?
  </Prompt>
  <Answer>
    Luminosity goes up by **4×**, since $L = 4\pi R^2 \sigma T^4$
    and $L \propto R^2$ at fixed $T$.
  </Answer>
</RetrievalPrompt>
```

- **`target` is a prefix-typed pedagogy-graph ref**: `eq:` (equation),
  `gl:` (glossary), `misc:` (misconception), `lo:` (learning
  objective), `ki:` (key insight), `topic:` (free-form pedagogy-graph
  topic). The MDX-AST extractor validates the prefix matches a real
  registry entry; an unresolved ref surfaces as a curriculum-CI
  finding.
- **`<Prompt>` and `<Answer>` are required slot children** (Sophie's
  compound-component pattern, ADR 0031). MDX body inside each.
- **Self-assess buttons render automatically** below the revealed
  `<Answer>`: `[Got it] [Partial] [Missed it]`. Non-blocking — the
  student can dismiss the prompt without self-assessing (per
  [ADR 0075](../website/decisions/0075-student-ux-cognitive-load-governance.md)).

### `<SpacedReview>` — queued review surface

Auto-selects past-attempted prompts due for review. Author writes
minimal markup; the component pulls from the `practice_attempt`
queue.

```mdx
{/* End of a Reading — review items related to one topic */}
<SpacedReview target="topic:logarithms" max={3} />

{/* End-of-Section practice surface — review across this Section */}
<SpacedReview section="m1-foundations" max={5} />

{/* Author override for empty state */}
<SpacedReview target="topic:logs" max={3}>
  <Empty>Practice ahead on logarithms?</Empty>
</SpacedReview>
```

- **Two mutually-exclusive selection scopes:** `target="prefix:slug"`
  OR `section="<slug>"`. Zod refine catches "both" / "neither" at
  parse time.
- **`max` prop** caps how many items render (default 3).
- **No `<Prompt>` / `<Answer>` slots** — author doesn't author prompts
  here; component resurfaces ones authored *elsewhere* via
  `<RetrievalPrompt>` / `<SkillReview>`.
- **Optional `<Empty>` slot** overrides the default empty-state
  message.
- **Wedge D fallback scheduler:** simple LRU — selects the `max`
  least-recently-attempted items from the `practice_attempt` queue
  whose `target_id` matches the scope filter. When Wedge D lands,
  the scheduler function swaps for the real FSRS algorithm; no UI
  change, no schema change.

### `<SkillReview>` — inline prereq bridge

Inline bridge at the point a prereq concept is invoked mid-reading.

```mdx
{/* Explicit form — works in Wedge B1 */}
<SkillReview target="topic:logarithms">
  <Prompt>Quick check: what is log10(1000)?</Prompt>
  <Answer>3 — because 10³ = 1000.</Answer>
</SkillReview>

{/* Self-closing form — auto-resolves from topic registry (Wedge C) */}
<SkillReview target="topic:logarithms" />
```

- **Same `target` prefix convention** as RetrievalPrompt + SpacedReview
  for author-API uniformity. Updates ADR 0068's previously-`topic`-only
  signature.
- **Slot children optional** (vs. required on RetrievalPrompt). When
  present (Wedge B1 path): explicit `<Prompt>` + `<Answer>` content.
  When absent (Wedge C path): auto-resolves from topic registry. B1
  fallback when children absent + registry absent: render a quiet
  placeholder "Topic refresher available once the Library room
  ships."
- **Optional `<ReviewMore>` slot** overrides the auto-generated
  "Refresher on logarithms →" link to Library.
- **BKT-adaptive prominence:** deferred to Wedge E. Wedge B1 ships
  page-type-default-only (Reading: collapsed; bridge-page: expanded).

---

## 2. Why three components, not one

`<SkillReview>` is structurally close to `<RetrievalPrompt>` —
shared self-assess UX, shared `practice_attempt` log, shared
underlying card primitive. Three reasons they stay distinct:

1. **Semantic clarity for authors.** Author signals intent by
   component choice ("recall current material" vs. "refresh a
   prereq" vs. "review queued items"). Easier than memorizing a
   `mode` prop.
2. **Different page-type defaults** (per ADR 0075's progressive-disclosure
   contract). RetrievalPrompt + SpacedReview default to inline /
   modest prominence; SkillReview is the "more often collapsed,
   appears at prereq-encounter sites" surface.
3. **Future divergence.** SkillReview gains BKT-adaptive prominence
   in Wedge E; RetrievalPrompt + SpacedReview do not. Splitting them
   now avoids a future schema split.

Implementation: all 3 compose a shared `<RetrievalCard>` internal
primitive (in `@sophie/components/internal/`, not a public export).
DRY without leaking abstraction.

---

## 3. The `practice_attempt` schema

New `state_type` extending `BaseRecordSchema`:

```typescript
// packages/core/src/schema/practice-attempt.ts
export const PracticeAttemptSchema = BaseRecordSchema.extend({
  state_type: z.literal("practice_attempt"),
  target_id: NonEmptyString,
  component: z.enum([
    "retrieval-prompt",
    "spaced-review",
    "skill-review",
  ]),
  response: z.string(),
  self_assessment: z.enum(["got", "partial", "missed"]).nullable(),
  time_to_first_reveal_ms: z.number().int().nonnegative().nullable(),
  attempt_seq: z.number().int().positive(),
});
export type PracticeAttempt = z.infer<typeof PracticeAttemptSchema>;
```

**Field rationale:**

- **`target_id`** — exact target string from MDX (e.g.,
  `"eq:stefan-boltzmann"`). Opaque to Wedge B; Wedge D's FSRS
  scheduler parses the prefix.
- **`component`** — which of the 3 emitted the attempt. SoTL-grade
  signal for "which surface drove the most recall on this target?"
  (per [ADR 0047](../website/decisions/0047-empirical-validation-plan.md)).
- **`self_assessment` nullable** — student dismissed without
  self-assessing. Wedge D treats `null` as "no signal" and uses
  default-interval logic.
- **`time_to_first_reveal_ms` nullable** — latency from
  prompt-render to "Reveal answer" click. Confidence/effort proxy
  for Wedge D.
- **`attempt_seq`** — per-`(user_id, target_id)` incrementing
  counter. Computed in the persistence hook by reading existing
  attempts on mount.
- **No `correct?` field** — `self_assessment` carries the signal
  explicitly; "correct?" was vague between auto-graded and
  self-reported.

---

## 4. The `useRetrievalAttempt` hook

Built on top of existing `useInteractive` (ADR 0007). Same IndexedDB
+ BroadcastChannel LWW machinery as `<Predict>` and
`<ConfidenceCheck>`. Wraps the cross-tab consistency, the LWW
timestamps per [ADR 0029](../website/decisions/0029-broadcast-channel-last-write-wins.md),
and the `attempt_seq` computation.

```typescript
// packages/components/src/components/retrieval/useRetrievalAttempt.ts
const { record, attemptSeq } = useRetrievalAttempt({
  target_id: "eq:stefan-boltzmann",
  component: "retrieval-prompt",
});

// record(response, self_assessment, latency_ms) → void
// attemptSeq: number — next attempt # (for optimistic UI display)
```

Each of the 3 components calls `useRetrievalAttempt` internally; their
public APIs (props, slots) differ but their persistence path is
identical.

---

## 5. Visual + structural design

Locked at brainstorm time:

- **Radix `<Collapsible>` primitive** (per [ADR 0019](../website/decisions/0019-radix-ui-a11y.md))
  for collapsed/expanded state. ARIA disclosure semantics by
  construction.
- **One shared `<RetrievalCard>` internal primitive** in
  `@sophie/components/internal/`; the 3 public components compose
  it. DRY without leaking the abstraction.
- **Left-edge color band** distinguishes the 3 component families:
  amber for `<RetrievalPrompt>` (current-content recall), cyan for
  `<SpacedReview>` (queued review), violet for `<SkillReview>`
  (prereq bridge). Same card geometry; only the band differs.
- **3 new theme tokens** (per [ADR 0005](../website/decisions/0005-theming-three-layers.md)):
  `--retrieval-band` / `--spaced-band` / `--skill-band`. CSS Modules
  consume them in the components.
- **a11y**: Radix Collapsible's built-in disclosure semantics;
  self-assess buttons are real `<button>` elements with `aria-pressed`;
  textarea has `aria-describedby` linking to the prompt; left-band
  color is decorative (no semantic dependency).

**Card layout (collapsed → expanded → post-reveal → post-self-assess):**

```
[Collapsed]   ▸ Retrieval — equation: Stefan-Boltzmann
                  ↓ click
[Expanded]    Prompt prose
              [textarea]
              [Reveal answer ▾]
                  ↓ click
[Reveal'd]    Prompt prose
              [textarea (student's response)]
              Answer prose
              [Got it] [Partial] [Missed it]
                  ↓ click (or dismiss)
[Logged]      practice_attempt record persisted; card stays expanded
              for re-reading; subsequent expansions show prior attempt.
```

**Polish iterated in Storybook** (not locked here): exact colors,
exact spacing, reveal animation, button hover state, focus rings.
All decided against rendered output with axe-core running, per
existing component workflow.

---

## 6. Pedagogy-index integration

Three new entry types follow the existing
[ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md)
extractor pattern (peers of `KeyEquationEntry`, `MisconceptionEntry`,
`PredictEntry`, etc.):

```typescript
// packages/core/src/schema/pedagogy-index-entries/
RetrievalPromptEntry: {
  slug, target_id, component_id, source_path, mdx_node_id,
}
SpacedReviewEntry: {
  slug, target_id?, section_id?, max, source_path, mdx_node_id,
}
SkillReviewEntry: {
  slug, target_id, has_explicit_content: boolean, source_path, mdx_node_id,
}
```

Three new curriculum-CI audit invariants (per [ADR 0045](../website/decisions/0045-pedagogical-diff-curriculum-ci.md)):

- **PRA-1** (Prereq Activation): every Unit's declared `prereqs[]`
  topic has ≥1 `<SkillReview target="topic:<prereq>">` surface in
  the Unit's reading or in a prior reading within the same Section.
- **RET-1** (Retrieval Coverage): every lecture-type Unit's
  `reading` artifact has ≥1 retrieval surface (RetrievalPrompt OR
  SpacedReview OR SkillReview) per ~500 words. Soft warning.
- **SR-1** (SpacedReview validity): `<SpacedReview target="prefix:slug">`
  references a real pedagogy-graph node;
  `<SpacedReview section="...">` references an existing Section
  slug.

These extend the `PedagogyIndex` typed structure and surface in
`sophie audit` output + the validation.md dashboard.

---

## 7. Testing discipline

Parity with existing components:

- **Vitest** unit tests for each component's state machine
  (collapsed/expanded, pre-reveal/post-reveal, attempt-recorded).
  File: `{RetrievalPrompt,SpacedReview,SkillReview}.test.tsx` using
  `@testing-library/react`. Plus separate test file for
  `useRetrievalAttempt`.
- **axe-core** (per [ADR 0004](../website/decisions/0004-component-contract-revisions.md))
  via a separate `.axe.test.tsx` file per component. Tests both
  collapsed and expanded states.
- **Storybook** ([ADR 0028](../website/decisions/0028-storybook-axe.md))
  stories per component: collapsed-default, expanded-default,
  post-reveal, post-self-assess, empty-queue (SpacedReview),
  placeholder (SkillReview self-closing without registry).
  Visual-regression baselines per the existing self-hosted test-runner
  (per [ADR 0057](../website/decisions/0057-visual-regression-self-hosted-storybook-test-runner.md)).
- **Pedagogy-index extractor tests** in
  `packages/astro/src/lib/pedagogy-index/extractors/`: verify each
  component's entries get extracted correctly from a representative
  MDX fixture.

---

## 8. Smoke usage

Add 1-2 usages of each component to existing smoke chapters to drive
Pagefind index entries + give visual-regression a real-content
rendering to baseline:

- `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx`:
  one `<RetrievalPrompt target="ki:luminosity">` mid-reading on the
  luminosity definition; one `<SkillReview target="topic:exponents">`
  inline where exponential notation is used.
- `examples/smoke/src/content/chapters/02-stars/spectra-and-composition.mdx`:
  one `<RetrievalPrompt target="eq:saha-equation">`; one
  `<SpacedReview target="topic:logarithms" max={3} />` at end of
  reading.

---

## 9. Doc updates (per `feedback_docs_no_drift`)

Land in the same PR:

- `docs/website/reference/chapter-components.md` — 3 new component
  sections with the locked signatures + examples + page-type-defaults
  table.
- `docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md`
  — 2-line signature edit: `<SkillReview topic="...">` →
  `<SkillReview target="topic:...">`; brief note explaining the
  prefix-convention unification across the retrieval family.
- `docs/website/status/course-website-roadmap.md` — same 2-line
  signature edit in the "New pedagogy components (Tier 1)" table;
  move `<RetrievalPrompt>` / `<SpacedReview>` / `<SkillReview>` rows
  from "Future capabilities — Tier A" listing to "shipped — Wedge
  B1" listing.

---

## 10. Critical files (current + future)

### Current Sophie files referenced

- `packages/core/src/schema/base-record.ts` — extended via
  `BaseRecordSchema.extend({...})`
- `packages/core/src/schema/primitives.ts` — `Slug` + `NonEmptyString`
- `packages/core/src/schema/pedagogy-index-entries/` — existing
  pedagogy-index entry pattern to mirror
- `packages/components/src/components/Predict/*` — closest existing
  analog (predict-then-reveal pattern; same `useInteractive`
  persistence path)
- `packages/components/src/components/CollapsibleCard/*` — visual
  precedent for the collapsed/expanded card pattern
- `packages/astro/src/lib/pedagogy-index/extractors/*` — extractor
  pattern to mirror for the 3 new entry types
- `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx`
  + `02-stars/spectra-and-composition.mdx` — smoke usage targets

### Future files (to author when Wedge B1 implements)

- `packages/core/src/schema/practice-attempt.ts` + `.test.ts`
- `packages/core/src/schema/pedagogy-index-entries/retrieval-prompt.ts`
  (+ `spaced-review.ts` + `skill-review.ts`) + `.test.ts` each
- `packages/components/src/components/RetrievalPrompt/{RetrievalPrompt.tsx, .test.tsx, .axe.test.tsx, .stories.tsx, RetrievalPrompt.module.css}`
- `packages/components/src/components/SpacedReview/*` (same fileset)
- `packages/components/src/components/SkillReview/*` (same fileset)
- `packages/components/src/components/internal/RetrievalCard/*` (shared primitive; no story)
- `packages/components/src/components/retrieval/useRetrievalAttempt.ts` + `.test.tsx`
- `packages/astro/src/lib/pedagogy-index/extractors/{retrieval-prompt,spaced-review,skill-review}.ts`
- `packages/astro/src/lib/pedagogy-audit/invariants/{pra-1-prereq-activation,ret-1-retrieval-coverage,sr-1-spaced-review-validity}.ts`
- 3 new theme tokens in `packages/theme/src/tokens.ts`

---

## 11. Out of scope (deferred)

- **Wedge B2** — `<WorkedExample>`, `<FadedPrompt>`, `<InterleavedSet>`
  (separate design + plan + PR).
- **Wedge D** — FSRS algorithm; `<SpacedReview>` scheduler upgrade.
- **Wedge E** — BKT mastery; `<SkillReview>` adaptive prominence.
- **Wedge C** — Library room; `<SkillReview>` self-closing
  topic-registry resolution.
- **Wedge G** — AI Authoring Packets; AI-drafted prompts for these
  components.
- **Cockpit (ADR 0076)** — reads `practice_attempt` records B1
  produces; surfaces in Today / Review Queue tabs.

---

## Validation

This design was scoped via `superpowers:brainstorming` on 2026-05-21
with the following explicit decisions:

1. Stub `practice_attempt` log queue (vs. waiting for Wedge D FSRS,
   vs. UI-only).
2. Self-assessment after reveal (got/partial/missed, non-blocking).
3. Split Wedge B into B1 (retrieval family) + B2 (worked-example family).
4. `target` prefix convention for the family; unify against
   ADR 0068's `topic` shape.
5. Slot children optional on `<SkillReview>` (vs. required); placeholder
   when Wedge C registry not yet shipped.
6. Single `<RetrievalCard>` internal primitive shared across the 3
   public components.
7. Reserved-card + Radix Collapsible visual structure; left-band
   color per family.
8. Pedagogy-index integration with 3 new entry types + 3 new
   curriculum-CI invariants.
9. Smoke usage in 2 chapters; doc updates in the same PR per
   `feedback_docs_no_drift`.

The implementation plan lands as a separate file
(`docs/plans/<date>-wedge-b1-retrieval-family.md`) once scoped.
