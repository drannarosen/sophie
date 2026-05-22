---
title: Component Contract
short_title: Component contract
description: The TypeScript interface every Sophie pedagogy component implements.
tags:
  - components
  - contract
  - reference
validation:
  status: in-progress
  last_validated_date: "2026-05-22"
  evidence:
    - kind: test
      ref: packages/components/src/components/Predict/Predict.contract.test.ts
      date: "2026-05-12"
      notes: "Component-contract conformance tests on Predict; mirrored across LearningObjectives, Aside, Callout, etc."
    - kind: manual
      ref: packages/core/src/schema/audit.ts
      date: "2026-05-22"
      notes: "AuditFindingSchema (severity / code / message / location) is the locked output shape for both deterministic and future AI-driven audit checks."
    - kind: manual
      ref: packages/core/src/schema/pedagogy-index.ts
      date: "2026-05-22"
      notes: "Canonical anchor prefix table (lines 36-53) is the component-identity policy — per-kind prefix + uniqueness invariants (M1, M2, F3, etc.) enforced by audit."
    - kind: review
      ref: docs/reviews/2026-05-22-wedge-b1-retrieval-family.md
      date: "2026-05-22"
      notes: "Wedge B1 retrieval family (RetrievalPrompt + SpacedReview + SkillReview) followed the contract end-to-end; A− (90/100) grade validates the abstraction."
status: shipped
---

# Component contract

The TypeScript interface every pedagogy component in Sophie implements.
Drives the renderer, the content audit, and the AI authoring kit
uniformly. One source of truth.

:::{seealso}
The shape revisions captured in this contract (`serialize` lifted out
of `modes`; accessibility-as-tests-not-data; `useInteractive`
runtime helper; composition rules) are recorded in
[ADR 0004](../decisions/0004-component-contract-revisions.md).
:::

This page covers:

1. What the contract is and why it exists
2. The contract itself (TypeScript)
3. Minimal viable component (smallest legal shape)
4. Three render modes + a serialize function
5. State vs. response, and the `useInteractive` runtime helper
6. Cross-component protocol (`refs` field + ADR 0060 registry refs)
7. Component identity policy (the canonical anchor prefix table)
8. Audit hooks (three tiers) + the deterministic-vs-AI boundary
9. Audit finding output schema
10. Source locations & patchability
11. The v1 component set
12. Worked example: `<Prediction>` end-to-end
13. Adding a new component (checklist)
14. Open design questions

## 1. Why a contract

Every pedagogy component (`<OMI>`, `<Prediction>`, `<UnitCheck>`,
`<FigureReading>`, ...) needs to satisfy three consumers
simultaneously:

- The **renderer** has to produce HTML in three modes (textbook page,
  slide deck, print handout) and decide whether the component is
  static or needs client hydration.
- The **content audit** has to verify the component's pedagogical
  contract is met (correct fields present, references resolve, no
  orphan IDs, AI-driven quality checks).
- The **AI authoring kit** has to introspect the component to scaffold
  new chapters, suggest fixes, and run quality checks against a
  structured representation.

The contract is the shape every component fills in so all three of
those things work without special-case logic. Adding a new component
means filling in the contract — no central renderer or audit code
changes required.

The contract lives in `@sophie/components/src/contract.ts`.

## 2. The contract (TypeScript)

```typescript
import { z, ZodSchema } from 'zod';
import type { ComponentType } from 'react';

export interface PedagogyComponent<Props, State = void, Response = void> {
  /** Unique identifier for this component kind ('prediction', 'omi', 'unit-check', ...) */
  kind: string;

  /** Zod schema validating component props at build time */
  schema: ZodSchema<Props>;

  /** HTML/JSX render. `read` is required; others optional with sensible defaults. */
  render: {
    read: ComponentType<Props>;            // textbook chapter (required)
    slide?: ComponentType<Props>;          // Reveal.js presenter
                                           //   default: read wrapped in slide layout
    print?: ComponentType<Props>;          // PDF / handout
                                           //   default: read with .print class
  };

  /**
   * Structured representation for the AI audit. Separate from `render`
   * because it produces an AuditNode, not HTML.
   * Default: serialize props directly as { kind, id, semantics: props }.
   */
  serialize?: (props: Props) => AuditNode;

  /** If interactive, declare what gets persisted and exported. */
  interactive?: {
    /** Ephemeral UI state (what's currently selected/typed/etc.) */
    state: ZodSchema<State>;
    /** Persistent record (what gets stored via ResponseStore / exported to Canvas) */
    response: ZodSchema<Response>;
    /** Default state when student first encounters the component */
    initialState: State;
  };

  /** Cross-component protocol — see section 5. */
  refs?: {
    consumes?: string[];   // kinds of components that may reference this one
    produces?: string[];   // kinds of components this one may reference
  };

  /** Composition rules — audit Tier 2 enforces. */
  composition?: {
    containedIn?: string[];        // kinds this component MAY appear inside
    forbidsContaining?: string[];  // kinds this component MUST NOT contain
  };

  /** What the audit verifies — see section 6. */
  audit?: {
    requiredFields?: string[];                          // tier-1 fields
    pedagogyChecks?: PedagogyCheck<Props>[];            // tier-2 contract checks
    aiPrompts?: Record<string, AIQualityCheckPrompt>;   // tier-3 quality checks
  };
}
```

A component is registered by calling `registerComponent(definition)`,
which validates the contract shape, registers the component with the
MDX renderer, and adds it to the audit's known-components list.

:::{important} Two notable design points
1. `audit` is no longer a render mode. It's a top-level `serialize`
   function that produces structured data — a different operation
   from producing HTML, even though both consume the same props.
2. `accessibility` declarations as data are **gone**. A component
   declaring `requiresLiveRegion: true` doesn't make it implement
   one; the truth lives in the rendered DOM, not in metadata. Every
   component ships axe-core tests in Storybook + Playwright; the
   audit calls `pnpm test:a11y` instead of introspecting
   declarations. See [ADR 0004](../decisions/0004-component-contract-revisions.md).
:::

(minimal-viable-component)=
## 3. Minimal viable component

The contract has many optional slots. Most components fill in only a
small subset. The smallest legal component:

```typescript
import { registerComponent } from '@sophie/components';
import { z } from 'zod';

const NotePropsSchema = z.object({
  children: z.any(),
});

export const Note = registerComponent({
  kind: 'note',
  schema: NotePropsSchema,
  render: { read: NoteComponent },
});
```

That's the floor: `kind` + `schema` + `render.read`. Everything else
on the contract — `serialize`, `interactive`, `refs`, `composition`,
`audit` — is opt-in. A static, non-interactive callout (`<Note>`,
`<Tip>`, `<Warning>`) needs nothing more.

Helper factories layered on top reduce the boilerplate further as
patterns earn their abstractions
(per [ADR 0061](../decisions/0061-ai-optimized-codebase-design.md)
Rule 4 — extract helpers at the second caller, not the first):

| Helper | Use when |
|---|---|
| `defineStaticComponent({...})` | No interactivity, no audit hooks beyond `requiredFields` |
| `defineInteractiveComponent({...})` | Has `state` + `response`; composes the `interactive` block |
| `defineCalloutComponent({...})` | Styled prose container with optional `variant` |
| `defineRegistryBackedComponent({...})` | Pulls its primary data from a registry (equations, glossary, etc.) per [ADR 0060](../decisions/0060-registry-ecosystem.md) |

The contract is sophisticated by design — it has to underwrite
render, audit, persistence, AI authoring, and export uniformly — but
**component authors should experience it as simple**. Full pedagogy
components like `<Prediction>` (§12) exercise every slot; the
[Wedge B1 retrieval family](../plans/2026-05-21-wedge-b1-retrieval-family-design.md)
landed three new full-shape components by composing one shared
`<RetrievalCard>` primitive — keeping per-component ceremony low even
at the most-sophisticated end of the contract.

(three-render-modes-plus-serialize)=
## 4. Three render modes + a serialize function

Components declare which `render` modes they support. The renderer
dispatches based on `import.meta.env.MODE` (set per build invocation,
same pattern as the dual-profile `PROFILE` variable; see
[Set up dual-profile](../how-to/set-up-dual-profile.md)).

### `read` — textbook chapter (required)

The default. What appears in the published chapter pages on the
public site. Static for non-interactive components; client-hydrated
React island for interactive ones.

### `slide` — Reveal.js presenter (optional, defaults to read)

The component as it appears when the chapter is rendered as a slide
deck. Different layout, often progressive reveal. Speaker notes
allowed. No persistence — predictions made on slides don't write to
the `ResponseStore` (the audience isn't a single student).

Components without a `slide` implementation render `read` wrapped in
the slide layout. Most components don't need their own.

### `print` — PDF / handout (optional, defaults to read)

What appears in printable handouts. No interactivity, no JavaScript,
no animations, no color-only information. Predictions render as
worksheet bubbles with blank lines for free response. Components
without a `print` implementation render `read` with a `.print` class
that strips animation/interaction via CSS.

:::{important} Static-fallback rule (interactive components)
Every interactive component **shall** define a meaningful
non-interactive representation. Acceptable shapes:

| Component | Print fallback |
|---|---|
| `<Prediction>` | Worksheet prompt with blank response space |
| `<RetrievalPrompt>` | Question text + space for written answer |
| `<SpacedReview>` | Static list of due review items (no scheduling UI) |
| `<PlotlyChart>` | Static image + alt text |
| `<PythonCell>` | Code block + expected output or table |
| `<ConceptMap>` | Static SVG or outline |

Components that genuinely have no meaningful print representation
**shall** declare `render.print` as a placeholder that emits
`<aside class="print-omit-note">Interactive content; see web edition.</aside>`
— never silently render the interactive variant in print. The audit
catches missing `print` implementations on the v1 interactive set;
the rule extends to every interactive component added going forward.
:::

### `serialize` — structured representation for AI (separate from render)

Not HTML; not a render mode. `serialize(props): AuditNode` produces a
structured `AuditNode` (JSON-like tree) that AI quality checks consume.
It strips presentation entirely and exposes pedagogical structure:
what the question is, what the choices are, what the declared answer
is, what skill is exercised.

This is what Claude reads when running tier-3 audit checks. It lets
the AI reason about *what the component means* rather than what it
*looks like*.

Default behavior when `serialize` isn't implemented: emit
`{ kind, id: props.id, semantics: props }`. Components override when
prop shape doesn't match audit needs (e.g., flatten nested prop
structures, or omit fields irrelevant to the audit).

```typescript
type AuditNode = {
  kind: string;                          // component kind
  id?: string;                           // if the component has an ID
  semantics: Record<string, unknown>;    // structured pedagogical content
  children?: AuditNode[];                // for nested components
};
```

## 5. State vs. response (interactive components)

Two distinct shapes for interactive components.

| Concept | Lifetime | Purpose | Storage |
|---|---|---|---|
| **State** | Ephemeral | What's in the UI right now (selected option, draft text, current confidence slider value) | React state, drafted into IndexedDB on changes via `ResponseStore.draft()` |
| **Response** | Persistent record | What the student committed when they hit Submit | IndexedDB via `ResponseStore`; exported to Canvas |

Why both:

- State changes constantly while the student is interacting; we don't
  want to write every keystroke to a permanent record.
- Response is the immutable artifact of student work. It gets
  exported, audited, used for calibration. It must not change after
  submit.

The `response` schema includes a `submittedAt` timestamp and a
`schemaVersion` field. Schema migrations are forward-only: if the
shape changes, old records are migrated on read; the original
recorded fields are preserved (we don't retroactively backfill).

(useinteractive-runtime-helper)=
### 4.1 The `useInteractive` runtime helper

Every interactive component would re-implement: read draft from store
on mount, write on change, freeze on submit, schema-migrate on read,
hydration safety (SSR/Astro islands), cross-tab sync. That's
boilerplate × every interactive component, with silent-data-corruption
risk if anyone gets it wrong.

`@sophie/components` ships a single hook that owns all of it:

```ts
import { useInteractive } from '@sophie/components/runtime';

const { state, setState, response, submit, isSubmitted, reset } = useInteractive({
  componentKind: 'prediction',
  questionId: props.id,
  chapterId,
  schema: PredictionResponseSchema,
  initialState,
  buildResponse: (state, meta) => ({
    ...state,
    submittedAt: meta.now,
    schemaVersion: 1,
    questionSnapshot: props.question,
  }),
});
```

Under the hood the hook:

- Reads the chapter context (provided by `@sophie/astro`).
- Subscribes to the `ResponseStore` for this `(componentKind, id)` pair.
- Persists draft state to IndexedDB on every `setState`.
- Freezes the response on `submit()` — subsequent state changes don't
  mutate the persisted record.
- Honors `BroadcastChannel` cross-tab updates.
- Migrates old records via the `response` schema's `schemaVersion`.

Components consume the hook; they never touch IndexedDB or the
`ResponseStore` interface directly. Authors of interactive components
write zero persistence code.

The corresponding `defineInteractive<S, R>()` helper composes the
`interactive: { state, response, initialState }` block of the
component contract from a single declarative call, in the same spirit
as Astro `defineCollection`.

## 6. Cross-component protocol (`refs` field + ADR 0060 registry refs)

Sophie has **two related-but-distinct reference systems**. Both
underwrite the pedagogy graph, but they apply to different kinds of
references and live in different layers of the contract:

| System | What it references | Lives on | Audited by |
|---|---|---|---|
| `refs.consumes` / `refs.produces` (this section) | Other components within a chapter by `id` (`<SolutionKey for="…">` ⇄ `<Prediction id="…">`; `<CalibrationCurve>` ⇄ all `<Prediction>` on the page) | The component contract (`PedagogyComponent.refs`) | Tier 2 AST walk |
| `refId` on registry-backed entries ([ADR 0060](../decisions/0060-registry-ecosystem.md)) | Registry entities in standalone content collections (`<KeyEquation refId="stefan-boltzmann">` resolves against `src/content/equations/stefan-boltzmann.mdx`) | Per-entry on the entry schema (`EquationCitationEntrySchema`, etc.) | R1 / R2 audit invariants |

New components pick whichever system fits the reference shape. The
`refs` field on the component contract handles **intra-chapter
component pairings**; ADR 0060's `refId` pattern handles
**cross-document references to registry entries** that live as
standalone MDX/YAML files. The two coexist; the audit catches drift
in both.

### `refs.consumes` / `refs.produces` (intra-chapter component pairings)

Some components reference others by ID. Examples:

- `<SolutionKey for="flux-distance-doubles">` consumes a
  `<Prediction id="flux-distance-doubles">`.
- `<CalibrationCurve>` consumes all `<Prediction>` responses on the
  page.
- `<MissionStep kind="prediction" predictionId="...">` references a
  Prediction.
- `<MisconceptionGuide for="flux-equals-luminosity">` consumes a
  `Misconception` declared in chapter frontmatter.

The contract makes these references first-class (under the `refs`
field) so the audit can verify the graph:

```typescript
// Prediction declares it can be consumed by others:
{
  kind: 'prediction',
  refs: { consumes: [], produces: [] },   // Prediction itself doesn't reference others
}

// SolutionKey declares it consumes Predictions:
{
  kind: 'solution-key',
  refs: { consumes: ['prediction'], produces: [] },
}

// CalibrationCurve aggregates Predictions:
{
  kind: 'calibration-curve',
  refs: { consumes: ['prediction'], produces: [] },
}
```

The audit walks the chapter AST, builds a graph of component
references by ID, and verifies:

- Every consumer's reference target exists.
- Every component declared as `produces` has at least one consumer
  somewhere (orphan warning, not error).
- Reference cycles are flagged.
- The student build doesn't reference instructor-only entities.

## 7. Component identity policy

Sophie's identity policy is **table-driven, not per-component**. The
canonical anchor prefix table at
[packages/core/src/schema/pedagogy-index.ts:36-53](../../packages/core/src/schema/pedagogy-index.ts#L36-L53)
assigns each pedagogy entry kind a stable prefix; uniqueness
invariants in the audit enforce the policy.

### The table (lives in code; this is a snapshot)

| Role | Prefix | Source |
|---|---|---|
| Definition | `def-` | author-supplied via title/id slug |
| Equation | `eq-` | author-supplied via id slug |
| Key insight | `ki-` | auto: `ki-${counter}` |
| Figure | `fig-` | auto: `fig-${slug(name)}-${counter}` |
| Misconception | `misc-` | auto: `misc-${counter}` (auto only) |
| Deep dive | `dd-` | id ▸ slug(title) ▸ auto: `dd-${counter}` |
| OMI flow | `omi-` | id ▸ `omi-${slug(concept)}` ▸ auto: `omi-${counter}` |
| Chapter | `ch-` | passthrough chapter slug |
| Objective | `lo-` | passthrough author id |
| Retrieval prompt | `rp-` | auto: `rp-${counter}` (Wedge B1) |
| Spaced review | `sp-` | auto: `sp-${counter}` (Wedge B1) |
| Skill review | `sk-` | auto: `sk-${counter}` (Wedge B1) |

Section + Unit entries (Wedge B-followup) key by `slug` / `id` rather
than by anchor — they're consumer-supplied content-collection entries
that flow into `PedagogyIndex.sections[]` / `units[]` wholesale; they
don't appear in the prefix table because they have no chapter-keyed
DOM anchors.

### Uniqueness invariants

The audit enforces three scopes of uniqueness:

- **Intra-chapter (M1, F2, etc.)** — every anchor unique within a
  chapter; collisions in extraction throw before the accumulator
  writes.
- **Cross-chapter for explicit-id-derived anchors (M2, D2, F3,
  cross-chapter-OMIFlow)** — author-supplied `id` props must be
  unique across the whole textbook. Auto-anchors (`misc-${N}`,
  `dd-${N}`, `omi-${N}`) are chapter-scoped and exempt.
- **Cross-chapter for slugs (CS1, definition-slug collisions)** —
  per-kind slug uniqueness across chapters.

### Why table-driven instead of per-component `identity` metadata

An earlier draft (preserved in `_archive/component-contract.md`)
proposed a per-component `identity?: { requiresId, scope, referenceable }`
metadata block. Sophie's table-driven shape carries the same semantics
with one source of truth — the prefix is the contract's
identity-shape declaration; the audit invariant codes (M1/M2/F3/etc.)
are the contract's enforcement. New components add a row to the
table + a sibling audit invariant; the contract stays per-kind
rather than per-component.

## 8. Audit hooks (three tiers)

:::{important} Deterministic vs. AI audit boundary (locked principle)

- **Deterministic checks** handle **structure**: shape, references,
  uniqueness, cadence, composition, contract conformance. Tier 1 +
  Tier 2. Fast (milliseconds to seconds). Run on every save / every
  PR. Every audit invariant Sophie has shipped to date is
  deterministic.
- **AI checks** handle **judgment**: clarity, correctness against
  domain knowledge, pedagogical quality, cognitive load, alignment
  with declared LOs. Tier 3. Expensive. Run on demand. Produce
  patchable findings, not prose review.

Authors writing new audit invariants should ask first: *is this rule
mechanical?* If the answer is a clean yes (counting, referencing,
shape-matching), it belongs in Tier 1/2. If it requires judgment
about meaning or pedagogy, it belongs in Tier 3.

This boundary keeps Sophie's audit story sound: deterministic checks
catch real defects without flaky AI calls; AI checks add advisory
judgment without replacing the deterministic layer. Sophie's
distinguishing claim — *one auditable pedagogy graph* — depends on
this separation staying clean.
:::

Each component declares what the audit can verify about it. The audit
runs three tiers, in increasing cost order.

### Tier 1: Deterministic structural checks

Run on every save. Fast (milliseconds). No AI calls.

```typescript
audit: {
  requiredFields: ['id', 'question'],   // present in props
}

// Audit verifies:
// - props match Zod schema
// - required fields are non-empty
// - ID is unique within chapter (for components with IDs)
// - referenced asset/concept/skill IDs resolve
```

These are unit-test-style assertions on the parsed AST.

### Tier 2: Pedagogy-contract checks

Run on PR. Deterministic but more expensive (walks the AST
structurally). No AI.

```typescript
audit: {
  pedagogyChecks: [
    {
      id: 'has-skill-declaration',
      message: 'Prediction should declare which skill it exercises',
      check: (props, chapter) => props.skill !== undefined,
      severity: 'warning',
    },
    {
      id: 'has-solution-key',
      message: 'Prediction with answer should have a paired SolutionKey',
      check: (props, chapter) =>
        !props.answer || chapter.findByKind('solution-key', { for: props.id }),
      severity: 'warning',
    },
  ],
}

// Audit-level checks (not per-component):
// - Prediction cadence: ≥1 per ~700 words, ≤1 per ~200 words
// - Predictions distributed (not clumped)
// - At least one free-response per chapter
// - Required components present per pedagogical contract
// - Composition rules (containedIn / forbidsContaining)
```

### Tier 3: AI-driven quality checks

Run on PR or on demand. The Sophie CLI does *not* make AI calls. It
**emits structured prompt files** that AI tools (Claude Code, Codex,
or any other) consume. See
[Audit and AI authoring](../explanation/audit-and-ai-authoring.md).

```typescript
audit: {
  aiPrompts: {
    questionClarity: {
      systemPrompt: `You are reviewing a student-facing prediction
        question for clarity. ...`,
      input: (props) => `Question: ${props.question}\n` +
                       (props.choices ? `Choices: ${props.choices.join(', ')}` : ''),
    },
    answerCorrectness: {
      systemPrompt: `Verify the declared answer is physically correct
        given the question. ...`,
      input: (props) => `Question: ${props.question}\n` +
                       `Answer: ${props.answer}`,
    },
  },
}
```

Each AI prompt template is stored alongside the component. When `sophie
audit` runs in Tier 3 mode, it emits prompts to `.sophie-tasks/`.
See [Audit and AI authoring](../explanation/audit-and-ai-authoring.md)
for the full architecture, slash commands, and skills.

## 9. Audit finding output schema

Every audit invariant — Tier 1, Tier 2, or eventual Tier 3 AI checks —
emits findings in one shared shape:
[`AuditFindingSchema`](../../packages/core/src/schema/audit.ts) in
`@sophie/core`. The shape is locked across deterministic and AI
paths so the report aggregates uniformly.

```typescript
// packages/core/src/schema/audit.ts (current shape; W1 lock)
export const AuditFindingSchema = z.object({
  severity: z.enum(["ERROR", "WARNING", "INFO"]),
  code: NonEmptyString,                     // stable invariant code (M1, V1, PRA-1, ...)
  message: NonEmptyString,                  // human-readable explanation
  location: z
    .object({
      chapter: z.string().optional(),       // chapter-keyed findings
      anchor: z.string().optional(),        // DOM anchor inside the chapter
      path: z.string().optional(),          // repo-root path for V0–V8 contract findings
    })
    .optional(),
});
```

Severity contract:

- `ERROR` fails the build (`auditExitCode` returns 1).
- `WARNING` prints but the build continues.
- `INFO` informational; never fails CI.

The `code` field carries the invariant identifier (`M1`, `M2`, `F3`,
`V1`–`V8`, `PRA-1`, `SR-1`, `RET-1`, `OF-2`, etc.); the full catalog
lives at
[packages/astro/src/lib/pedagogy-audit/invariants/](../../packages/astro/src/lib/pedagogy-audit/invariants/).
Adding a new invariant means:

1. Pick an unused short code (kind-prefixed where the codespace
   gets crowded: `MR1`–`MR6` for MultiRep, `MG1`–`MG4` for
   misconception-graph, etc.).
2. Write the deterministic check in
   `packages/astro/src/lib/pedagogy-audit/invariants/<group>.ts`.
3. Emit findings via `sink.errors.push({...})` /
   `sink.warnings.push({...})` / `sink.info.push({...})`.
4. Add a row to
   [audit-baseline.md](../../packages/astro/src/lib/pedagogy-audit/audit-baseline.md)
   with the smoke-fixture count delta.

### Future-friendly extensions (Tier 3 AI checks)

When AI-driven audit invariants land (see deferred follow-up in §14),
`AuditFindingSchema` extends with optional fields to carry AI-specific
metadata:

| Field | Purpose |
|---|---|
| `category` | `'clarity' \| 'correctness' \| 'pedagogy' \| 'accessibility' \| 'alignment' \| 'misconception' \| 'cognitive-load'` — partitions advisory findings for triage |
| `rationale` | Why the AI flagged it (separate from `message`'s student-facing concern) |
| `suggestedFix` | Patchable text the audit emits for AI patch workflows |
| `confidence` | 0–1 confidence score from the model |

These extensions are deliberately **deferred until a Tier 3 AI check
actually lands** so the schema stays minimal in the deterministic
era. Pre-launch, no consumers depend on them; adding them is a
single Zod extension when the Tier 3 wedge starts.

## 10. Source locations & patchability

Findings carry coarse-grained source locations today:
`{chapter, anchor, path}`. The chapter-keyed shape is sufficient for
build-error messages ("M1: misconception slug X collides between
chapter Y and chapter Z") because the chapter slug + anchor unambiguously
identifies the offending node.

**Future-direction (planned, not yet implemented):** for AI-patch
workflows, audit-driven CLI fix commands, and editor-integrated
red-squiggle UX, the location shape extends with file-level
positions:

```typescript
// Planned extension; not yet on AuditFindingSchema
location: {
  chapter?: string;
  anchor?: string;
  path?: string;
  // future:
  file?: string;         // repo-root path to the source MDX
  line?: number;
  column?: number;
  span?: [number, number];   // mdast position offsets
}
```

The blocker is in the extractors: `mdast` carries position information
on every node, but Sophie's extractors don't currently forward those
positions into the per-callsite entries. A future enhancement
threads `position.start.line` + `position.start.column` through
`extractMisconceptions`, `extractKeyInsights`, etc., into the entry
schemas, where the audit can lift them into findings.

This unblocks:

- **CLI patchability** — `sophie audit --fix` can rewrite the
  offending file at the exact line.
- **AI patch workflows** — Tier 3 AI checks emit `suggestedFix` with
  a `file:line` target the agent applies mechanically.
- **Editor integration** — language-server-style red squiggles on
  the line that's offending.

Until the extension lands, finding messages name the chapter + anchor
in their human text; agents resolve from there.

## 11. The v1 component set

Fifteen components in v1, organized into six tiers.

### Tier 1: Chapter framing — exactly one per chapter

| Component | Purpose | Required props |
|---|---|---|
| `<OMI>` | Astronomy framing: Observable → Model → Inference | observable, model, inference |
| `<PMI>` | Computational framing: Problem → Model → Implementation → Interpretation | problem, model, implementation, interpretation |

### Tier 2: Active commitment — interactive

| Component | Purpose |
|---|---|
| `<Prediction>` | Multiple-choice or free-response prediction with optional confidence |
| `<FigureReading>` | Active prompt around a figure: slope, axes, asymptotic behavior |

### Tier 3: Annotation — sense-making aids

| Component | Purpose |
|---|---|
| `<UnitCheck>` | Inline dimensional reasoning |
| `<Assumption>` | Explicit named assumption underlying a model |
| `<ModelLimit>` | Where this model breaks |

### Tier 4: Callouts — styled prose containers

| Component | Purpose | Notes |
|---|---|---|
| `<Example>` | Worked example | Optional `kind` (worked / anti-example / applied) |
| `<CheckYourself>` | Pause-and-reflect | May contain a `<Prediction>` or stand alone |
| `<MoreYouKnow>` | Optional enrichment | Defaults to collapsed |

### Tier 5: Profile-aware — instructor inline

| Component | Purpose | v1 behavior |
|---|---|---|
| `<SolutionKey for={id}>` | Worked solution paired with Prediction | Renders to `null` |
| `<InstructorNote>` | Inline teaching guidance | Renders to `null` |

### Tier 6: Asset references

| Component | Purpose |
|---|---|
| `<Figure>` | Image asset wrapper with required alt + caption |
| `<Demo>` | Cosmic Playground demo embed by ID |
| `<Video>` | YouTube embed (with optional `<VideoPrompt>` children for v3) |

### Plus: generic structural callouts

`<Note>`, `<Tip>`, `<Warning>`. Visual-only, no pedagogical contract.
Available for general use; not counted as pedagogy components.

(worked-example-prediction)=
## 12. Worked example: `<Prediction>` end-to-end

The most architecturally complex of the v1 components. Walking
through it stress-tests the contract.

### 8.1 Authoring (what an author writes)

```mdx
{/* Multiple-choice */}
<Prediction
  id="flux-distance-doubles"
  question="If the distance to a star doubles, what happens to the measured flux?"
  choices={[
    "Doubles",
    "Halves",
    "Decreases by a factor of 4",
    "Stays the same"
  ]}
  answer="Decreases by a factor of 4"
  skill="scaling-reasoning"
/>

{/* Paired with SolutionKey */}
<Prediction id="..." question="..." choices={[...]} answer="..." />
<SolutionKey for="...">
  Flux scales as 1/d², so distance doubling drops flux to 1/4.
  Common student misconception: treating flux as proportional to
  distance rather than inverse-square.
</SolutionKey>
```

### 8.2 Schema (colocated with component)

```typescript
// @sophie/components/src/Prediction/Prediction.schema.ts
export const PredictionPropsSchema = z.object({
  id: z.string()
    .regex(/^[a-z0-9-]+$/, 'must be kebab-case')
    .min(3),
  question: z.string().min(10),
  kind: z.enum(['multiple-choice', 'free-response']).optional(),
  choices: z.array(z.string().min(1)).min(2).optional(),
  answer: z.string().optional(),
  rubric: z.string().optional(),
  minWords: z.number().optional(),
  skill: z.string().optional(),
  concepts: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  enableConfidence: z.boolean().optional().default(false),
})
.refine(p => p.kind !== 'multiple-choice' ||
              (p.choices && p.choices.length >= 2),
  { message: 'multiple-choice predictions need ≥2 choices' })
.refine(p => !p.answer || (p.choices?.includes(p.answer) ?? false),
  { message: '`answer` must be one of `choices`' });
```

### 8.3 State and response

```typescript
interface PredictionState {
  selectedChoice: string | null;
  freeResponseDraft: string;
  confidence: number | null;     // 0-100; null until set
  isSubmitted: boolean;
}

interface PredictionResponse {
  questionId: string;
  chapterId: string;
  questionSnapshot: string;       // captured at submit; immune to chapter edits
  choice?: string;
  freeResponse?: string;
  confidence?: number;
  correct?: boolean;              // computed at submit, never retroactively
  submittedAt: string;            // ISO 8601
  timeToSubmit: number;           // seconds; for fatigue/skim detection
  schemaVersion: 1;
}
```

Storage:

- IndexedDB (per-course database, e.g. `sophie:astr201`) via the
  `ResponseStore` repository abstraction. Components consume
  `useInteractive`; they never touch IndexedDB directly.
- Indexed by `(componentKind, questionId)` for fast lookup; secondary
  index on `chapterId` for chapter-level export.
- Quota: hundreds of MB in practice. No size cap or eviction needed
  for the prediction-response volume.
- Forward-only schema migration via `schemaVersion` field on the
  record. `ResponseStore.migrate()` runs on first load of a new
  Sophie version.
- Cross-tab sync via `BroadcastChannel`.

### 8.4 Component tree (Astro + React islands)

```
Astro page (server-rendered HTML)
  ↓
MDX content (server-compiled)
  ↓
<Prediction client:load>     ← React hydration boundary
  ├─ PredictionRoot
  ├─ PredictionHeader (question text)
  ├─ PredictionInput (multiple-choice or free-response)
  ├─ ConfidenceSlider (if enableConfidence)
  ├─ PredictionSubmit
  └─ PredictionFeedback (after submit)
```

`client:load` hydrates the island on page load; `client:visible`
defers until scrolled into view (an optimization for chapters with
many predictions). The wrapper is provided by `@sophie/astro` —
authors write `<Prediction />` and the platform decides what to
hydrate.

### 8.5 Render modes

```typescript
export const Prediction = registerComponent({
  kind: 'prediction',
  schema: PredictionPropsSchema,
  render: {
    read: PredictionInteractive,    // full client island
    slide: PredictionSlide,         // commit-then-reveal in presenter
    print: PredictionPrint,         // worksheet-style, no interactivity
  },
  serialize: predictionToAuditNode, // structured representation for AI
  interactive: {
    state: PredictionStateSchema,
    response: PredictionResponseSchema,
    initialState: { selectedChoice: null, freeResponseDraft: '',
                    confidence: null, isSubmitted: false },
  },
  refs: { consumes: [], produces: [] },
  composition: {
    forbidsContaining: ['prediction'],   // no Prediction-in-Prediction
  },
  audit: {
    requiredFields: ['id', 'question'],
    pedagogyChecks: [
      hasMatchingSolutionKey,
      hasSkillDeclaration,
      cadenceOK,
      multipleChoiceCount,
    ],
    aiPrompts: {
      questionClarity: questionClarityPrompt,
      answerCorrectness: answerCorrectnessPrompt,
      choicesDistinctness: choicesDistinctnessPrompt,
    },
  },
});
// Accessibility is enforced via Storybook + Playwright + axe-core,
// not via metadata declarations. See Prediction.stories.tsx.
```

### 8.6 Profile pairing with `<SolutionKey>`

`<SolutionKey for="..." />` pairs by ID with `<Prediction>`. In v1
both render to `null` in the student build. In v2 the SolutionKey
appears immediately below the Prediction in the instructor build,
styled distinctly. See
[Set up dual-profile](../how-to/set-up-dual-profile.md).

The audit verifies:

- Every Prediction with `answer` has a paired SolutionKey by ID
  (warning, not error — sometimes the answer is enough).
- Every SolutionKey has a Prediction with the matching ID (error —
  orphan SolutionKey is a bug).
- No SolutionKey content appears in the student bundle (post-build
  grep).

### 8.7 Calibration extension (v3, designed in v1)

The confidence slider is in the schema and component tree from v1
but rendered only when `enableConfidence: true`.

- v1: authors can opt in per-Prediction; chapter-level default `false`.
- v3: chapter-level default flips to `true`; `<CalibrationCurve />`
  aggregator added.

Zero refactor at v3 — purely additive.

### 8.8 Audit checks

Tier 1 (every save):

- Schema validation: id, question, choices/answer consistency.
- Unique IDs within chapter.
- Skill / concept IDs resolve.

Tier 2 (PR):

- Every Prediction with `answer` has a SolutionKey by ID.
- Cadence: ≥1 per ~700 words, ≤1 per ~200 words.
- ≥1 free-response per chapter.
- No multiple-choice with >6 options.
- Predictions distributed, not clumped.

Tier 3 (PR or on demand, AI-driven):

- Question text unambiguous.
- Choices pedagogically distinct (no two test the same misconception).
- Declared `answer` matches the physics.
- Free-response rubric specific enough to grade against.
- Skill mapping is plausible.

### 8.9 Canvas export

Per-Prediction export format:

```text
Chapter: Flux, Luminosity, and Distance
Question (flux-distance-doubles):
  "If the distance to a star doubles, what happens to the measured flux?"

Your answer: Decreases by a factor of 4
Confidence: 70%
Submitted: 2026-05-09 14:23:11

[Correct]
```

Multiple format options: plain text (paste), HTML (rich paste), JSON
(Canvas API in v3). Per-chapter export bundles all responses.

### 8.10 Accessibility

WCAG 2.1 AA from day one. Enforced by axe-core in Storybook stories
and Playwright tests; the `audit` checks `pnpm test:a11y` rather than
introspecting declarative metadata. Truth lives in the rendered DOM.

What Prediction implements (verified per check, in test files):

- Keyboard: Tab + Enter/Space; choices are radio-group semantics.
- Screen reader: `<fieldset>` + `<legend>`; choices are
  `<label>`-wrapped radio inputs; live region announces feedback.
- Reduced motion: feedback animations honor `prefers-reduced-motion`.
- Color: no information by color alone; correct/incorrect uses icon
  and text label as well.
- Focus: visible focus ring (consumes design tokens).
- Touch targets: ≥44×44 px.

### 8.11 Theming

Components consume design tokens via CSS custom properties; never
hardcode values. CSS Modules scope styles per-component. See
[ADR 0005](../decisions/0005-theming-three-layers.md).

```tsx
// Prediction.module.css
.predictionRoot {
  background: var(--color-prediction-bg);
  border: 1px solid var(--color-prediction-border);
  border-radius: var(--radius-md);
}
```

CSS custom properties resolve to different values in light vs. dark
mode (set by `data-theme` on `<html>`). Per-component token namespacing
(`--color-prediction-*`) lets Predictions be re-themed without
affecting other components.

In `print` mode, all interactive styling is stripped: question as
plain text, choices as bulleted list with checkbox glyphs, no color
or shadow.

### 8.12 Edge cases and failure modes

- **Offline mid-chapter**: IndexedDB writes work offline; works.
  Submit-to-Canvas queues for next online window.
- **Two devices**: v1 doesn't sync; per-device data. v3 cross-device
  sync arrives via `SyncedResponseStore` (same interface). See
  [Persistence model](../explanation/persistence-model.md).
- **Question text changes after student submits**: `questionSnapshot`
  preserves what they saw. `correct` doesn't retroactively flip.
- **Chapter deleted**: housekeeping pass deletes responses with
  unresolved chapterId on next load.
- **Skim/click-through**: `timeToSubmit` is recorded; v3 calibration
  excludes <2 second submissions from accuracy curves.
- **Privacy**: confidence data is more sensitive than correctness.
  Default local-only; opt-in for cohort aggregation; opt-in for
  instructor view.

(adding-a-new-component-checklist)=
## 13. Adding a new component (checklist)

When adding a component to the platform:

**Required:**

- [ ] Pick a `kind` (lowercase, kebab-case, unique).
- [ ] Define a Zod schema for props (`Component.schema`) colocated at
      `<Name>.schema.ts`.
- [ ] Implement `render.read` (React component).
- [ ] Register via `registerComponent(...)`.
- [ ] Add Storybook stories for all render modes the component supports.
- [ ] Add axe-core tests in Storybook + Playwright. **Non-negotiable.**

**Required if interactive:**

- [ ] Define `state` and `response` Zod schemas.
- [ ] Define `initialState`.
- [ ] Use `useInteractive` for persistence — never touch IndexedDB directly.

**Required if it references other components by ID:**

- [ ] Declare `refs.consumes` (component kinds you reference).
- [ ] Use the platform's `findByKind` helper, not direct DOM queries.

**Required if it has nesting constraints:**

- [ ] Declare `composition.containedIn` and/or `composition.forbidsContaining`.

**Strongly recommended:**

- [ ] Implement `render.slide` (or accept a slide-card-wrapped read default).
- [ ] Implement `render.print` (or accept a `.print`-class-wrapped read default).
- [ ] Implement `serialize` (or accept the default props-as-AuditNode).
- [ ] Declare `audit.requiredFields`.
- [ ] Declare `audit.pedagogyChecks`.

**Optional:**

- [ ] Tier-3 AI prompt templates for quality checks.
- [ ] Component-specific theming tokens (consume `--color-<kind>-*` namespace).
- [ ] Per-chapter or per-course defaults via Chapter schema.

## 14. Open design questions

### 14.1 Composition rules — decided

Each component declares `composition.containedIn` (kinds it MAY appear
inside) and/or `composition.forbidsContaining` (kinds it MUST NOT
contain). Audit Tier 2 walks the AST and enforces both. The seed rules:

- `<Prediction>` inside `<CheckYourself>` callout — yes.
- `<Prediction>` inside another `<Prediction>` — no
  (`Prediction.composition.forbidsContaining: ['prediction']`).
- `<FigureReading>` inside `<OMI>` — no (OMI is a frame, not a
  container).
- `<UnitCheck>` inside `<Example>` — yes.
- `<SolutionKey>` inside `<Prediction>` — no (sibling pairing by ID,
  enforced by `<Prediction>` forbidding it and `<SolutionKey>` having
  empty `containedIn`).

Rules grow as authoring surfaces violations.

### 14.2 Cross-page references — partially resolved by ADR 0060

The original `refs.consumes` / `refs.produces` protocol assumed
references stay within a chapter.
[ADR 0060](../decisions/0060-registry-ecosystem.md) (Registry
Ecosystem) handles the cross-document case: registry-backed
entities (equations, glossary, misconceptions, key insights,
figures, deep dives, interventions, OMI flows) live as standalone
content collections, and per-callsite `refId` props resolve against
those collections via the R1/R2 audit invariants. See §6 for the
distinction between the two reference systems.

Still open for `<ConceptRef>`-style global references that aren't
registry-backed (e.g., a chapter referencing an LO declared in
another chapter): the graph-level audit that handles both intra-
and inter-chapter component references uniformly has not yet
landed.

### 14.3 The `serialize` contract — decided

`serialize(props): AuditNode` is a separate top-level function on the
component contract (not a render mode). Resolved questions:

- **Shape**: `AuditNode` is uniform across components: `{ kind, id?,
  semantics: Record<string, unknown>, children? }`. The `semantics`
  field's shape is component-specific.
- **AI consumption**: prompt files (see
  [Audit and AI authoring](../explanation/audit-and-ai-authoring.md))
  embed the serialized JSON in the prompt body. Structured response
  is parsed back into the audit report.
- **Prose context**: `serialize` returns structured data only.
  Sophie's prompt-emission layer adds chapter-level prose context
  separately when an AI check needs it.

### 14.4 Schema versioning at the component level — deferred to post-launch

Component schemas evolve. If `<Prediction>` adds a new field in v2:

- How do v1 chapters migrate? (They don't if the field is optional.)
- How do v1 stored responses migrate? (`schemaVersion` field; on-read
  migration.)
- How do we deprecate fields without breaking existing chapters?

**Pre-launch posture (per `feedback_no_backcompat_prelaunch`):**
hard-rename + migrate every author in the same PR. Component prop
schema versioning becomes relevant post-launch when courses
accumulate inertia across years. The platform already has
`BaseRecordSchema.schema_version` for stored records
([ADR 0007](../decisions/0007-persistence.md)) — that's the
versioning that matters when student data outlives schema changes.
A general component-prop-schema-evolution policy locks when courses
go live; not now.

### 14.5 Plugin / extension API for v3

When the platform opens to other instructors, third parties will want
to add custom pedagogy components. The contract is already designed
for this — they just call `registerComponent` — but the registration
mechanism needs:

- Conflict resolution (two plugins claim the same `kind`).
- Theme namespace coordination.
- Audit-rule validation (third-party components shouldn't crash the
  audit).

See [Plugin API reference](plugin-api.md) for the v1 surface.

### 14.6 Tier 3 AI check spec shape — deferred until first AI check lands

The current contract has `audit.aiPrompts: Record<string, AIQualityCheckPrompt>`
— bare prompt templates. When the first Tier 3 AI invariant ships,
this evolves into a structured `aiChecks: AIQualityCheck<Props>[]`
shape:

```typescript
type AIQualityCheck<Props> = {
  id: string;
  purpose: string;
  inputs: InputSelector[];
  rubric: string[];
  outputSchema: ZodSchema<AIQualityFinding>;
  severityDefault: 'INFO' | 'WARNING' | 'ERROR';
}
```

Locking the structured shape now, before any AI check has shipped,
would over-specify. Locking it the moment the first AI invariant
lands keeps Sophie's discipline intact: deterministic checks for
structure (Tier 1/2), AI for judgment (Tier 3), each with structured
output schemas the audit report aggregates uniformly.

See also §9 — `AuditFindingSchema` gains optional `category` /
`rationale` / `suggestedFix` / `confidence` fields at the same time
to carry AI-specific metadata.

### 14.7 Source locations on `AuditFinding` — planned extension

The future-direction described in §10. Extractors gain
`mdast`-position forwarding into entries; `AuditFinding.location`
extends with `file` / `line` / `column` / `span`. Unblocks
`sophie audit --fix`, AI patch workflows, and editor red-squiggle
integration. Scoped as an enhancement file, not a wedge of its own.

### 14.8 Profile visibility on the contract — currently handled outside

Right now profile-aware rendering (`<SolutionKey>` rendering to
`null` in the student build; `<InstructorNote>` similarly) is
handled by per-component logic + the `ProfileContext` runtime helper,
not by a declarative `visibility: { student, instructor, print }`
field on the contract. The current pattern works at the v1 component
set's scale.

If a third-party plugin author (§14.5) needs to declare
profile-aware visibility without writing per-component conditional
render code, the contract grows a `visibility` field at that point.
Until then, the runtime pattern is sufficient.

### 14.9 Security model for executable embeds — deferred until Pyodide lands

The component set today is safe: every component renders authored
content. When the roadmap's Pyodide-driven `<PythonCell>` /
`<PlotlyChart>` / `<ComputeOutput>` cluster lands at Tier 2, the
contract gains a `security?: { allowsExternalEmbed?, sandboxRequired?,
executesCode?, persistenceScope? }` field documenting the
component's threat surface. Deferred until that wedge starts.

## What this contract gives us

- **Renderer uniformity**: same dispatch logic for every component
  across read/slide/print/serialize.
- **Audit uniformity**: every check is declared by the component it
  applies to. Adding a component doesn't require central audit code
  changes.
- **AI authoring**: Claude/Codex can introspect any component via the
  contract — knows what props it takes, what it produces in serialize
  output, what its quality criteria are.
- **Migration safety**: schema versioning at multiple levels (props,
  state, response, components) means content authored today survives
  changes years out.
- **Extensibility**: third-party components in v3 just fill in the
  contract.

The contract is the load-bearing abstraction for Sophie.
